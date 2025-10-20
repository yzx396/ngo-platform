import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findOrCreateUserFromGoogle } from '../auth/google';
import type { User } from '../../types/user';

// ============================================================================
// Mock D1 Database
// ============================================================================

interface MockD1PreparedStatement {
  bind: (...values: unknown[]) => MockD1PreparedStatement;
  first: <T = unknown>() => Promise<T | null>;
  run: () => Promise<{ success: boolean }>;
}

interface MockD1Database {
  prepare: (query: string) => MockD1PreparedStatement;
}

function createMockDb(): MockD1Database {
  const mockStatement: MockD1PreparedStatement = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(null),
    run: vi.fn().mockResolvedValue({ success: true }),
  };

  return {
    prepare: vi.fn().mockReturnValue(mockStatement),
  };
}

// ============================================================================
// Google OAuth Profile Validation Tests
// ============================================================================

describe('findOrCreateUserFromGoogle', () => {
  let mockDb: MockD1Database;

  beforeEach(() => {
    mockDb = createMockDb();
  });

  describe('Input Validation', () => {
    it('should throw error when Google ID (sub) is missing', async () => {
      const invalidProfile = {
        sub: undefined as unknown as string, // Simulate missing sub
        email: 'user@example.com',
        name: 'Test User',
      };

      await expect(
        findOrCreateUserFromGoogle(invalidProfile, mockDb as unknown as D1Database)
      ).rejects.toThrow('Google profile missing required field: sub');
    });

    it('should throw error when email is missing', async () => {
      const invalidProfile = {
        sub: 'google-123',
        email: undefined as unknown as string, // Simulate missing email
        name: 'Test User',
      };

      await expect(
        findOrCreateUserFromGoogle(invalidProfile, mockDb as unknown as D1Database)
      ).rejects.toThrow('Google profile missing required field: email');
    });

    it('should throw error when both sub and email are missing', async () => {
      const invalidProfile = {
        sub: undefined as unknown as string,
        email: undefined as unknown as string,
        name: 'Test User',
      };

      await expect(
        findOrCreateUserFromGoogle(invalidProfile, mockDb as unknown as D1Database)
      ).rejects.toThrow('Google profile missing required field');
    });
  });

  describe('User Creation', () => {
    it('should create new user with valid Google profile', async () => {
      const googleProfile = {
        sub: 'google-user-123',
        email: 'newuser@example.com',
        name: 'New User',
        picture: 'https://example.com/photo.jpg',
        email_verified: true,
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null), // No existing user
        run: vi.fn().mockResolvedValue({ success: true }),
      };

      const mockDb = {
        prepare: vi.fn().mockReturnValue(mockStatement),
      };

      const user = await findOrCreateUserFromGoogle(
        googleProfile,
        mockDb as unknown as D1Database
      );

      // Verify user was created
      expect(user.email).toBe(googleProfile.email);
      expect(user.name).toBe(googleProfile.name);
      expect(user.google_id).toBe(googleProfile.sub);
      expect(user.id).toBeTruthy();
      expect(user.created_at).toBeTruthy();
      expect(user.updated_at).toBeTruthy();

      // Verify INSERT query was called
      const insertCall = mockDb.prepare.mock.calls.find((call) =>
        call[0].includes('INSERT INTO users')
      );
      expect(insertCall).toBeTruthy();
    });

    it('should fallback to email username when name is missing', async () => {
      const googleProfile = {
        sub: 'google-user-456',
        email: 'testuser@example.com',
        name: undefined as unknown as string, // Missing name
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
        run: vi.fn().mockResolvedValue({ success: true }),
      };

      const mockDb = {
        prepare: vi.fn().mockReturnValue(mockStatement),
      };

      const user = await findOrCreateUserFromGoogle(
        googleProfile,
        mockDb as unknown as D1Database
      );

      // Name should be derived from email (before @)
      expect(user.name).toBe('testuser');
      expect(user.email).toBe(googleProfile.email);
    });
  });

  describe('User Lookup', () => {
    it('should return existing user when google_id matches', async () => {
      const googleProfile = {
        sub: 'google-existing-123',
        email: 'existing@example.com',
        name: 'Existing User',
      };

      const existingUser: User = {
        id: 'user-abc-123',
        email: 'existing@example.com',
        name: 'Existing User',
        google_id: 'google-existing-123',
        created_at: 1000,
        updated_at: 2000,
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(existingUser),
        run: vi.fn(),
      };

      const mockDb = {
        prepare: vi.fn().mockReturnValue(mockStatement),
      };

      const user = await findOrCreateUserFromGoogle(
        googleProfile,
        mockDb as unknown as D1Database
      );

      // Should return the existing user
      expect(user).toEqual(existingUser);
      expect(user.id).toBe('user-abc-123');

      // Should NOT call INSERT (user already exists)
      const insertCall = mockDb.prepare.mock.calls.find((call) =>
        call[0].includes('INSERT INTO users')
      );
      expect(insertCall).toBeUndefined();
    });

    it('should link google_id to existing email account', async () => {
      const googleProfile = {
        sub: 'google-new-456',
        email: 'existing@example.com',
        name: 'Existing User',
      };

      const existingUserWithoutGoogleId: User = {
        id: 'user-legacy-789',
        email: 'existing@example.com',
        name: 'Existing User',
        google_id: null, // No Google ID yet
        created_at: 1000,
        updated_at: 2000,
      };

      let callCount = 0;
      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockImplementation(async () => {
          callCount++;
          // First call: google_id lookup returns null
          // Second call: email lookup returns existing user
          return callCount === 1 ? null : existingUserWithoutGoogleId;
        }),
        run: vi.fn().mockResolvedValue({ success: true }),
      };

      const mockDb = {
        prepare: vi.fn().mockReturnValue(mockStatement),
      };

      const user = await findOrCreateUserFromGoogle(
        googleProfile,
        mockDb as unknown as D1Database
      );

      // Should link Google ID to existing user
      expect(user.id).toBe('user-legacy-789');
      expect(user.google_id).toBe('google-new-456');
      expect(user.email).toBe('existing@example.com');

      // Should call UPDATE to add google_id
      const updateCall = mockDb.prepare.mock.calls.find((call) =>
        call[0].includes('UPDATE users SET google_id')
      );
      expect(updateCall).toBeTruthy();
    });
  });

  describe('Database Parameter Handling', () => {
    it('should not pass undefined values to D1 bind()', async () => {
      const googleProfile = {
        sub: 'google-123',
        email: 'user@example.com',
        name: 'Test User',
        picture: undefined, // Optional field
        email_verified: undefined, // Optional field
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
        run: vi.fn().mockResolvedValue({ success: true }),
      };

      const mockDb = {
        prepare: vi.fn().mockReturnValue(mockStatement),
      };

      await findOrCreateUserFromGoogle(
        googleProfile,
        mockDb as unknown as D1Database
      );

      // Verify bind() was called and check arguments don't include undefined
      const bindCalls = mockStatement.bind.mock.calls;
      expect(bindCalls.length).toBeGreaterThan(0);

      // Check that no bind() call contains undefined
      bindCalls.forEach((call) => {
        call.forEach((arg) => {
          expect(arg).not.toBe(undefined);
        });
      });
    });

    it('should handle all required fields being present', async () => {
      const validProfile = {
        sub: 'google-valid-789',
        email: 'valid@example.com',
        name: 'Valid User',
      };

      const mockStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
        run: vi.fn().mockResolvedValue({ success: true }),
      };

      const mockDb = {
        prepare: vi.fn().mockReturnValue(mockStatement),
      };

      const user = await findOrCreateUserFromGoogle(
        validProfile,
        mockDb as unknown as D1Database
      );

      expect(user).toBeTruthy();
      expect(user.google_id).toBe('google-valid-789');
      expect(user.email).toBe('valid@example.com');
      expect(user.name).toBe('Valid User');
    });
  });

  describe('Error Message Improvements', () => {
    it('should provide detailed error message when required fields are missing', async () => {
      const invalidProfile = {
        sub: undefined as unknown as string,
        email: undefined as unknown as string,
        name: 'Test User',
      };

      await expect(
        findOrCreateUserFromGoogle(invalidProfile, mockDb as unknown as D1Database)
      ).rejects.toThrow('Google profile missing required field');
    });
  });
});
