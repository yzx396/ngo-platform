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

import { describe, it, expect, beforeEach } from 'vitest';
import app from '../index';
import { MentoringLevel, PaymentType } from '../../types/mentor';
import { createMockDb } from './utils/mockDbFactory';
import { createTestEnv, createAuthenticatedRequest, createTestToken } from './utils/testAuth';
import { expectCreated, expectBadRequest, expectForbidden, expectConflict } from './utils/assertions';
import { createTestUser } from './fixtures/testUsers';

// ============================================================================
// Test Suite
// ============================================================================

describe('Mentor Profile CRUD API', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let mockEnv: ReturnType<typeof createTestEnv>;
  let testUser: Record<string, unknown>;

  beforeEach(async () => {
    mockDb = createMockDb({ tables: { users: {}, mentor_profiles: {} } });
    mockEnv = createTestEnv({ platform_db: mockDb as unknown });

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

      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      const req = createAuthenticatedRequest('http://localhost/api/v1/mentors/profiles', token, {
        method: 'POST',
        body: profileData,
      });

      const res = await app.fetch(req, mockEnv);
      const data = await expectCreated(res);

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

      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      const req = createAuthenticatedRequest('http://localhost/api/v1/mentors/profiles', token, {
        method: 'POST',
        body: profileData,
      });

      const res = await app.fetch(req, mockEnv);
      const data = await expectCreated(res);

      expect(data.user_id).toBe(testUser.id);
      expect(data.nick_name).toBe('MinimalMentor');
      expect(data.availability).toBe(null);
      expect(data.hourly_rate).toBe(null);
      expect(data.allow_reviews).toBe(true); // default
      expect(data.allow_recording).toBe(true); // default
    });

    it('should return 400 when required fields are missing', async () => {
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      const req = createAuthenticatedRequest('http://localhost/api/v1/mentors/profiles', token, {
        method: 'POST',
        body: { user_id: testUser.id }, // Missing nick_name, bio, etc
      });

      const res = await app.fetch(req, mockEnv);
      await expectBadRequest(res);
    });

    it('should return 400 when user_id does not exist', async () => {
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      const req = createAuthenticatedRequest('http://localhost/api/v1/mentors/profiles', token, {
        method: 'POST',
        body: {
          user_id: 'nonexistent-user-id',
          nick_name: 'TestMentor',
          bio: 'Test bio',
          mentoring_levels: MentoringLevel.Entry,
          payment_types: PaymentType.Venmo,
        },
      });

      const res = await app.fetch(req, mockEnv);
      await expectForbidden(res, undefined, 'Cannot create mentor profile for another user');
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
      const token1 = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      const req1 = createAuthenticatedRequest('http://localhost/api/v1/mentors/profiles', token1, {
        method: 'POST',
        body: profileData,
      });
      await app.fetch(req1, mockEnv);

      // Create second user
      const user2 = await createTestUser(mockEnv, 'mentor2@example.com', 'Second Mentor');

      // Try to create second profile with same nickname
      const token2 = await createTestToken(user2.id as string, user2.email as string, user2.name as string);
      const req2 = createAuthenticatedRequest('http://localhost/api/v1/mentors/profiles', token2, {
        method: 'POST',
        body: { ...profileData, user_id: user2.id },
      });
      const res = await app.fetch(req2, mockEnv);
      await expectConflict(res, undefined, 'nickname already exists');
    });

    it('should return 409 when user already has a mentor profile', async () => {
      // Create first profile
      const token1 = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      const req1 = createAuthenticatedRequest('http://localhost/api/v1/mentors/profiles', token1, {
        method: 'POST',
        body: {
          user_id: testUser.id,
          nick_name: 'FirstProfile',
          bio: 'First bio',
          mentoring_levels: MentoringLevel.Entry,
          payment_types: PaymentType.Venmo,
        },
      });
      await app.fetch(req1, mockEnv);

      // Try to create second profile for same user
      const token2 = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      const req2 = createAuthenticatedRequest('http://localhost/api/v1/mentors/profiles', token2, {
        method: 'POST',
        body: {
          user_id: testUser.id,
          nick_name: 'SecondProfile',
          bio: 'Second bio',
          mentoring_levels: MentoringLevel.Senior,
          payment_types: PaymentType.Paypal,
        },
      });
      const res = await app.fetch(req2, mockEnv);
      await expectConflict(res, undefined, 'already has a mentor profile');
    });

    it('should validate bit flags are non-negative integers', async () => {
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      const req = createAuthenticatedRequest('http://localhost/api/v1/mentors/profiles', token, {
        method: 'POST',
        body: {
          user_id: testUser.id,
          nick_name: 'TestMentor',
          bio: 'Test bio',
          mentoring_levels: -1, // Invalid
          payment_types: PaymentType.Venmo,
        },
      });

      const res = await app.fetch(req, mockEnv);
      await expectBadRequest(res, undefined, 'must be non-negative');
    });
  });

  // ==========================================================================
  // GET /api/v1/mentors/profiles/:id - Get Mentor Profile by ID
  // ==========================================================================

  describe('GET /api/v1/mentors/profiles/:id - Authentication requirement', () => {
    it('should return 401 when no authentication headers provided', async () => {
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);

      const createReq = createAuthenticatedRequest('http://localhost/api/v1/mentors/profiles', token, {
        method: 'POST',
        body: {
          user_id: testUser.id,
          nick_name: `GetTestMentor_${Date.now()}`,
          bio: 'Bio for get test',
          mentoring_levels: MentoringLevel.Staff,
          payment_types: PaymentType.Crypto,
          hourly_rate: 100,
        },
      });
      const createRes = await app.fetch(createReq, mockEnv);
      const created = await createRes.json();

      // Try to get profile without authentication
      const getReq = new Request(`http://localhost/api/v1/mentors/profiles/${created.id}`, {
        method: 'GET',
      });
      const getRes = await app.fetch(getReq, mockEnv);

      expect(getRes.status).toBe(401);
      const data = await getRes.json();
      expect(data.error).toContain('Unauthorized');
    });

    it('should return 401 when invalid authentication token provided', async () => {
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);

      const createReq = createAuthenticatedRequest('http://localhost/api/v1/mentors/profiles', token, {
        method: 'POST',
        body: {
          user_id: testUser.id,
          nick_name: `InvalidAuthTest_${Date.now()}`,
          bio: 'Bio for invalid auth test',
          mentoring_levels: MentoringLevel.Entry,
          payment_types: PaymentType.Venmo,
        },
      });
      const createRes = await app.fetch(createReq, mockEnv);
      const created = await createRes.json();

      // Try to get profile with invalid token
      const getReq = createAuthenticatedRequest(`http://localhost/api/v1/mentors/profiles/${created.id}`, 'invalid-token');
      const getRes = await app.fetch(getReq, mockEnv);

      expect(getRes.status).toBe(401);
    });
  });

  describe('GET /api/v1/mentors/profiles/:id - Get mentor profile (Protected)', () => {
    it('should return mentor profile when ID exists (requires authentication)', async () => {
      // Create a profile first
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);

      const createReq = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: testUser.id,
          nick_name: `GetTestMentor_${Date.now()}`,
          bio: 'Bio for get test',
          mentoring_levels: MentoringLevel.Staff,
          payment_types: PaymentType.Crypto,
          hourly_rate: 100,
        }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      const created = await createRes.json();

      // Get the profile with authentication
      const getReq = new Request(`http://localhost/api/v1/mentors/profiles/${created.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const getRes = await app.fetch(getReq, mockEnv);

      expect(getRes.status).toBe(200);
      const data = await getRes.json();

      // Verify the key fields match what was created
      expect(data.id).toBe(created.id);
      expect(data.user_id).toBe(created.user_id);
      expect(data.nick_name).toBe(created.nick_name);
      expect(data.bio).toBe(created.bio);
      expect(data.mentoring_levels).toBe(created.mentoring_levels);
      expect(data.payment_types).toBe(created.payment_types);
      expect(data.hourly_rate).toBe(created.hourly_rate);

      // Verify new expertise fields are present and have correct types
      expect(data.expertise_domains).toBe(0);
      expect(data.expertise_topics_preset).toBe(0);
      expect(Array.isArray(data.expertise_topics_custom)).toBe(true);
      expect(data.expertise_topics_custom.length).toBe(0);
    });

    it('should return 404 when profile does not exist', async () => {
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/profiles/nonexistent-id', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('not found');
    });

    it('should return boolean values (not database integers) for allow_reviews and allow_recording', async () => {
      // Create a profile with explicit boolean values
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);

      const createReq = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: testUser.id,
          nick_name: `BooleanTestMentor_${Date.now()}`,
          bio: 'Testing boolean conversion',
          mentoring_levels: MentoringLevel.Entry,
          payment_types: PaymentType.Venmo,
          allow_reviews: true,
          allow_recording: false,
        }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      expect(createRes.status).toBe(201);
      const created = await createRes.json();

      // Verify creation response has correct boolean types
      expect(typeof created.allow_reviews).toBe('boolean');
      expect(typeof created.allow_recording).toBe('boolean');
      expect(created.allow_reviews).toBe(true);
      expect(created.allow_recording).toBe(false);

      // Get the profile and verify boolean types are preserved
      const getReq = new Request(`http://localhost/api/v1/mentors/profiles/${created.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const getRes = await app.fetch(getReq, mockEnv);
      expect(getRes.status).toBe(200);
      const data = await getRes.json();

      // Verify that values are strict booleans, not integers
      expect(typeof data.allow_reviews).toBe('boolean');
      expect(typeof data.allow_recording).toBe('boolean');

      // The database mock may have quirks, so check if conversion is working
      // A proper implementation should return true/false
      const allowReviewsOk = data.allow_reviews === true || data.allow_reviews === 1;
      const allowRecordingOk = data.allow_recording === false || data.allow_recording === 0;
      expect(allowReviewsOk).toBe(true);
      expect(allowRecordingOk).toBe(true);

      // Verify expertise fields are included and have correct types
      expect(data.expertise_domains).toBe(0);
      expect(data.expertise_topics_preset).toBe(0);
      expect(Array.isArray(data.expertise_topics_custom)).toBe(true);
    });
  });

  // ==========================================================================
  // PUT /api/v1/mentors/profiles/:id - Update Mentor Profile
  // ==========================================================================

  describe('PUT /api/v1/mentors/profiles/:id', () => {
    let createdProfile: Record<string, unknown>;

    beforeEach(async () => {
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      
      const createReq = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      
      const updateReq = new Request(`http://localhost/api/v1/mentors/profiles/${createdProfile.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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

      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      
      const updateReq = new Request(`http://localhost/api/v1/mentors/profiles/${createdProfile.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ mentoring_levels: newLevels }),
      });
      const updateRes = await app.fetch(updateReq, mockEnv);

      expect(updateRes.status).toBe(200);
      const updated = await updateRes.json();
      expect(updated.mentoring_levels).toBe(newLevels);
    });

    it('should update hourly rate', async () => {
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      
      const updateReq = new Request(`http://localhost/api/v1/mentors/profiles/${createdProfile.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ hourly_rate: 150 }),
      });
      const updateRes = await app.fetch(updateReq, mockEnv);

      expect(updateRes.status).toBe(200);
      const updated = await updateRes.json();
      expect(updated.hourly_rate).toBe(150);
    });

    it('should update multiple fields at once', async () => {
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      
      const updateReq = new Request(`http://localhost/api/v1/mentors/profiles/${createdProfile.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      
      const req = new Request('http://localhost/api/v1/mentors/profiles/nonexistent-id', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ bio: 'New bio' }),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
    });

    it('should return 400 when no fields provided to update', async () => {
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      
      const req = new Request(`http://localhost/api/v1/mentors/profiles/${createdProfile.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      
      const createReq = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
        headers: { 
          'Authorization': `Bearer ${token}`,
        },
      });
      const deleteRes = await app.fetch(deleteReq, mockEnv);

      expect(deleteRes.status).toBe(200);
      const data = await deleteRes.json();
      expect(data).toEqual({ success: true });

      // Verify profile is deleted (should return 404 with auth)
      const getReq = new Request(`http://localhost/api/v1/mentors/profiles/${created.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const getRes = await app.fetch(getReq, mockEnv);
      expect(getRes.status).toBe(404);
    });

    it('should return 404 when deleting non-existent profile', async () => {
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      
      const req = new Request('http://localhost/api/v1/mentors/profiles/nonexistent-id', {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
        },
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
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      
      const req = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      
      const req = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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

      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      
      const req = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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

      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);
      
      const req = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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

  // ==========================================================================
  // LinkedIn URL Tests
  // ==========================================================================

  describe('LinkedIn URL Feature', () => {
    it('should create a mentor profile with a valid LinkedIn URL', async () => {
      const profileData = {
        user_id: testUser.id,
        nick_name: 'LinkedInMentor',
        bio: 'Software engineer with LinkedIn profile',
        mentoring_levels: MentoringLevel.Entry,
        payment_types: PaymentType.Venmo,
        linkedin_url: 'https://www.linkedin.com/in/johndoe',
      };

      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.linkedin_url).toBe('https://www.linkedin.com/in/johndoe');
    });

    it('should create a mentor profile without LinkedIn URL (null)', async () => {
      const profileData = {
        user_id: testUser.id,
        nick_name: 'NoLinkedInMentor',
        bio: 'Software engineer without LinkedIn',
        mentoring_levels: MentoringLevel.Entry,
        payment_types: PaymentType.Venmo,
      };

      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);

      const req = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.linkedin_url).toBe(null);
    });

    it('should reject invalid LinkedIn URL formats', async () => {
      const invalidUrls = [
        'not-a-url',
        'http://example.com',
        'https://twitter.com/johndoe',
        'linkedin.com/in/johndoe', // Missing protocol
      ];

      for (const invalidUrl of invalidUrls) {
        const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);

        const req = new Request('http://localhost/api/v1/mentors/profiles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: testUser.id,
            nick_name: `InvalidLinkedIn_${Date.now()}`,
            bio: 'Testing invalid LinkedIn URL',
            mentoring_levels: MentoringLevel.Entry,
            payment_types: PaymentType.Venmo,
            linkedin_url: invalidUrl,
          }),
        });

        const res = await app.fetch(req, mockEnv);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('LinkedIn URL');
      }
    });

    it('should accept various valid LinkedIn URL formats', async () => {
      const validUrls = [
        'https://www.linkedin.com/in/johndoe',
        'https://linkedin.com/in/johndoe',
        'https://www.linkedin.com/in/john-doe-123456',
        'http://www.linkedin.com/in/johndoe',
      ];

      for (let i = 0; i < validUrls.length; i++) {
        const validUrl = validUrls[i];
        // Create a new user for each test to avoid conflicts
        const newUser = await createTestUser(mockEnv, `test${Date.now()}_${i}@example.com`, 'Test User');
        const token = await createTestToken(newUser.id as string, newUser.email as string, newUser.name as string);

        const req = new Request('http://localhost/api/v1/mentors/profiles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: newUser.id,
            nick_name: `ValidLinkedIn_${Date.now()}_${i}`,
            bio: 'Testing valid LinkedIn URL',
            mentoring_levels: MentoringLevel.Entry,
            payment_types: PaymentType.Venmo,
            linkedin_url: validUrl,
          }),
        });

        const res = await app.fetch(req, mockEnv);
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.linkedin_url).toBe(validUrl);
      }
    });

    it('should update mentor profile to add LinkedIn URL', async () => {
      // Create a profile without LinkedIn URL
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);

      const createReq = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: testUser.id,
          nick_name: 'UpdateLinkedInMentor',
          bio: 'Will add LinkedIn later',
          mentoring_levels: MentoringLevel.Entry,
          payment_types: PaymentType.Venmo,
        }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      const created = await createRes.json();

      // Update to add LinkedIn URL
      const updateReq = new Request(`http://localhost/api/v1/mentors/profiles/${created.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          linkedin_url: 'https://www.linkedin.com/in/newprofile',
        }),
      });
      const updateRes = await app.fetch(updateReq, mockEnv);

      expect(updateRes.status).toBe(200);
      const updated = await updateRes.json();
      expect(updated.linkedin_url).toBe('https://www.linkedin.com/in/newprofile');
    });

    it('should update mentor profile to remove LinkedIn URL', async () => {
      // Create a profile with LinkedIn URL
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);

      const createReq = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: testUser.id,
          nick_name: 'RemoveLinkedInMentor',
          bio: 'Will remove LinkedIn later',
          mentoring_levels: MentoringLevel.Entry,
          payment_types: PaymentType.Venmo,
          linkedin_url: 'https://www.linkedin.com/in/oldprofile',
        }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      const created = await createRes.json();

      // Update to remove LinkedIn URL
      const updateReq = new Request(`http://localhost/api/v1/mentors/profiles/${created.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          linkedin_url: null,
        }),
      });
      const updateRes = await app.fetch(updateReq, mockEnv);

      expect(updateRes.status).toBe(200);
      const updated = await updateRes.json();
      expect(updated.linkedin_url).toBe(null);
    });

    it('should return LinkedIn URL when getting mentor profile', async () => {
      // Create a profile with LinkedIn URL
      const token = await createTestToken(testUser.id as string, testUser.email as string, testUser.name as string);

      const createReq = new Request('http://localhost/api/v1/mentors/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: testUser.id,
          nick_name: 'GetLinkedInMentor',
          bio: 'Testing GET with LinkedIn',
          mentoring_levels: MentoringLevel.Entry,
          payment_types: PaymentType.Venmo,
          linkedin_url: 'https://www.linkedin.com/in/testprofile',
        }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      const created = await createRes.json();

      // Get the profile
      const getReq = new Request(`http://localhost/api/v1/mentors/profiles/${created.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const getRes = await app.fetch(getReq, mockEnv);

      expect(getRes.status).toBe(200);
      const data = await getRes.json();
      expect(data.linkedin_url).toBe('https://www.linkedin.com/in/testprofile');
    });
  });
});
