/**
 * Tests for Mentor Profile CRUD API endpoints
 * Following TDD: Write tests FIRST, then implement the API
 *
 * Endpoints under test:
 * - POST /api/v1/mentors/profiles - Create mentor profile
 * - GET /api/v1/mentors/profiles/:id - Get mentor profile by ID
 * - PUT /api/v1/mentors/profiles/:id - Update mentor profile
 * - DELETE /api/v1/mentors/profiles/:id - Delete mentor profile
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import app from '../index';
import { MentoringLevel, PaymentType } from '../../types/mentor';

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
          if (query.includes('SELECT') && query.includes('mentor_profiles') && query.includes('WHERE id = ?')) {
            const profileId = params[0];
            const profile = mockProfiles.get(profileId);
            return { results: profile ? [profile] : [] };
          }
          if (query.includes('SELECT') && query.includes('users') && query.includes('WHERE id = ?')) {
            const userId = params[0];
            const user = mockUsers.get(userId);
            return { results: user ? [user] : [] };
          }
          if (query.includes('SELECT') && query.includes('mentor_profiles') && query.includes('WHERE nick_name = ?')) {
            const nickname = params[0];
            for (const [, profile] of mockProfiles.entries()) {
              if (profile.nick_name === nickname) {
                return { results: [profile] };
              }
            }
            return { results: [] };
          }
          if (query.includes('SELECT') && query.includes('mentor_profiles') && query.includes('WHERE user_id = ?')) {
            const userId = params[0];
            for (const [, profile] of mockProfiles.entries()) {
              if (profile.user_id === userId) {
                return { results: [profile] };
              }
            }
            return { results: [] };
          }
          return { results: [] };
        }),
        first: vi.fn(async () => {
          if (query.includes('SELECT') && query.includes('mentor_profiles') && query.includes('WHERE id = ?')) {
            const profileId = params[0];
            return mockProfiles.get(profileId) || null;
          }
          if (query.includes('SELECT') && query.includes('users') && query.includes('WHERE id = ?')) {
            const userId = params[0];
            return mockUsers.get(userId) || null;
          }
          if (query.includes('SELECT') && query.includes('mentor_profiles') && query.includes('WHERE nick_name = ?')) {
            const nickname = params[0];
            for (const [, profile] of mockProfiles.entries()) {
              if (profile.nick_name === nickname) {
                return profile;
              }
            }
            return null;
          }
          if (query.includes('SELECT') && query.includes('mentor_profiles') && query.includes('WHERE user_id = ?')) {
            const userId = params[0];
            for (const [, profile] of mockProfiles.entries()) {
              if (profile.user_id === userId) {
                return profile;
              }
            }
            return null;
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
            // Extract all fields from params
            const [id, user_id, nick_name, bio, mentoring_levels, availability, hourly_rate, payment_types, allow_reviews, allow_recording, created_at, updated_at] = params;
            const profile = {
              id, user_id, nick_name, bio, mentoring_levels, availability, hourly_rate, payment_types,
              allow_reviews, allow_recording, created_at, updated_at
            };
            mockProfiles.set(id, profile);
            return { success: true, meta: { changes: 1 } };
          }
          if (query.includes('UPDATE mentor_profiles')) {
            const id = params[params.length - 1];
            const existing = mockProfiles.get(id);
            if (existing) {
              const updated = { ...existing };
              let paramIndex = 0;

              // Update fields based on what's in the query
              if (query.includes('nick_name =')) updated.nick_name = params[paramIndex++];
              if (query.includes('bio =') && !query.includes('nick_name =')) {
                updated.bio = params[paramIndex++];
              } else if (query.includes('bio =')) {
                updated.bio = params[paramIndex++];
              }
              if (query.includes('mentoring_levels =')) {
                const field = query.includes('nick_name =') || query.includes('bio =') ? params[paramIndex++] : params[0];
                updated.mentoring_levels = field;
              }
              if (query.includes('availability =')) updated.availability = params[paramIndex++];
              if (query.includes('hourly_rate =')) updated.hourly_rate = params[paramIndex++];
              if (query.includes('payment_types =')) updated.payment_types = params[paramIndex++];
              if (query.includes('allow_reviews =')) updated.allow_reviews = params[paramIndex++];
              if (query.includes('allow_recording =')) updated.allow_recording = params[paramIndex++];

              updated.updated_at = params[params.length - 2];
              mockProfiles.set(id, updated);
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          }
          if (query.includes('DELETE FROM mentor_profiles')) {
            const id = params[0];
            if (mockProfiles.has(id)) {
              mockProfiles.delete(id);
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
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

// ============================================================================
// Test Suite
// ============================================================================

describe('Mentor Profile CRUD API', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let mockEnv: Env;
  let testUser: Record<string, unknown>;

  beforeEach(async () => {
    mockDb = createMockDb();
    mockEnv = {
      platform_db: mockDb as unknown,
    } as Env;

    // Create a test user for mentor profiles
    testUser = await createTestUser(mockEnv, 'mentor@example.com', 'Test Mentor');
  });

  // ==========================================================================
  // POST /api/v1/mentors/profiles - Create Mentor Profile
  // ==========================================================================

  describe('POST /api/v1/mentors/profiles', () => {
    it('should create a mentor profile with all fields', async () => {
      const profileData = {
        user_id: testUser.id,
        nick_name: 'CodeMentor',
        bio: 'Experienced software engineer with 10 years in the industry',
        mentoring_levels: MentoringLevel.Entry | MentoringLevel.Senior, // 3
        availability: 'Weekdays 9am-5pm EST',
        hourly_rate: 75,
        payment_types: PaymentType.Venmo | PaymentType.Paypal, // 3
        allow_reviews: true,
        allow_recording: true,
      };

      const req = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data).toMatchObject({
        id: expect.any(String),
        user_id: testUser.id,
        nick_name: 'CodeMentor',
        bio: profileData.bio,
        mentoring_levels: 3,
        availability: profileData.availability,
        hourly_rate: 75,
        payment_types: 3,
        allow_reviews: true,
        allow_recording: true,
        created_at: expect.any(Number),
        updated_at: expect.any(Number),
      });
    });

    it('should create a mentor profile with minimal required fields', async () => {
      const profileData = {
        user_id: testUser.id,
        nick_name: 'MinimalMentor',
        bio: 'Short bio',
        mentoring_levels: MentoringLevel.Entry,
        payment_types: PaymentType.Venmo,
      };

      const req = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.user_id).toBe(testUser.id);
      expect(data.nick_name).toBe('MinimalMentor');
      expect(data.availability).toBe(null);
      expect(data.hourly_rate).toBe(null);
      expect(data.allow_reviews).toBe(true); // default
      expect(data.allow_recording).toBe(true); // default
    });

    it('should return 400 when required fields are missing', async () => {
      const req = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: testUser.id }), // Missing nick_name, bio, etc
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });

    it('should return 400 when user_id does not exist', async () => {
      const req = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'nonexistent-user-id',
          nick_name: 'TestMentor',
          bio: 'Test bio',
          mentoring_levels: MentoringLevel.Entry,
          payment_types: PaymentType.Venmo,
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('User not found');
    });

    it('should return 409 when nick_name already exists', async () => {
      const profileData = {
        user_id: testUser.id,
        nick_name: 'DuplicateNick',
        bio: 'First profile',
        mentoring_levels: MentoringLevel.Entry,
        payment_types: PaymentType.Venmo,
      };

      // Create first profile
      const req1 = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      await app.fetch(req1, mockEnv);

      // Create second user
      const user2 = await createTestUser(mockEnv, 'mentor2@example.com', 'Second Mentor');

      // Try to create second profile with same nickname
      const req2 = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profileData, user_id: user2.id }),
      });
      const res = await app.fetch(req2, mockEnv);

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain('nickname already exists');
    });

    it('should return 409 when user already has a mentor profile', async () => {
      // Create first profile
      const req1 = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: testUser.id,
          nick_name: 'FirstProfile',
          bio: 'First bio',
          mentoring_levels: MentoringLevel.Entry,
          payment_types: PaymentType.Venmo,
        }),
      });
      await app.fetch(req1, mockEnv);

      // Try to create second profile for same user
      const req2 = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: testUser.id,
          nick_name: 'SecondProfile',
          bio: 'Second bio',
          mentoring_levels: MentoringLevel.Senior,
          payment_types: PaymentType.Paypal,
        }),
      });
      const res = await app.fetch(req2, mockEnv);

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain('already has a mentor profile');
    });

    it('should validate bit flags are non-negative integers', async () => {
      const req = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: testUser.id,
          nick_name: 'TestMentor',
          bio: 'Test bio',
          mentoring_levels: -1, // Invalid
          payment_types: PaymentType.Venmo,
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('must be non-negative');
    });
  });

  // ==========================================================================
  // GET /api/v1/mentors/profiles/:id - Get Mentor Profile by ID
  // ==========================================================================

  describe('GET /api/v1/mentors/profiles/:id', () => {
    it('should return mentor profile when ID exists', async () => {
      // Create a profile first
      const createReq = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: testUser.id,
          nick_name: 'GetTestMentor',
          bio: 'Bio for get test',
          mentoring_levels: MentoringLevel.Staff,
          payment_types: PaymentType.Crypto,
          hourly_rate: 100,
        }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      const created = await createRes.json();

      // Get the profile
      const getReq = new Request(`http://localhost/api/v1/mentors/profiles/${created.id}`, {
        method: 'GET',
      });
      const getRes = await app.fetch(getReq, mockEnv);

      expect(getRes.status).toBe(200);
      const data = await getRes.json();
      expect(data).toEqual(created);
    });

    it('should return 404 when profile does not exist', async () => {
      const req = new Request('http://localhost/api/v1/mentors/profiles/nonexistent-id', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('not found');
    });
  });

  // ==========================================================================
  // PUT /api/v1/mentors/profiles/:id - Update Mentor Profile
  // ==========================================================================

  describe('PUT /api/v1/mentors/profiles/:id', () => {
    let createdProfile: Record<string, unknown>;

    beforeEach(async () => {
      const createReq = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: testUser.id,
          nick_name: 'UpdateTestMentor',
          bio: 'Original bio',
          mentoring_levels: MentoringLevel.Entry,
          payment_types: PaymentType.Venmo,
          hourly_rate: 50,
        }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      createdProfile = await createRes.json();
    });

    it('should update mentor profile bio', async () => {
      const updateReq = new Request(`http://localhost/api/v1/mentors/profiles/${createdProfile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio: 'Updated bio' }),
      });
      const updateRes = await app.fetch(updateReq, mockEnv);

      expect(updateRes.status).toBe(200);
      const updated = await updateRes.json();
      expect(updated.bio).toBe('Updated bio');
      expect(updated.nick_name).toBe(createdProfile.nick_name);
    });

    it('should update mentoring levels using bit flags', async () => {
      const newLevels = MentoringLevel.Senior | MentoringLevel.Staff | MentoringLevel.Management;

      const updateReq = new Request(`http://localhost/api/v1/mentors/profiles/${createdProfile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentoring_levels: newLevels }),
      });
      const updateRes = await app.fetch(updateReq, mockEnv);

      expect(updateRes.status).toBe(200);
      const updated = await updateRes.json();
      expect(updated.mentoring_levels).toBe(newLevels);
    });

    it('should update hourly rate', async () => {
      const updateReq = new Request(`http://localhost/api/v1/mentors/profiles/${createdProfile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hourly_rate: 150 }),
      });
      const updateRes = await app.fetch(updateReq, mockEnv);

      expect(updateRes.status).toBe(200);
      const updated = await updateRes.json();
      expect(updated.hourly_rate).toBe(150);
    });

    it('should update multiple fields at once', async () => {
      const updateReq = new Request(`http://localhost/api/v1/mentors/profiles/${createdProfile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: 'New bio',
          hourly_rate: 200,
          availability: 'Weekends only',
          allow_reviews: false,
        }),
      });
      const updateRes = await app.fetch(updateReq, mockEnv);

      expect(updateRes.status).toBe(200);
      const updated = await updateRes.json();
      expect(updated.bio).toBe('New bio');
      expect(updated.hourly_rate).toBe(200);
      expect(updated.availability).toBe('Weekends only');
      expect(updated.allow_reviews).toBe(false);
    });

    it('should return 404 when updating non-existent profile', async () => {
      const req = new Request('http://localhost/api/v1/mentors/profiles/nonexistent-id', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio: 'New bio' }),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
    });

    it('should return 400 when no fields provided to update', async () => {
      const req = new Request(`http://localhost/api/v1/mentors/profiles/${createdProfile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('At least one field');
    });
  });

  // ==========================================================================
  // DELETE /api/v1/mentors/profiles/:id - Delete Mentor Profile
  // ==========================================================================

  describe('DELETE /api/v1/mentors/profiles/:id', () => {
    it('should delete mentor profile', async () => {
      // Create a profile first
      const createReq = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: testUser.id,
          nick_name: 'DeleteTestMentor',
          bio: 'To be deleted',
          mentoring_levels: MentoringLevel.Entry,
          payment_types: PaymentType.Venmo,
        }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      const created = await createRes.json();

      // Delete the profile
      const deleteReq = new Request(`http://localhost/api/v1/mentors/profiles/${created.id}`, {
        method: 'DELETE',
      });
      const deleteRes = await app.fetch(deleteReq, mockEnv);

      expect(deleteRes.status).toBe(200);
      const data = await deleteRes.json();
      expect(data).toEqual({ success: true });

      // Verify profile is deleted (should return 404)
      const getReq = new Request(`http://localhost/api/v1/mentors/profiles/${created.id}`, {
        method: 'GET',
      });
      const getRes = await app.fetch(getReq, mockEnv);
      expect(getRes.status).toBe(404);
    });

    it('should return 404 when deleting non-existent profile', async () => {
      const req = new Request('http://localhost/api/v1/mentors/profiles/nonexistent-id', {
        method: 'DELETE',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });

  // ==========================================================================
  // Edge Cases and Validation
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle very long bio (500+ characters)', async () => {
      const longBio = 'A'.repeat(1000);

      const req = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: testUser.id,
          nick_name: 'LongBioMentor',
          bio: longBio,
          mentoring_levels: MentoringLevel.Entry,
          payment_types: PaymentType.Venmo,
        }),
      });
      const res = await app.fetch(req, mockEnv);

      // Should either accept or reject gracefully
      expect([201, 400]).toContain(res.status);
    });

    it('should handle special characters in nickname', async () => {
      const req = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: testUser.id,
          nick_name: 'Code-Master_2024',
          bio: 'Test bio',
          mentoring_levels: MentoringLevel.Entry,
          payment_types: PaymentType.Venmo,
        }),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.nick_name).toBe('Code-Master_2024');
    });

    it('should handle zero hourly rate (free mentoring)', async () => {
      const req = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: testUser.id,
          nick_name: 'FreeMentor',
          bio: 'I mentor for free',
          mentoring_levels: MentoringLevel.Entry,
          payment_types: 0, // No payment types
          hourly_rate: 0,
        }),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.hourly_rate).toBe(0);
      expect(data.payment_types).toBe(0);
    });

    it('should handle all mentoring levels set (bit flag: 15)', async () => {
      const allLevels = MentoringLevel.Entry | MentoringLevel.Senior |
                        MentoringLevel.Staff | MentoringLevel.Management;

      const req = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: testUser.id,
          nick_name: 'AllLevelsMentor',
          bio: 'I mentor all levels',
          mentoring_levels: allLevels,
          payment_types: PaymentType.Venmo,
        }),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.mentoring_levels).toBe(15);
    });

    it('should handle all payment types set (bit flag: 63)', async () => {
      const allPayments = PaymentType.Venmo | PaymentType.Paypal | PaymentType.Zelle |
                          PaymentType.Alipay | PaymentType.Wechat | PaymentType.Crypto;

      const req = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: testUser.id,
          nick_name: 'AllPaymentsMentor',
          bio: 'I accept all payment types',
          mentoring_levels: MentoringLevel.Entry,
          payment_types: allPayments,
        }),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.payment_types).toBe(63);
    });
  });
});
