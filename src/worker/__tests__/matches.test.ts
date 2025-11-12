/**
 * Tests for Match Management API endpoints
 * Following TDD: Write tests FIRST, then implement the API
 *
 * Endpoints under test:
 * - POST /api/v1/matches - Create match request
 * - GET /api/v1/matches - List matches
 * - POST /api/v1/matches/:id/respond - Accept/reject match
 * - PATCH /api/v1/matches/:id/complete - Mark as completed
 * - DELETE /api/v1/matches/:id - Cancel/delete match
 */

import { describe, it, expect, beforeEach } from 'vitest';
import app from '../index';
import { createMockDb } from './utils/mockDbFactory';
import { createTestEnv, createAuthenticatedRequest, createTestToken } from './utils/testAuth';
import { expectCreated, expectBadRequest, expectConflict } from './utils/assertions';
import { createTestUser } from './fixtures/testUsers';
import { createMentorProfile } from './fixtures/testMentorProfiles';
import type { Env } from './utils/testAuth';

// ============================================================================
// Test Suite
// ============================================================================

describe('Match Management API', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let mockEnv: Env;
  let mentor: Record<string, unknown>;
  let mentee: Record<string, unknown>;
  let mentorProfile: Record<string, unknown>;

  beforeEach(async () => {
    mockDb = createMockDb({ tables: { users: {}, mentor_profiles: {}, matches: {} } });
    mockEnv = createTestEnv({ platform_db: mockDb as unknown });

    // Create test users and mentor profile
    mentor = await createTestUser(mockEnv, 'mentor@example.com', 'Test Mentor');
    mentee = await createTestUser(mockEnv, 'mentee@example.com', 'Test Mentee');
    
    // Add CV to mentee (CV is mandatory for match requests)
    mentee.cv_url = 'https://example.com/cv.pdf';
    mentee.cv_filename = 'mentee-cv.pdf';
    mentee.cv_uploaded_at = Date.now();
    mockDb._mockTables.users[mentee.id as string] = mentee;
    
    mentorProfile = createMentorProfile('profile-1', mentor.id as string, 'TestMentor', 'Test mentor', 1, 1);

    // Add mentor profile to mock database
    const profilesTable = mockDb._mockTables.mentor_profiles || {};
    profilesTable[mentorProfile.id as string] = mentorProfile;
    mockDb._mockTables.mentor_profiles = profilesTable;
  });

  // ==========================================================================
  // POST /api/v1/matches - Create Match Request
  // ==========================================================================

  describe('POST /api/v1/matches - Create match', () => {
    it('should create a new match request with pending status and all fields', async () => {
      const token = await createTestToken(mentee.id, mentee.email, mentee.name);
      const matchData = {
        mentor_id: mentorProfile.user_id,
        introduction: 'I am a software engineer looking for mentorship in system design.',
        preferred_time: 'Weekends, preferably Saturday afternoons',
      };

      const req = createAuthenticatedRequest('http://localhost/api/v1/matches', token, {
        method: 'POST',
        body: matchData,
      });

      const res = await app.fetch(req, mockEnv);

      // Debug: log the response if it's not 201
      if (res.status !== 201) {
        const errorData = await res.json();
        console.log('Match creation failed:', res.status, errorData);
        console.log('Mentor ID:', mentorProfile.user_id);
        console.log('Mentor exists:', mockDb._mockTables.users[mentorProfile.user_id]);
        console.log('MentorProfile exists:', mockDb._mockTables.mentor_profiles[mentorProfile.id]);
      }

      const data = await expectCreated(res);

      expect(data).toMatchObject({
        id: expect.any(String),
        mentor_id: mentorProfile.user_id,
        mentee_id: mentee.id,
        status: 'pending',
        introduction: 'I am a software engineer looking for mentorship in system design.',
        preferred_time: 'Weekends, preferably Saturday afternoons',
        created_at: expect.any(Number),
        updated_at: expect.any(Number),
      });
    });

    it('should return 400 when mentor_id is missing', async () => {
      const token = await createTestToken(mentee.id, mentee.email, mentee.name);
      const req = createAuthenticatedRequest('http://localhost/api/v1/matches', token, {
        method: 'POST',
        body: {
          introduction: 'Test introduction',
          preferred_time: 'Weekends',
        },
      });

      const res = await app.fetch(req, mockEnv);
      await expectBadRequest(res, undefined, 'mentor_id');
    });

    it('should return 400 when introduction is missing', async () => {
      const token = await createTestToken(mentee.id, mentee.email, mentee.name);
      const req = createAuthenticatedRequest('http://localhost/api/v1/matches', token, {
        method: 'POST',
        body: {
          mentor_id: mentorProfile.user_id,
          preferred_time: 'Weekends',
        },
      });

      const res = await app.fetch(req, mockEnv);
      await expectBadRequest(res, undefined, 'introduction');
    });

    it('should return 400 when preferred_time is missing', async () => {
      const token = await createTestToken(mentee.id, mentee.email, mentee.name);
      const req = createAuthenticatedRequest('http://localhost/api/v1/matches', token, {
        method: 'POST',
        body: {
          mentor_id: mentorProfile.user_id,
          introduction: 'Test introduction',
        },
      });

      const res = await app.fetch(req, mockEnv);
      await expectBadRequest(res, undefined, 'preferred_time');
    });

    it('should return 400 when mentor does not exist', async () => {
      const token = await createTestToken(mentee.id, mentee.email, mentee.name);
      const req = createAuthenticatedRequest('http://localhost/api/v1/matches', token, {
        method: 'POST',
        body: {
          mentor_id: 'nonexistent-user-id',
          introduction: 'Test introduction',
          preferred_time: 'Weekends',
        },
      });

      const res = await app.fetch(req, mockEnv);
      await expectBadRequest(res, undefined, 'Mentor');
    });

    it('should return 400 when mentor profile does not exist', async () => {
      const token = await createTestToken(mentee.id, mentee.email, mentee.name);
      const req = createAuthenticatedRequest('http://localhost/api/v1/matches', token, {
        method: 'POST',
        body: {
          mentor_id: mentee.id, // User without mentor profile
          introduction: 'Test introduction',
          preferred_time: 'Weekends',
        },
      });

      const res = await app.fetch(req, mockEnv);
      await expectBadRequest(res, undefined, 'mentor profile');
    });

    it('should return 400 when mentee tries to match with themselves', async () => {
      // First create a mentor profile for mentee
      const menteeProfile = createMentorProfile('profile-2', mentee.id, 'MenteeMentor', 'Test mentor', 1, 1);

      // Add mentee mentor profile to mock database
      const profilesTable = mockDb._mockTables.mentor_profiles || {};
      profilesTable[menteeProfile.id] = menteeProfile;
      mockDb._mockTables.mentor_profiles = profilesTable;

      const token = await createTestToken(mentee.id, mentee.email, mentee.name);
      const req = createAuthenticatedRequest('http://localhost/api/v1/matches', token, {
        method: 'POST',
        body: {
          mentor_id: mentee.id,
          introduction: 'Test introduction',
          preferred_time: 'Weekends',
        },
      });

      const res = await app.fetch(req, mockEnv);
      await expectBadRequest(res, undefined, 'themselves');
    });

    it('should return 409 when duplicate match already exists', async () => {
      const token = await createTestToken(mentee.id, mentee.email, mentee.name);
      const matchData = {
        mentor_id: mentorProfile.user_id,
        introduction: 'First attempt',
        preferred_time: 'Weekends',
      };

      // Create first match
      const req1 = createAuthenticatedRequest('http://localhost/api/v1/matches', token, {
        method: 'POST',
        body: matchData,
      });
      await app.fetch(req1, mockEnv);

      // Try to create duplicate
      const req2 = createAuthenticatedRequest('http://localhost/api/v1/matches', token, {
        method: 'POST',
        body: matchData,
      });
      const res = await app.fetch(req2, mockEnv);
      await expectConflict(res, undefined, 'duplicate');
    });

    it('should return 400 when mentee has not uploaded CV', async () => {
      // Create mentee without CV
      const menteeWithoutCV = await createTestUser(mockEnv, 'mentee-no-cv@example.com', 'Mentee No CV');
      const token = await createTestToken(menteeWithoutCV.id, menteeWithoutCV.email, menteeWithoutCV.name);
      
      const matchData = {
        mentor_id: mentorProfile.user_id,
        introduction: 'I want mentorship',
        preferred_time: 'Anytime',
      };

      const req = createAuthenticatedRequest('http://localhost/api/v1/matches', token, {
        method: 'POST',
        body: matchData,
      });

      const res = await app.fetch(req, mockEnv);
      await expectBadRequest(res, undefined, 'CV is required');
    });
  });

  // ==========================================================================
  // GET /api/v1/matches - List Matches
  // ==========================================================================

  describe('GET /api/v1/matches - List matches', () => {
    let menteeToken: string;

    beforeEach(async () => {
      menteeToken = await createTestToken(mentee.id, mentee.email, mentee.name);

      // Create a match for testing
      const req = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${menteeToken}`,
        },
        body: JSON.stringify({
          mentor_id: mentorProfile.user_id,
          introduction: 'Looking for guidance on career development',
          preferred_time: 'Flexible schedule',
        }),
      });
      const res = await app.fetch(req, mockEnv);
      await res.json();
    });

    it('should list matches for mentee', async () => {
      const req = new Request('http://localhost/api/v1/matches', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${menteeToken}` },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('matches');
      expect(Array.isArray(data.matches)).toBe(true);
      expect(data.matches).toHaveLength(1);
    });

    it('should filter matches by status', async () => {
      const req = new Request('http://localhost/api/v1/matches?status=pending', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${menteeToken}` },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.matches).toHaveLength(1);
      expect(data.matches[0].status).toBe('pending');
    });

    it('should return 400 for invalid status filter', async () => {
      const req = new Request('http://localhost/api/v1/matches?status=invalid', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${menteeToken}` },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });

    it('should return empty list when no matches exist', async () => {
      // Create a new user with no matches
      const newUser = await createTestUser(mockEnv, 'newuser@example.com', 'New User');
      // Add CV to new user (not needed for this test but keeping consistent)
      newUser.cv_url = 'https://example.com/newuser-cv.pdf';
      newUser.cv_filename = 'newuser-cv.pdf';
      newUser.cv_uploaded_at = Date.now();
      mockDb._mockTables.users[newUser.id as string] = newUser;
      
      const newUserToken = await createTestToken(newUser.id, newUser.email, newUser.name);

      const req = new Request('http://localhost/api/v1/matches', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${newUserToken}` },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.matches)).toBe(true);
    });
  });

  // ==========================================================================
  // POST /api/v1/matches/:id/respond - Accept/Reject Match
  // ==========================================================================

  describe('POST /api/v1/matches/:id/respond - Respond to match', () => {
    let testMatch: MockMatch;
    let menteeToken: string;
    let mentorToken: string;

    beforeEach(async () => {
      menteeToken = await createTestToken(mentee.id, mentee.email, mentee.name);
      mentorToken = await createTestToken(mentor.id, mentor.email, mentor.name);

      const req = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${menteeToken}`,
        },
        body: JSON.stringify({
          mentor_id: mentorProfile.user_id,
          introduction: 'I need mentorship in system design and scalability',
          preferred_time: 'Weekdays after 6 PM',
        }),
      });
      const res = await app.fetch(req, mockEnv);
      testMatch = await res.json();
    });

    it('should accept a match request', async () => {
      const req = new Request(`http://localhost/api/v1/matches/${testMatch.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({ action: 'accept' }),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('active');
      expect(data.id).toBe(testMatch.id);
    });

    it('should reject a match request', async () => {
      const req = new Request(`http://localhost/api/v1/matches/${testMatch.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({ action: 'reject' }),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('rejected');
      expect(data.id).toBe(testMatch.id);
    });

    it('should return 400 when action is invalid', async () => {
      const req = new Request(`http://localhost/api/v1/matches/${testMatch.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({ action: 'invalid' }),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });

    it('should return 400 when action is missing', async () => {
      const req = new Request(`http://localhost/api/v1/matches/${testMatch.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({}),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
    });

    it('should return 404 when match does not exist', async () => {
      const req = new Request('http://localhost/api/v1/matches/nonexistent-id/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({ action: 'accept' }),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
    });
  });

  // ==========================================================================
  // PATCH /api/v1/matches/:id/complete - Mark as Completed
  // ==========================================================================

  describe('PATCH /api/v1/matches/:id/complete - Complete match', () => {
    let testMatch: MockMatch;
    let menteeToken: string;
    let mentorToken: string;

    beforeEach(async () => {
      menteeToken = await createTestToken(mentee.id, mentee.email, mentee.name);
      mentorToken = await createTestToken(mentor.id, mentor.email, mentor.name);

      // Create and accept a match
      const createReq = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${menteeToken}`,
        },
        body: JSON.stringify({
          mentor_id: mentorProfile.user_id,
          introduction: 'Interested in learning from experienced mentor',
          preferred_time: 'Weekday evenings',
        }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      testMatch = await createRes.json();

      // Accept it
      const acceptReq = new Request(`http://localhost/api/v1/matches/${testMatch.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({ action: 'accept' }),
      });
      const acceptRes = await app.fetch(acceptReq, mockEnv);
      testMatch = await acceptRes.json();
    });

    it('should mark an active match as completed', async () => {
      const req = new Request(`http://localhost/api/v1/matches/${testMatch.id}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({}),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('completed');
      expect(data.id).toBe(testMatch.id);
    });

    it('should return 404 when match does not exist', async () => {
      const req = new Request('http://localhost/api/v1/matches/nonexistent-id/complete', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({}),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
    });

    it('should return 400 when match is not active', async () => {
      // Create a new mentee for this test (to avoid duplicate match)
      const newMentee = await createTestUser(mockEnv, 'newmentee@example.com', 'New Mentee');
      // Add CV to new mentee (required for match creation)
      newMentee.cv_url = 'https://example.com/newmentee-cv.pdf';
      newMentee.cv_filename = 'newmentee-cv.pdf';
      newMentee.cv_uploaded_at = Date.now();
      mockDb._mockTables.users[newMentee.id as string] = newMentee;
      
      const newMenteeToken = await createTestToken(newMentee.id, newMentee.email, newMentee.name);

      // Create a pending match with the new mentee
      const createReq = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newMenteeToken}`,
        },
        body: JSON.stringify({
          mentor_id: mentorProfile.user_id,
          introduction: 'Test introduction for pending match',
          preferred_time: 'Weekend mornings',
        }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      const pendingMatch = await createRes.json();

      // Try to complete a pending match
      const req = new Request(`http://localhost/api/v1/matches/${pendingMatch.id}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({}),
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('active');
    });
  });

  // ==========================================================================
  // DELETE /api/v1/matches/:id - Delete/Cancel Match
  // ==========================================================================

  describe('DELETE /api/v1/matches/:id - Cancel match', () => {
    it('should delete a pending match', async () => {
      // Create a match
      const menteeToken = await createTestToken(mentee.id, mentee.email, mentee.name);

      const createReq = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${menteeToken}`,
        },
        body: JSON.stringify({
          mentor_id: mentorProfile.user_id,
          introduction: 'Test introduction for deletion',
          preferred_time: 'Morning sessions',
        }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      const testMatch = await createRes.json();

      // Delete it - mentee can delete their own pending match
      const deleteReq = new Request(`http://localhost/api/v1/matches/${testMatch.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${menteeToken}` },
      });
      const deleteRes = await app.fetch(deleteReq, mockEnv);

      expect(deleteRes.status).toBe(200);
      const data = await deleteRes.json();
      expect(data).toEqual({ success: true });
    });

    it('should return 404 when match does not exist', async () => {
      const mentorToken = await createTestToken(mentor.id, mentor.email, mentor.name);

      const req = new Request('http://localhost/api/v1/matches/nonexistent-id', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${mentorToken}` },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });

  // ==========================================================================
  // Contact Information Sharing Tests
  // ==========================================================================

  describe('GET /api/v1/matches - Contact information sharing', () => {
    let menteeToken: string;
    let mentorToken: string;
    let testMatch: MockMatch;

    beforeEach(async () => {
      menteeToken = await createTestToken(mentee.id, mentee.email, mentee.name);
      mentorToken = await createTestToken(mentor.id, mentor.email, mentor.name);

      // Create a match
      const createReq = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${menteeToken}`,
        },
        body: JSON.stringify({
          mentor_id: mentorProfile.user_id,
          introduction: 'Test introduction for contact info',
          preferred_time: 'Weekday evenings',
        }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      testMatch = await createRes.json();
    });

    it('should NOT include email addresses for pending matches', async () => {
      const req = new Request('http://localhost/api/v1/matches', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${menteeToken}` },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      const match = data.matches.find((m: EnrichedMatch) => m.id === testMatch.id);

      expect(match).toBeDefined();
      expect(match.status).toBe('pending');
      expect(match).not.toHaveProperty('mentor_email');
      expect(match).not.toHaveProperty('mentee_email');
      expect(match).not.toHaveProperty('mentor_linkedin_url');
    });

    it('should include email addresses for accepted (active) matches', async () => {
      // Accept the match first
      const acceptReq = new Request(`http://localhost/api/v1/matches/${testMatch.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({ action: 'accept' }),
      });
      await app.fetch(acceptReq, mockEnv);

      // Fetch matches as mentee
      const req = new Request('http://localhost/api/v1/matches', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${menteeToken}` },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      const match = data.matches.find((m: EnrichedMatch) => m.id === testMatch.id);

      expect(match).toBeDefined();
      expect(match.status).toBe('active');
      expect(match.mentor_email).toBe(mentor.email);
      expect(match.mentee_email).toBe(mentee.email);
    });

    it('should include email addresses for completed matches', async () => {
      // Accept and complete the match
      const acceptReq = new Request(`http://localhost/api/v1/matches/${testMatch.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({ action: 'accept' }),
      });
      await app.fetch(acceptReq, mockEnv);

      const completeReq = new Request(`http://localhost/api/v1/matches/${testMatch.id}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({}),
      });
      await app.fetch(completeReq, mockEnv);

      // Fetch matches
      const req = new Request('http://localhost/api/v1/matches', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${menteeToken}` },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      const match = data.matches.find((m: EnrichedMatch) => m.id === testMatch.id);

      expect(match).toBeDefined();
      expect(match.status).toBe('completed');
      expect(match.mentor_email).toBe(mentor.email);
      expect(match.mentee_email).toBe(mentee.email);
    });

    it('should NOT include email addresses for rejected matches', async () => {
      // Reject the match
      const rejectReq = new Request(`http://localhost/api/v1/matches/${testMatch.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({ action: 'reject' }),
      });
      await app.fetch(rejectReq, mockEnv);

      // Fetch matches
      const req = new Request('http://localhost/api/v1/matches', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${menteeToken}` },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      const match = data.matches.find((m: EnrichedMatch) => m.id === testMatch.id);

      expect(match).toBeDefined();
      expect(match.status).toBe('rejected');
      expect(match).not.toHaveProperty('mentor_email');
      expect(match).not.toHaveProperty('mentee_email');
    });

    it('should include LinkedIn URL for active matches when mentor has one', async () => {
      // Update mentor profile to include LinkedIn URL
      const updateReq = new Request(`http://localhost/api/v1/mentors/profiles/${mentorProfile.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({
          linkedin_url: 'https://www.linkedin.com/in/testmentor',
        }),
      });
      await app.fetch(updateReq, mockEnv);

      // Accept the match
      const acceptReq = new Request(`http://localhost/api/v1/matches/${testMatch.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({ action: 'accept' }),
      });
      await app.fetch(acceptReq, mockEnv);

      // Fetch matches as mentee
      const req = new Request('http://localhost/api/v1/matches', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${menteeToken}` },
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      const match = data.matches.find((m: EnrichedMatch) => m.id === testMatch.id);

      expect(match).toBeDefined();
      expect(match.status).toBe('active');
      expect(match.mentor_linkedin_url).toBe('https://www.linkedin.com/in/testmentor');
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Match lifecycle', () => {
    it('should go through complete lifecycle: pending → active → completed', async () => {
      // Create tokens for mentee and mentor
      const menteeToken = await createTestToken(mentee.id, mentee.email, mentee.name);
      const mentorToken = await createTestToken(mentor.id, mentor.email, mentor.name);

      // Create match (pending)
      const createReq = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${menteeToken}`,
        },
        body: JSON.stringify({
          mentor_id: mentorProfile.user_id,
          introduction: 'Lifecycle integration test introduction',
          preferred_time: 'Any time works',
        }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      let match = await createRes.json();
      expect(match.status).toBe('pending');

      // Accept match (active) - mentor responds
      const acceptReq = new Request(`http://localhost/api/v1/matches/${match.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({ action: 'accept' }),
      });
      const acceptRes = await app.fetch(acceptReq, mockEnv);
      match = await acceptRes.json();
      expect(match.status).toBe('active');

      // Complete match - mentor completes
      const completeReq = new Request(`http://localhost/api/v1/matches/${match.id}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({}),
      });
      const completeRes = await app.fetch(completeReq, mockEnv);
      match = await completeRes.json();
      expect(match.status).toBe('completed');
    });

    it('should reject match: pending → rejected', async () => {
      // Create tokens for mentee and mentor
      const menteeToken = await createTestToken(mentee.id, mentee.email, mentee.name);
      const mentorToken = await createTestToken(mentor.id, mentor.email, mentor.name);

      // Create match (pending)
      const createReq = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${menteeToken}`,
        },
        body: JSON.stringify({
          mentor_id: mentorProfile.user_id,
          introduction: 'Lifecycle integration test introduction',
          preferred_time: 'Any time works',
        }),
      });
      const createRes = await app.fetch(createReq, mockEnv);
      let match = await createRes.json();
      expect(match.status).toBe('pending');

      // Reject match - mentor rejects
      const rejectReq = new Request(`http://localhost/api/v1/matches/${match.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mentorToken}`,
        },
        body: JSON.stringify({ action: 'reject' }),
      });
      const rejectRes = await app.fetch(rejectReq, mockEnv);
      match = await rejectRes.json();
      expect(match.status).toBe('rejected');
    });
  });
});
