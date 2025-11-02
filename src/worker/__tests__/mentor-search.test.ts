/**
 * Tests for Mentor Search API endpoint
 * Following TDD: Write tests FIRST, then implement the API
 *
 * Endpoint under test:
 * - GET /api/v1/mentors/search - Search and filter mentor profiles (PROTECTED API - requires authentication)
 *
 * Key features to test:
 * - PROTECTED API: Authentication required
 * - Bit flag filtering (mentoring_levels, payment_types)
 * - Hourly rate range filtering
 * - Nickname search (partial match)
 * - Pagination (limit, offset)
 * - Combining multiple filters
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import app from '../index';
import { MentoringLevel, PaymentType } from '../../types/mentor';
import { createToken } from '../auth/jwt';
import type { AuthPayload } from '../../types/user';

interface Env {
  platform_db: D1Database;
  JWT_SECRET: string;
}

const JWT_SECRET = 'test-jwt-secret';

/**
 * Create a JWT token for testing
 */
async function createTestToken(userId: string, email: string, name: string): Promise<string> {
  const payload: AuthPayload = { userId, email, name };
  return createToken(payload, JWT_SECRET);
}

// ============================================================================
// Mock D1 Database
// ============================================================================

const createMockDb = () => {
  const mockUsers = new Map<string, Record<string, unknown>>();
  const mockProfiles = new Map<string, Record<string, unknown>>();

  return {
    prepare: vi.fn((query: string) => ({
      bind: vi.fn((...params: unknown[]) => ({
        all: vi.fn(async () => {
          // Handle INSERT for users
          if (query.includes('INSERT INTO users')) {
            return { results: [] };
          }

          // Handle INSERT for mentor_profiles
          if (query.includes('INSERT INTO mentor_profiles')) {
            return { results: [] };
          }

          // Handle SELECT for search
          if (query.includes('SELECT') && query.includes('mentor_profiles')) {
            let results = Array.from(mockProfiles.values());

            // Apply bit flag filters
            if (query.includes('mentoring_levels &')) {
              const levelFilter = params.find((p, i) => query.split('?')[i]?.includes('mentoring_levels &'));
              if (levelFilter !== undefined) {
                results = results.filter(p => (p.mentoring_levels & levelFilter) > 0);
              }
            }

            if (query.includes('payment_types &')) {
              const paymentFilter = params.find((p, i) => query.split('?')[i]?.includes('payment_types &'));
              if (paymentFilter !== undefined) {
                results = results.filter(p => (p.payment_types & paymentFilter) > 0);
              }
            }

            // Apply hourly rate filters
            if (query.includes('hourly_rate <=')) {
              const maxRate = params.find((p, i) => query.split('?')[i]?.includes('hourly_rate <='));
              if (maxRate !== undefined) {
                results = results.filter(p => p.hourly_rate !== null && p.hourly_rate <= maxRate);
              }
            }

            if (query.includes('hourly_rate >=')) {
              const minRate = params.find((p, i) => query.split('?')[i]?.includes('hourly_rate >='));
              if (minRate !== undefined) {
                results = results.filter(p => p.hourly_rate !== null && p.hourly_rate >= minRate);
              }
            }

            // Apply nickname filter (LIKE search)
            if (query.includes('nick_name LIKE')) {
              const nicknamePattern = params.find((p, i) => query.split('?')[i]?.includes('nick_name LIKE'));
              if (nicknamePattern) {
                const searchTerm = nicknamePattern.replace(/%/g, '').toLowerCase();
                results = results.filter(p => p.nick_name.toLowerCase().includes(searchTerm));
              }
            }

            // Apply pagination (LIMIT and OFFSET)
            if (query.includes('LIMIT') && query.includes('OFFSET')) {
              const limit = params[params.length - 2];
              const offset = params[params.length - 1];
              results = results.slice(offset, offset + limit);
            } else if (query.includes('LIMIT')) {
              const limit = params[params.length - 1];
              results = results.slice(0, limit);
            }

            return { results };
          }

          // Handle COUNT queries
          if (query.includes('COUNT(*)')) {
            let results = Array.from(mockProfiles.values());
            let paramIndex = 0;

            // Apply same filters as SELECT - extract params in order
            if (query.includes('mentoring_levels &')) {
              const levelFilter = params[paramIndex++];
              results = results.filter(p => (p.mentoring_levels & levelFilter) > 0);
            }

            if (query.includes('payment_types &')) {
              const paymentFilter = params[paramIndex++];
              results = results.filter(p => (p.payment_types & paymentFilter) > 0);
            }

            if (query.includes('hourly_rate <=')) {
              const maxRate = params[paramIndex++];
              results = results.filter(p => p.hourly_rate !== null && p.hourly_rate <= maxRate);
            }

            if (query.includes('hourly_rate >=')) {
              const minRate = params[paramIndex++];
              results = results.filter(p => p.hourly_rate !== null && p.hourly_rate >= minRate);
            }

            if (query.includes('nick_name LIKE')) {
              const nicknamePattern = params[paramIndex++];
              const searchTerm = nicknamePattern.replace(/%/g, '').toLowerCase();
              results = results.filter(p => p.nick_name.toLowerCase().includes(searchTerm));
            }

            return { results: [{ 'COUNT(*)': results.length }] };
          }

          return { results: [] };
        }),
        first: vi.fn(async () => {
          if (query.includes('SELECT') && query.includes('users') && query.includes('WHERE id = ?')) {
            const userId = params[0];
            return mockUsers.get(userId) || null;
          }
          if (query.includes('COUNT(*)')) {
            // Duplicate the filtering logic from all() to compute count
            let results = Array.from(mockProfiles.values());
            let paramIndex = 0;

            // Apply same filters as SELECT - extract params in order
            if (query.includes('mentoring_levels &')) {
              const levelFilter = params[paramIndex++];
              results = results.filter(p => (p.mentoring_levels & levelFilter) > 0);
            }

            if (query.includes('payment_types &')) {
              const paymentFilter = params[paramIndex++];
              results = results.filter(p => (p.payment_types & paymentFilter) > 0);
            }

            if (query.includes('hourly_rate <=')) {
              const maxRate = params[paramIndex++];
              results = results.filter(p => p.hourly_rate !== null && p.hourly_rate <= maxRate);
            }

            if (query.includes('hourly_rate >=')) {
              const minRate = params[paramIndex++];
              results = results.filter(p => p.hourly_rate !== null && p.hourly_rate >= minRate);
            }

            if (query.includes('nick_name LIKE')) {
              const nicknamePattern = params[paramIndex++];
              const searchTerm = nicknamePattern.replace(/%/g, '').toLowerCase();
              results = results.filter(p => p.nick_name.toLowerCase().includes(searchTerm));
            }

            return { 'COUNT(*)': results.length };
          }
          return null;
        }),
        run: vi.fn(async () => {
          if (query.includes('INSERT INTO users')) {
            const [id, email, name, created_at, updated_at] = params;
            mockUsers.set(id, { id, email, name, created_at, updated_at });
            return { success: true, meta: { changes: 1 } };
          }
          if (query.includes('INSERT INTO mentor_profiles')) {
            const [id, user_id, nick_name, bio, mentoring_levels, availability, hourly_rate, payment_types, allow_reviews, allow_recording, created_at, updated_at] = params;
            const profile = {
              id, user_id, nick_name, bio, mentoring_levels, availability, hourly_rate, payment_types,
              allow_reviews, allow_recording, created_at, updated_at
            };
            mockProfiles.set(id, profile);
            return { success: true, meta: { changes: 1 } };
          }
          return { success: true, meta: { changes: 0 } };
        }),
      })),
    })),
    _mockUsers: mockUsers,
    _mockProfiles: mockProfiles,
  };
};

// ============================================================================
// Helper Functions for Tests
// ============================================================================

async function createTestUser(mockEnv: Env, email: string, name: string) {
  const req = new Request('http://localhost/api/v1/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  });
  const res = await app.fetch(req, mockEnv);
  return await res.json();
}

async function createTestMentorProfile(mockEnv: Env, profileData: Record<string, unknown>) {
  const token = await createTestToken(profileData.user_id as string, 'test@example.com', 'Test User');
  const req = new Request('http://localhost/api/v1/mentors/profiles', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });
  const res = await app.fetch(req, mockEnv);
  return await res.json();
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Mentor Search API', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let mockEnv: Env;

  beforeEach(async () => {
    mockDb = createMockDb();
    mockEnv = {
      platform_db: mockDb as unknown,
      JWT_SECRET: 'test-jwt-secret',
    } as Env;
  });

  // ==========================================================================
  // Authentication Requirement (PROTECTED API)
  // ==========================================================================

  describe('GET /api/v1/mentors/search - Authentication requirement', () => {
    it('should return 401 when no authentication headers provided', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Unauthorized');
    });

    it('should return 401 when invalid authentication token provided', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token',
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(401);
    });
  });

  // ==========================================================================
  // Protected API Access (Authentication Required)
  // ==========================================================================

  describe('GET /api/v1/mentors/search - Protected API access', () => {
    it('should be accessible with valid authentication headers', async () => {
      // Create test user and mentor
      const mentorUser = await createTestUser(mockEnv, 'mentor@example.com', 'Test Mentor');

      await createTestMentorProfile(mockEnv, {
        user_id: mentorUser.id,
        nick_name: 'PublicMentor',
        bio: 'Publicly accessible mentor',
        mentoring_levels: MentoringLevel.Entry,
        payment_types: PaymentType.Venmo,
      });

      // Create another user to search mentors
      const searcherUser = await createTestUser(mockEnv, 'searcher@example.com', 'Searcher User');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(1);
      expect(data.mentors[0].nick_name).toBe('PublicMentor');
    });

    it('should work with filters when authenticated', async () => {
      // Create test mentors
      const user1 = await createTestUser(mockEnv, 'mentor1@example.com', 'Mentor One');
      const user2 = await createTestUser(mockEnv, 'mentor2@example.com', 'Mentor Two');

      await createTestMentorProfile(mockEnv, {
        user_id: user1.id,
        nick_name: 'EntryMentor',
        bio: 'Entry level',
        mentoring_levels: MentoringLevel.Entry,
        payment_types: PaymentType.Venmo,
        hourly_rate: 50,
      });

      await createTestMentorProfile(mockEnv, {
        user_id: user2.id,
        nick_name: 'SeniorMentor',
        bio: 'Senior level',
        mentoring_levels: MentoringLevel.Senior,
        payment_types: PaymentType.Paypal,
        hourly_rate: 100,
      });

      // Create searcher user and token
      const searcherUser = await createTestUser(mockEnv, 'searcher@example.com', 'Searcher User');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      // Test multiple filters with authentication
      const req = new Request('http://localhost/api/v1/mentors/search?mentoring_levels=1&hourly_rate_max=75', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(1);
      expect(data.mentors[0].nick_name).toBe('EntryMentor');
    });
  });

  // ==========================================================================
  // Basic Search (No Filters)
  // ==========================================================================

  describe('GET /api/v1/mentors/search - Basic search (PROTECTED API)', () => {
    it('should return all mentor profiles when no filters provided (requires authentication)', async () => {
      // Create test mentors
      const user1 = await createTestUser(mockEnv, 'mentor1@example.com', 'Mentor One');
      const user2 = await createTestUser(mockEnv, 'mentor2@example.com', 'Mentor Two');

      await createTestMentorProfile(mockEnv, {
        user_id: user1.id,
        nick_name: 'MentorOne',
        bio: 'First mentor',
        mentoring_levels: MentoringLevel.Entry,
        payment_types: PaymentType.Venmo,
      });

      await createTestMentorProfile(mockEnv, {
        user_id: user2.id,
        nick_name: 'MentorTwo',
        bio: 'Second mentor',
        mentoring_levels: MentoringLevel.Senior,
        payment_types: PaymentType.Paypal,
      });

      // Create searcher user and token
      const searcherUser = await createTestUser(mockEnv, 'searcher@example.com', 'Searcher User');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('mentors');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('limit');
      expect(data).toHaveProperty('offset');
      expect(data.mentors).toHaveLength(2);
      expect(data.total).toBe(2);
      expect(data.limit).toBe(20); // default
      expect(data.offset).toBe(0); // default
    });

    it('should return empty array when no mentors exist (requires authentication)', async () => {
      // Create a test user with auth token
      const searcherUser = await createTestUser(mockEnv, 'searcher@example.com', 'Searcher User');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toEqual([]);
      expect(data.total).toBe(0);
    });
  });

  // ==========================================================================
  // Bit Flag Filtering - Mentoring Levels
  // ==========================================================================

  describe('Bit flag filtering - mentoring_levels', () => {
    beforeEach(async () => {
      const user1 = await createTestUser(mockEnv, 'mentor1@example.com', 'Mentor One');
      const user2 = await createTestUser(mockEnv, 'mentor2@example.com', 'Mentor Two');
      const user3 = await createTestUser(mockEnv, 'mentor3@example.com', 'Mentor Three');

      // Mentor 1: Entry only
      await createTestMentorProfile(mockEnv, {
        user_id: user1.id,
        nick_name: 'EntryMentor',
        bio: 'Entry level',
        mentoring_levels: MentoringLevel.Entry,
        payment_types: PaymentType.Venmo,
      });

      // Mentor 2: Entry + Senior
      await createTestMentorProfile(mockEnv, {
        user_id: user2.id,
        nick_name: 'EntrySeniorMentor',
        bio: 'Entry and Senior',
        mentoring_levels: MentoringLevel.Entry | MentoringLevel.Senior,
        payment_types: PaymentType.Paypal,
      });

      // Mentor 3: Staff + Management
      await createTestMentorProfile(mockEnv, {
        user_id: user3.id,
        nick_name: 'StaffManagementMentor',
        bio: 'Staff and Management',
        mentoring_levels: MentoringLevel.Staff | MentoringLevel.Management,
        payment_types: PaymentType.Zelle,
      });
    });

    it('should filter mentors with Entry level (requires authentication)', async () => {
      const searcherUser = await createTestUser(mockEnv, 'searcher@example.com', 'Searcher User');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search?mentoring_levels=1', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(2); // EntryMentor and EntrySeniorMentor
      expect(data.total).toBe(2);
      expect(data.mentors.every((m: Record<string, unknown>) => ((m.mentoring_levels as number) & MentoringLevel.Entry) > 0)).toBe(true);
    });

    it('should filter mentors with Senior level (requires authentication)', async () => {
      const searcherUser = await createTestUser(mockEnv, 'searcher@example.com', 'Searcher User');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search?mentoring_levels=2', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(1); // Only EntrySeniorMentor
      expect(data.mentors[0].nick_name).toBe('EntrySeniorMentor');
    });

    it('should filter mentors with Entry OR Senior (bit flag: 3) (requires authentication)', async () => {
      const searcherUser = await createTestUser(mockEnv, 'searcher@example.com', 'Searcher User');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const levels = MentoringLevel.Entry | MentoringLevel.Senior; // 3

      const req = new Request(`http://localhost/api/v1/mentors/search?mentoring_levels=${levels}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(2); // EntryMentor and EntrySeniorMentor
      expect(data.total).toBe(2);
    });

    it('should filter mentors with Staff level (requires authentication)', async () => {
      const searcherUser = await createTestUser(mockEnv, `searcher-${Date.now()}@example.com`, 'Searcher');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search?mentoring_levels=4', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(1); // Only StaffManagementMentor
    });

    it('should return mentors that match ANY level in the filter (bitwise AND) (requires authentication)', async () => {
      // Search for all levels combined (15 = Entry|Senior|Staff|Management)
      // This should return all mentors since they all have at least one of these levels
      const searcherUser = await createTestUser(mockEnv, `searcher-${Date.now()}@example.com`, 'Searcher');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search?mentoring_levels=15', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(3); // All three mentors match
      expect(data.total).toBe(3);
    });
  });

  // ==========================================================================
  // Bit Flag Filtering - Payment Types
  // ==========================================================================

  describe('Bit flag filtering - payment_types', () => {
    beforeEach(async () => {
      const user1 = await createTestUser(mockEnv, 'mentor1@example.com', 'Mentor One');
      const user2 = await createTestUser(mockEnv, 'mentor2@example.com', 'Mentor Two');

      await createTestMentorProfile(mockEnv, {
        user_id: user1.id,
        nick_name: 'VenmoMentor',
        bio: 'Accepts Venmo',
        mentoring_levels: MentoringLevel.Entry,
        payment_types: PaymentType.Venmo,
      });

      await createTestMentorProfile(mockEnv, {
        user_id: user2.id,
        nick_name: 'VenmoPaypalMentor',
        bio: 'Accepts Venmo and Paypal',
        mentoring_levels: MentoringLevel.Entry,
        payment_types: PaymentType.Venmo | PaymentType.Paypal,
      });
    });

    it('should filter mentors accepting Venmo (requires authentication)', async () => {
      const searcherUser = await createTestUser(mockEnv, `searcher-${Date.now()}@example.com`, 'Searcher');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search?payment_types=1', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(2); // Both accept Venmo
      expect(data.total).toBe(2);
    });

    it('should filter mentors accepting Paypal (requires authentication)', async () => {
      const searcherUser = await createTestUser(mockEnv, `searcher-${Date.now()}@example.com`, 'Searcher');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search?payment_types=2', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(1); // Only VenmoPaypalMentor
      expect(data.mentors[0].nick_name).toBe('VenmoPaypalMentor');
    });

    it('should filter mentors accepting Crypto (requires authentication)', async () => {
      const searcherUser = await createTestUser(mockEnv, `searcher-${Date.now()}@example.com`, 'Searcher');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search?payment_types=32', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(0); // No mentors accept Crypto
      expect(data.total).toBe(0);
    });
  });

  // ==========================================================================
  // Hourly Rate Filtering
  // ==========================================================================

  describe('Hourly rate filtering', () => {
    beforeEach(async () => {
      const user1 = await createTestUser(mockEnv, 'mentor1@example.com', 'Mentor One');
      const user2 = await createTestUser(mockEnv, 'mentor2@example.com', 'Mentor Two');
      const user3 = await createTestUser(mockEnv, 'mentor3@example.com', 'Mentor Three');

      await createTestMentorProfile(mockEnv, {
        user_id: user1.id,
        nick_name: 'CheapMentor',
        bio: 'Affordable',
        mentoring_levels: MentoringLevel.Entry,
        payment_types: PaymentType.Venmo,
        hourly_rate: 25,
      });

      await createTestMentorProfile(mockEnv, {
        user_id: user2.id,
        nick_name: 'MidMentor',
        bio: 'Mid-priced',
        mentoring_levels: MentoringLevel.Entry,
        payment_types: PaymentType.Venmo,
        hourly_rate: 75,
      });

      await createTestMentorProfile(mockEnv, {
        user_id: user3.id,
        nick_name: 'ExpensiveMentor',
        bio: 'Premium',
        mentoring_levels: MentoringLevel.Entry,
        payment_types: PaymentType.Venmo,
        hourly_rate: 200,
      });
    });

    it('should filter mentors with hourly_rate_max (requires authentication)', async () => {
      const searcherUser = await createTestUser(mockEnv, `searcher-${Date.now()}@example.com`, 'Searcher');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search?hourly_rate_max=100', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(2); // CheapMentor and MidMentor
      expect(data.total).toBe(2);
      expect(data.mentors.every((m: Record<string, unknown>) => (m.hourly_rate as number) <= 100)).toBe(true);
    });

    it('should filter mentors with hourly_rate_min (requires authentication)', async () => {
      const searcherUser = await createTestUser(mockEnv, `searcher-${Date.now()}@example.com`, 'Searcher');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search?hourly_rate_min=50', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(2); // MidMentor and ExpensiveMentor
      expect(data.total).toBe(2);
      expect(data.mentors.every((m: Record<string, unknown>) => (m.hourly_rate as number) >= 50)).toBe(true);
    });

    it('should filter mentors with both hourly_rate_min and hourly_rate_max (requires authentication)', async () => {
      const searcherUser = await createTestUser(mockEnv, `searcher-${Date.now()}@example.com`, 'Searcher');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search?hourly_rate_min=50&hourly_rate_max=100', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(1); // Only MidMentor
      expect(data.mentors[0].hourly_rate).toBe(75);
    });
  });

  // ==========================================================================
  // Nickname Search (Partial Match)
  // ==========================================================================

  describe('Nickname search', () => {
    beforeEach(async () => {
      const user1 = await createTestUser(mockEnv, 'mentor1@example.com', 'Mentor One');
      const user2 = await createTestUser(mockEnv, 'mentor2@example.com', 'Mentor Two');
      const user3 = await createTestUser(mockEnv, 'mentor3@example.com', 'Mentor Three');

      await createTestMentorProfile(mockEnv, {
        user_id: user1.id,
        nick_name: 'CodeMaster',
        bio: 'Master of code',
        mentoring_levels: MentoringLevel.Entry,
        payment_types: PaymentType.Venmo,
      });

      await createTestMentorProfile(mockEnv, {
        user_id: user2.id,
        nick_name: 'DataGuru',
        bio: 'Data expert',
        mentoring_levels: MentoringLevel.Entry,
        payment_types: PaymentType.Venmo,
      });

      await createTestMentorProfile(mockEnv, {
        user_id: user3.id,
        nick_name: 'CodeNinja',
        bio: 'Ninja coder',
        mentoring_levels: MentoringLevel.Entry,
        payment_types: PaymentType.Venmo,
      });
    });

    it('should search mentors by nickname (partial match) (requires authentication)', async () => {
      const searcherUser = await createTestUser(mockEnv, `searcher-${Date.now()}@example.com`, 'Searcher');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search?nick_name=Code', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(2); // CodeMaster and CodeNinja
      expect(data.total).toBe(2);
      expect(data.mentors.every((m: Record<string, unknown>) => (m.nick_name as string).includes('Code'))).toBe(true);
    });

    it('should be case-insensitive for nickname search (requires authentication)', async () => {
      const searcherUser = await createTestUser(mockEnv, `searcher-${Date.now()}@example.com`, 'Searcher');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search?nick_name=code', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(2); // CodeMaster and CodeNinja
    });

    it('should return empty when nickname does not match (requires authentication)', async () => {
      const searcherUser = await createTestUser(mockEnv, `searcher-${Date.now()}@example.com`, 'Searcher');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search?nick_name=Python', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(0);
      expect(data.total).toBe(0);
    });
  });

  // ==========================================================================
  // Pagination
  // ==========================================================================

  describe('Pagination', () => {
    beforeEach(async () => {
      // Create 25 mentors
      for (let i = 1; i <= 25; i++) {
        const user = await createTestUser(mockEnv, `mentor${i}@example.com`, `Mentor ${i}`);
        await createTestMentorProfile(mockEnv, {
          user_id: user.id,
          nick_name: `Mentor${i}`,
          bio: `Bio for mentor ${i}`,
          mentoring_levels: MentoringLevel.Entry,
          payment_types: PaymentType.Venmo,
        });
      }
    });

    it('should use default pagination (limit: 20, offset: 0) (requires authentication)', async () => {
      const searcherUser = await createTestUser(mockEnv, `searcher-${Date.now()}@example.com`, 'Searcher');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(20); // First 20
      expect(data.total).toBe(25);
      expect(data.limit).toBe(20);
      expect(data.offset).toBe(0);
    });

    it('should respect custom limit (requires authentication)', async () => {
      const searcherUser = await createTestUser(mockEnv, `searcher-${Date.now()}@example.com`, 'Searcher');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search?limit=10', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(10);
      expect(data.total).toBe(25);
      expect(data.limit).toBe(10);
    });

    it('should respect offset for pagination (requires authentication)', async () => {
      const searcherUser = await createTestUser(mockEnv, `searcher-${Date.now()}@example.com`, 'Searcher');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search?limit=10&offset=20', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(5); // Remaining 5
      expect(data.total).toBe(25);
      expect(data.limit).toBe(10);
      expect(data.offset).toBe(20);
    });

    it('should handle offset beyond total results (requires authentication)', async () => {
      const searcherUser = await createTestUser(mockEnv, `searcher-${Date.now()}@example.com`, 'Searcher');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search?limit=10&offset=100', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(0);
      expect(data.total).toBe(25);
    });
  });

  // ==========================================================================
  // Combined Filters
  // ==========================================================================

  describe('Combined filters', () => {
    beforeEach(async () => {
      const user1 = await createTestUser(mockEnv, 'mentor1@example.com', 'Mentor One');
      const user2 = await createTestUser(mockEnv, 'mentor2@example.com', 'Mentor Two');
      const user3 = await createTestUser(mockEnv, 'mentor3@example.com', 'Mentor Three');

      await createTestMentorProfile(mockEnv, {
        user_id: user1.id,
        nick_name: 'CodeMaster',
        bio: 'Senior code mentor',
        mentoring_levels: MentoringLevel.Senior,
        payment_types: PaymentType.Venmo,
        hourly_rate: 50,
      });

      await createTestMentorProfile(mockEnv, {
        user_id: user2.id,
        nick_name: 'CodeGuru',
        bio: 'Entry code mentor',
        mentoring_levels: MentoringLevel.Entry,
        payment_types: PaymentType.Paypal,
        hourly_rate: 75,
      });

      await createTestMentorProfile(mockEnv, {
        user_id: user3.id,
        nick_name: 'DataMaster',
        bio: 'Senior data mentor',
        mentoring_levels: MentoringLevel.Senior,
        payment_types: PaymentType.Venmo,
        hourly_rate: 100,
      });
    });

    it('should combine mentoring_levels and payment_types filters (requires authentication)', async () => {
      const searcherUser = await createTestUser(mockEnv, `searcher-${Date.now()}@example.com`, 'Searcher');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search?mentoring_levels=2&payment_types=1', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(2); // CodeMaster and DataMaster
      expect(data.total).toBe(2);
    });

    it('should combine all filters (levels, payment, rate, nickname) (requires authentication)', async () => {
      const searcherUser = await createTestUser(mockEnv, `searcher-${Date.now()}@example.com`, 'Searcher');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search?mentoring_levels=2&payment_types=1&hourly_rate_max=80&nick_name=Code', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(1); // Only CodeMaster
      expect(data.mentors[0].nick_name).toBe('CodeMaster');
    });

    it('should return empty when combined filters match nothing (requires authentication)', async () => {
      const searcherUser = await createTestUser(mockEnv, `searcher-${Date.now()}@example.com`, 'Searcher');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search?mentoring_levels=4&payment_types=32&hourly_rate_max=10', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(0);
      expect(data.total).toBe(0);
    });
  });

  // ==========================================================================
  // Edge Cases and Validation
  // ==========================================================================

  describe('Edge cases', () => {
    it('should handle invalid limit (negative) (requires authentication)', async () => {
      const searcherUser = await createTestUser(mockEnv, `searcher-${Date.now()}@example.com`, 'Searcher');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search?limit=-10', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });

    it('should handle invalid offset (negative) (requires authentication)', async () => {
      const searcherUser = await createTestUser(mockEnv, `searcher-${Date.now()}@example.com`, 'Searcher');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search?offset=-10', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });

    it('should handle limit exceeding maximum (e.g., 100) (requires authentication)', async () => {
      const searcherUser = await createTestUser(mockEnv, `searcher-${Date.now()}@example.com`, 'Searcher');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search?limit=200', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.toLowerCase()).toContain('limit');
    });

    it('should handle non-numeric query parameters gracefully (requires authentication)', async () => {
      const searcherUser = await createTestUser(mockEnv, `searcher-${Date.now()}@example.com`, 'Searcher');
      const searcherToken = await createTestToken(searcherUser.id as string, searcherUser.email as string, searcherUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/search?mentoring_levels=abc', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${searcherToken}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });
});
