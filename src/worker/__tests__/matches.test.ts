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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import app from '../index';
import { createToken } from '../auth/jwt';
import type { AuthPayload } from '../../types/user';

interface Env {
  platform_db: D1Database;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  JWT_SECRET: string;
}

// ============================================================================
// Mock D1 Database
// ============================================================================

interface MockUser {
  id: string;
  email: string;
  name: string;
  created_at: number;
  updated_at: number;
}

interface MockMentorProfile {
  id: string;
  user_id: string;
  nick_name: string;
  bio: string;
  mentoring_levels: number;
  availability: string;
  hourly_rate: number;
  payment_types: number;
  allow_reviews: boolean;
  allow_recording: boolean;
  linkedin_url?: string | null;
  created_at: number;
  updated_at: number;
}

interface MockMatch {
  id: string;
  mentor_id: string;
  mentee_id: string;
  status: string;
  introduction: string;
  preferred_time: string;
  cv_included: number;
  created_at: number;
  updated_at: number;
}

interface EnrichedMatch extends MockMatch {
  mentor_name?: string;
  mentee_name?: string;
  mentor_email?: string;
  mentee_email?: string;
  mentor_linkedin_url?: string;
}

const createMockDb = () => {
  const mockUsers = new Map<string, MockUser>();
  const mockProfiles = new Map<string, MockMentorProfile>();
  const mockMatches = new Map<string, MockMatch>();

  return {
    prepare: vi.fn((query: string) => ({
      bind: vi.fn((...params: (string | number)[]) => ({
        all: vi.fn(async () => {
          // SELECT matches with filters
          if (query.includes('SELECT') && query.includes('matches') && query.includes('WHERE')) {
            let results = Array.from(mockMatches.values());
            let paramIndex = 0;

            // Handle OR condition first (it appears first in query string)
            if (query.includes('(matches.mentor_id = ? OR matches.mentee_id = ?)')) {
              const userId = params[paramIndex++];
              results = results.filter(m => m.mentor_id === userId || m.mentee_id === userId);
              // The OR condition has two parameters (same value repeated)
              paramIndex++; // Skip the second parameter in the OR
              // Check for role filter (additional condition after OR)
              if (query.includes('AND matches.mentor_id = ?')) {
                const mentorId = params[paramIndex++];
                results = results.filter(m => m.mentor_id === mentorId);
              } else if (query.includes('AND matches.mentee_id = ?')) {
                const menteeId = params[paramIndex++];
                results = results.filter(m => m.mentee_id === menteeId);
              }
            } else if (query.includes('matches.mentor_id = ?') && !query.includes('OR')) {
              const mentorId = params[paramIndex++];
              results = results.filter(m => m.mentor_id === mentorId);
            } else if (query.includes('matches.mentee_id = ?') && !query.includes('OR')) {
              const menteeId = params[paramIndex++];
              results = results.filter(m => m.mentee_id === menteeId);
            }

            // Handle status filter
            if (query.includes('status = ?')) {
              const status = params[paramIndex++];
              results = results.filter(m => m.status === status);
            }

            // Enhance results with user emails and mentor LinkedIn if query includes those fields
            const enhancedResults = results.map(match => {
              const enhancedMatch: EnrichedMatch = { ...match };

              // Add mentor and mentee names (always included)
              const mentorUser = mockUsers.get(match.mentor_id);
              const menteeUser = mockUsers.get(match.mentee_id);
              if (mentorUser) enhancedMatch.mentor_name = mentorUser.name;
              if (menteeUser) enhancedMatch.mentee_name = menteeUser.name;

              // Add emails and LinkedIn for active/completed matches
              if (match.status === 'active' || match.status === 'completed') {
                if (mentorUser) enhancedMatch.mentor_email = mentorUser.email;
                if (menteeUser) enhancedMatch.mentee_email = menteeUser.email;

                // Add mentor LinkedIn URL if exists - find profile by user_id
                for (const profile of mockProfiles.values()) {
                  if (profile.user_id === match.mentor_id) {
                    if (profile.linkedin_url) {
                      enhancedMatch.mentor_linkedin_url = profile.linkedin_url;
                    }
                    break; // Found the profile, no need to continue
                  }
                }
              }

              return enhancedMatch;
            });

            return { results: enhancedResults };
          }

          return { results: [] };
        }),
        first: vi.fn(async () => {
          if (query.includes('SELECT') && query.includes('users') && query.includes('WHERE id = ?')) {
            const userId = params[0];
            return mockUsers.get(userId) || null;
          }
          if (query.includes('SELECT') && query.includes('mentor_profiles') && query.includes('WHERE id = ?')) {
            const profileId = params[0];
            return mockProfiles.get(profileId) || null;
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
          if (query.includes('SELECT') && query.includes('matches') && query.includes('WHERE id = ?')) {
            const matchId = params[0];
            return mockMatches.get(matchId) || null;
          }
          if (query.includes('SELECT') && query.includes('matches') && query.includes('mentor_id') && query.includes('mentee_id')) {
            const mentorId = params[0];
            const menteeId = params[1];
            for (const [, match] of mockMatches.entries()) {
              if (match.mentor_id === mentorId && match.mentee_id === menteeId) {
                return match;
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
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [id, user_id, nick_name, bio, mentoring_levels, availability, hourly_rate, payment_types, expertise_domains, expertise_topics_preset, expertise_topics_custom, allow_reviews, allow_recording, linkedin_url, created_at, updated_at] = params;
            mockProfiles.set(id, { id, user_id, nick_name, bio, mentoring_levels, availability, hourly_rate, payment_types, allow_reviews, allow_recording, linkedin_url, created_at, updated_at });
            return { success: true, meta: { changes: 1 } };
          }

          if (query.includes('INSERT INTO matches')) {
            const [id, mentor_id, mentee_id, status, introduction, preferred_time, cv_included, created_at, updated_at] = params;
            mockMatches.set(id, { id, mentor_id, mentee_id, status, introduction, preferred_time, cv_included, created_at, updated_at });
            return { success: true, meta: { changes: 1 } };
          }

          if (query.includes('UPDATE matches')) {
            const id = params[params.length - 1];
            const existing = mockMatches.get(id);
            if (existing) {
              const updated = { ...existing };
              let paramIndex = 0;

              if (query.includes('status = ?')) {
                updated.status = params[paramIndex++];
              }

              updated.updated_at = params[params.length - 2];
              mockMatches.set(id, updated);
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          }

          if (query.includes('UPDATE mentor_profiles')) {
            const id = params[params.length - 1] as string;
            // Try to find profile by id first
            let profile = mockProfiles.get(id);
            
            // If not found by id, try to find by user_id (fallback)
            if (!profile) {
              for (const [, p] of mockProfiles.entries()) {
                if (p.user_id === id) {
                  profile = p;
                  break;
                }
              }
            }
            
            if (profile) {
              const updated = { ...profile };
              // Parse SET clause to determine parameter order
              // The query format is: UPDATE mentor_profiles SET field1 = ?, field2 = ?, ... WHERE id = ?
              // Parameters are in the same order as fields appear in SET clause, with id as last param
              const setClauseMatch = query.match(/SET\s+(.+?)\s+WHERE/i);
              if (setClauseMatch && setClauseMatch[1]) {
                const setClause = setClauseMatch[1];
                const fields = setClause.split(',').map(f => f.trim().split('=')[0].trim());
                let paramIndex = 0;
                
                for (const field of fields) {
                  if (field === 'linkedin_url') {
                    updated.linkedin_url = params[paramIndex++] as string | null;
                  } else if (field === 'updated_at') {
                    updated.updated_at = params[paramIndex++] as number;
                  } else if (field === 'nick_name') {
                    updated.nick_name = params[paramIndex++] as string;
                  } else if (field === 'bio') {
                    updated.bio = params[paramIndex++] as string;
                  } else if (field === 'mentoring_levels') {
                    updated.mentoring_levels = params[paramIndex++] as number;
                  } else if (field === 'availability') {
                    updated.availability = params[paramIndex++] as string;
                  } else if (field === 'hourly_rate') {
                    updated.hourly_rate = params[paramIndex++] as number;
                  } else if (field === 'payment_types') {
                    updated.payment_types = params[paramIndex++] as number;
                  } else if (field === 'allow_reviews') {
                    updated.allow_reviews = Boolean(params[paramIndex++]);
                  } else if (field === 'allow_recording') {
                    updated.allow_recording = Boolean(params[paramIndex++]);
                  } else {
                    // Unknown field, skip parameter
                    paramIndex++;
                  }
                }
              }

              // Update the profile in the map using the original id (not user_id)
              mockProfiles.set(profile.id, updated);
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          }

          if (query.includes('DELETE FROM matches')) {
            const id = params[0];
            if (mockMatches.has(id)) {
              mockMatches.delete(id);
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
    _mockMatches: mockMatches,
  };
};

// ============================================================================
// Helper Functions for Tests
// ============================================================================

const JWT_SECRET = 'test-secret-key';

/**
 * Create a JWT token for testing
 */
async function createTestToken(userId: string, email: string, name: string): Promise<string> {
  const payload: AuthPayload = { userId, email, name };
  return createToken(payload, JWT_SECRET);
}

async function createTestUser(mockEnv: Env, email: string, name: string) {
  const req = new Request('http://localhost/api/v1/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  });
  const res = await app.fetch(req, mockEnv);
  return await res.json();
}

async function createTestMentorProfile(mockEnv: Env, userId: string, nickName: string) {
  const token = await createTestToken(userId, 'test@example.com', 'Test User');
  const req = new Request('http://localhost/api/v1/mentors/profiles', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      user_id: userId,
      nick_name: nickName,
      bio: 'Test mentor',
      mentoring_levels: 1,
      payment_types: 1,
    }),
  });
  const res = await app.fetch(req, mockEnv);
  return await res.json();
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Match Management API', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let mockEnv: Env;
  let mentor: MockUser;
  let mentee: MockUser;
  let mentorProfile: MockMentorProfile;

  beforeEach(async () => {
    mockDb = createMockDb();
     
    mockEnv = {
      platform_db: mockDb as unknown,
      JWT_SECRET: JWT_SECRET,
    } as Env;

    // Create test users and mentor profile
    mentor = await createTestUser(mockEnv, 'mentor@example.com', 'Test Mentor');
    mentee = await createTestUser(mockEnv, 'mentee@example.com', 'Test Mentee');
    mentorProfile = await createTestMentorProfile(mockEnv, mentor.id, 'TestMentor');
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

      const req = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(matchData),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(201);
      const data = await res.json();
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
      const req = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          introduction: 'Test introduction',
          preferred_time: 'Weekends',
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('mentor_id');
    });

    it('should return 400 when introduction is missing', async () => {
      const token = await createTestToken(mentee.id, mentee.email, mentee.name);
      const req = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          mentor_id: mentorProfile.user_id,
          preferred_time: 'Weekends',
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('introduction');
    });

    it('should return 400 when preferred_time is missing', async () => {
      const token = await createTestToken(mentee.id, mentee.email, mentee.name);
      const req = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          mentor_id: mentorProfile.user_id,
          introduction: 'Test introduction',
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('preferred_time');
    });

    it('should return 400 when mentor does not exist', async () => {
      const token = await createTestToken(mentee.id, mentee.email, mentee.name);
      const req = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          mentor_id: 'nonexistent-user-id',
          introduction: 'Test introduction',
          preferred_time: 'Weekends',
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Mentor');
    });

    it('should return 400 when mentor profile does not exist', async () => {
      const token = await createTestToken(mentee.id, mentee.email, mentee.name);
      const req = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          mentor_id: mentee.id, // User without mentor profile
          introduction: 'Test introduction',
          preferred_time: 'Weekends',
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('mentor profile');
    });

    it('should return 400 when mentee tries to match with themselves', async () => {
      // First create a mentor profile for mentee
      await createTestMentorProfile(mockEnv, mentee.id, 'MenteeMentor');

      const token = await createTestToken(mentee.id, mentee.email, mentee.name);
      const req = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          mentor_id: mentee.id,
          introduction: 'Test introduction',
          preferred_time: 'Weekends',
        }),
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('themselves');
    });

    it('should return 409 when duplicate match already exists', async () => {
      const token = await createTestToken(mentee.id, mentee.email, mentee.name);
      const matchData = {
        mentor_id: mentorProfile.user_id,
        introduction: 'First attempt',
        preferred_time: 'Weekends',
      };

      // Create first match
      const req1 = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(matchData),
      });
      await app.fetch(req1, mockEnv);

      // Try to create duplicate
      const req2 = new Request('http://localhost/api/v1/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(matchData),
      });
      const res = await app.fetch(req2, mockEnv);

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error.toLowerCase()).toContain('duplicate');
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
