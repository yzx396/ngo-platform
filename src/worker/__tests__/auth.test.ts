import { describe, it, expect } from 'vitest';
import { createToken, verifyToken, extractTokenFromHeader } from '../auth/jwt';
import { createAuthPayload } from '../auth/google';
import type { AuthPayload, User } from '../../types/user';

// ============================================================================
// JWT Token Tests
// ============================================================================

describe('JWT Authentication', () => {
  const jwtSecret = 'test-secret-key-12345';
  const testPayload: AuthPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  describe('createToken', () => {
    it('should create a valid JWT token', async () => {
      const token = await createToken(testPayload, jwtSecret);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts separated by dots
    });

    it('should include payload data in token', async () => {
      const token = await createToken(testPayload, jwtSecret);
      const verified = await verifyToken(token, jwtSecret);

      expect(verified.userId).toBe(testPayload.userId);
      expect(verified.email).toBe(testPayload.email);
      expect(verified.name).toBe(testPayload.name);
    });

    it('should set expiration time', async () => {
      const token = await createToken(testPayload, jwtSecret, 24); // 24 hours
      const verified = await verifyToken(token, jwtSecret);

      expect(verified.exp).toBeDefined();
      expect(typeof verified.exp).toBe('number');
      // Verify token was created with proper expiration
      expect(verified.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should use default 7-day expiration', async () => {
      const token = await createToken(testPayload, jwtSecret); // Default 168 hours = 7 days
      const verified = await verifyToken(token, jwtSecret);
      const now = Math.floor(Date.now() / 1000);

      // 7 days in seconds: 7 * 24 * 60 * 60 = 604800
      // Allow 5 second margin for test execution
      expect(verified.exp).toBeGreaterThan(now + 604795);
      expect(verified.exp).toBeLessThan(now + 604805);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const token = await createToken(testPayload, jwtSecret);
      const verified = await verifyToken(token, jwtSecret);

      // Check that essential payload fields are present and correct
      expect(verified.userId).toBe(testPayload.userId);
      expect(verified.email).toBe(testPayload.email);
      expect(verified.name).toBe(testPayload.name);
      // JWT also includes exp and iat claims
      expect(verified.exp).toBeDefined();
      expect(verified.iat).toBeDefined();
    });

    it('should throw error for invalid token', async () => {
      const invalidToken = 'invalid.token.here';

      await expect(verifyToken(invalidToken, jwtSecret)).rejects.toThrow(
        'Invalid or expired token'
      );
    });

    it('should throw error for tampered token', async () => {
      const token = await createToken(testPayload, jwtSecret);
      const parts = token.split('.');
      parts[1] = Buffer.from(JSON.stringify({ userId: 'hacker' })).toString('base64url');
      const tamperedToken = parts.join('.');

      await expect(verifyToken(tamperedToken, jwtSecret)).rejects.toThrow(
        'Invalid or expired token'
      );
    });

    it('should throw error for token signed with different secret', async () => {
      const token = await createToken(testPayload, jwtSecret);
      const wrongSecret = 'different-secret-key';

      await expect(verifyToken(token, wrongSecret)).rejects.toThrow(
        'Invalid or expired token'
      );
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
      const header = `Bearer ${token}`;

      const extracted = extractTokenFromHeader(header);
      expect(extracted).toBe(token);
    });

    it('should return null for missing header', () => {
      const extracted = extractTokenFromHeader(undefined);
      expect(extracted).toBeNull();
    });

    it('should return null for empty header', () => {
      const extracted = extractTokenFromHeader('');
      expect(extracted).toBeNull();
    });

    it('should return null for header without Bearer prefix', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
      const extracted = extractTokenFromHeader(token);
      expect(extracted).toBeNull();
    });

    it('should return null for malformed Bearer header', () => {
      const extracted = extractTokenFromHeader('Bearer token extra');
      expect(extracted).toBeNull();
    });
  });
});

// ============================================================================
// Auth Payload Tests
// ============================================================================

describe('Auth Payload', () => {
  describe('createAuthPayload', () => {
    it('should create payload from user', () => {
      const user: User = {
        id: 'user-456',
        email: 'user@example.com',
        name: 'John Doe',
        created_at: 1000,
        updated_at: 2000,
      };

      const payload = createAuthPayload(user);

      expect(payload.userId).toBe(user.id);
      expect(payload.email).toBe(user.email);
      expect(payload.name).toBe(user.name);
    });

    it('should not include sensitive fields in payload', () => {
      const user: User = {
        id: 'user-456',
        email: 'user@example.com',
        name: 'Jane Doe',
        google_id: 'google-123',
        created_at: 1000,
        updated_at: 2000,
      };

      const payload = createAuthPayload(user);

      // Payload should only have userId, email, name
      expect(Object.keys(payload).sort()).toEqual(['email', 'name', 'userId']);
      expect(payload).not.toHaveProperty('google_id');
      expect(payload).not.toHaveProperty('created_at');
      expect(payload).not.toHaveProperty('updated_at');
    });
  });
});

// ============================================================================
// Token Expiration Tests
// ============================================================================

describe('Token Expiration', () => {
  const jwtSecret = 'expiration-test-secret';
  const testPayload: AuthPayload = {
    userId: 'user-exp-test',
    email: 'exptest@example.com',
    name: 'Expiration Test User',
  };

  it('should create token with correct expiration timestamp', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await createToken(testPayload, jwtSecret, 1); // 1 hour
    const verified = await verifyToken(token, jwtSecret);

    // Token should expire in approximately 1 hour (3600 seconds)
    const expirationSeconds = verified.exp! - now;
    expect(expirationSeconds).toBeGreaterThan(3595); // 5 second margin
    expect(expirationSeconds).toBeLessThan(3605);
  });

  it('should include issued at timestamp', async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await createToken(testPayload, jwtSecret);
    const after = Math.floor(Date.now() / 1000);
    const verified = await verifyToken(token, jwtSecret);

    // iat should be between before and after
    expect(verified.iat).toBeGreaterThanOrEqual(before);
    expect(verified.iat).toBeLessThanOrEqual(after + 1);
  });
});

// ============================================================================
// OAuth Payload Tests
// ============================================================================

describe('OAuth User Profile Tests', () => {
  it('should handle user with google_id', () => {
    const user: User = {
      id: 'user-oauth-123',
      email: 'oauth@example.com',
      name: 'OAuth User',
      google_id: 'google-user-id-12345',
      created_at: 1000,
      updated_at: 2000,
    };

    const payload = createAuthPayload(user);

    expect(payload.userId).toBe(user.id);
    expect(payload.email).toBe(user.email);
    expect(payload.name).toBe(user.name);
    // google_id should not be in payload
    expect(payload).not.toHaveProperty('google_id');
  });

  it('should handle user without google_id (backwards compatibility)', () => {
    const user: User = {
      id: 'user-legacy-123',
      email: 'legacy@example.com',
      name: 'Legacy User',
      created_at: 1000,
      updated_at: 2000,
    };

    const payload = createAuthPayload(user);

    expect(payload.userId).toBe(user.id);
    expect(payload.email).toBe(user.email);
    expect(payload.name).toBe(user.name);
  });
});
