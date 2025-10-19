/**
 * Tests for Mentor Search API endpoint
 * Following TDD: Write tests FIRST, then implement the API
 *
 * Endpoint under test:
 * - GET /api/v1/mentors/search - Search and filter mentor profiles
 *
 * Key features to test:
 * - Bit flag filtering (mentoring_levels, payment_types)
 * - Hourly rate range filtering
 * - Nickname search (partial match)
 * - Pagination (limit, offset)
 * - Combining multiple filters
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import app from '../index';
import { MentoringLevel, PaymentType } from '../../types/mentor';

// ============================================================================
// Mock D1 Database
// ============================================================================

const createMockDb = () => {
  const mockUsers = new Map<string, any>();
  const mockProfiles = new Map<string, any>();

  return {
    prepare: vi.fn((query: string) => ({
      bind: vi.fn((...params: any[]) => ({
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

            // Get total count before pagination
            const total = results.length;

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

async function createTestMentorProfile(mockEnv: Env, profileData: any) {
  const req = new Request('http://localhost/api/v1/mentors/profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
      platform_db: mockDb as any,
    } as Env;
  });

  // ==========================================================================
  // Basic Search (No Filters)
  // ==========================================================================

  describe('GET /api/v1/mentors/search - Basic search', () => {
    it('should return all mentor profiles when no filters provided', async () => {
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

      const req = new Request('http://localhost/api/v1/mentors/search', {
        method: 'GET',
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

    it('should return empty array when no mentors exist', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search', {
        method: 'GET',
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

    it('should filter mentors with Entry level', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search?mentoring_levels=1', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(2); // EntryMentor and EntrySeniorMentor
      expect(data.total).toBe(2);
      expect(data.mentors.every((m: any) => (m.mentoring_levels & MentoringLevel.Entry) > 0)).toBe(true);
    });

    it('should filter mentors with Senior level', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search?mentoring_levels=2', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(1); // Only EntrySeniorMentor
      expect(data.mentors[0].nick_name).toBe('EntrySeniorMentor');
    });

    it('should filter mentors with Entry OR Senior (bit flag: 3)', async () => {
      const levels = MentoringLevel.Entry | MentoringLevel.Senior; // 3

      const req = new Request(`http://localhost/api/v1/mentors/search?mentoring_levels=${levels}`, {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(2); // EntryMentor and EntrySeniorMentor
      expect(data.total).toBe(2);
    });

    it('should filter mentors with Staff level', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search?mentoring_levels=4', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(1); // Only StaffManagementMentor
    });

    it('should return mentors that match ANY level in the filter (bitwise AND)', async () => {
      // Search for all levels combined (15 = Entry|Senior|Staff|Management)
      // This should return all mentors since they all have at least one of these levels
      const req = new Request('http://localhost/api/v1/mentors/search?mentoring_levels=15', {
        method: 'GET',
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

    it('should filter mentors accepting Venmo', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search?payment_types=1', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(2); // Both accept Venmo
      expect(data.total).toBe(2);
    });

    it('should filter mentors accepting Paypal', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search?payment_types=2', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(1); // Only VenmoPaypalMentor
      expect(data.mentors[0].nick_name).toBe('VenmoPaypalMentor');
    });

    it('should filter mentors accepting Crypto', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search?payment_types=32', {
        method: 'GET',
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

    it('should filter mentors with hourly_rate_max', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search?hourly_rate_max=100', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(2); // CheapMentor and MidMentor
      expect(data.total).toBe(2);
      expect(data.mentors.every((m: any) => m.hourly_rate <= 100)).toBe(true);
    });

    it('should filter mentors with hourly_rate_min', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search?hourly_rate_min=50', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(2); // MidMentor and ExpensiveMentor
      expect(data.total).toBe(2);
      expect(data.mentors.every((m: any) => m.hourly_rate >= 50)).toBe(true);
    });

    it('should filter mentors with both hourly_rate_min and hourly_rate_max', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search?hourly_rate_min=50&hourly_rate_max=100', {
        method: 'GET',
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

    it('should search mentors by nickname (partial match)', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search?nick_name=Code', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(2); // CodeMaster and CodeNinja
      expect(data.total).toBe(2);
      expect(data.mentors.every((m: any) => m.nick_name.includes('Code'))).toBe(true);
    });

    it('should be case-insensitive for nickname search', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search?nick_name=code', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(2); // CodeMaster and CodeNinja
    });

    it('should return empty when nickname does not match', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search?nick_name=Python', {
        method: 'GET',
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

    it('should use default pagination (limit: 20, offset: 0)', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(20); // First 20
      expect(data.total).toBe(25);
      expect(data.limit).toBe(20);
      expect(data.offset).toBe(0);
    });

    it('should respect custom limit', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search?limit=10', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(10);
      expect(data.total).toBe(25);
      expect(data.limit).toBe(10);
    });

    it('should respect offset for pagination', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search?limit=10&offset=20', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(5); // Remaining 5
      expect(data.total).toBe(25);
      expect(data.limit).toBe(10);
      expect(data.offset).toBe(20);
    });

    it('should handle offset beyond total results', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search?limit=10&offset=100', {
        method: 'GET',
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

    it('should combine mentoring_levels and payment_types filters', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search?mentoring_levels=2&payment_types=1', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(2); // CodeMaster and DataMaster
      expect(data.total).toBe(2);
    });

    it('should combine all filters (levels, payment, rate, nickname)', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search?mentoring_levels=2&payment_types=1&hourly_rate_max=80&nick_name=Code', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.mentors).toHaveLength(1); // Only CodeMaster
      expect(data.mentors[0].nick_name).toBe('CodeMaster');
    });

    it('should return empty when combined filters match nothing', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search?mentoring_levels=4&payment_types=32&hourly_rate_max=10', {
        method: 'GET',
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
    it('should handle invalid limit (negative)', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search?limit=-10', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });

    it('should handle invalid offset (negative)', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search?offset=-10', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });

    it('should handle limit exceeding maximum (e.g., 100)', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search?limit=200', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.toLowerCase()).toContain('limit');
    });

    it('should handle non-numeric query parameters gracefully', async () => {
      const req = new Request('http://localhost/api/v1/mentors/search?mentoring_levels=abc', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });
});
