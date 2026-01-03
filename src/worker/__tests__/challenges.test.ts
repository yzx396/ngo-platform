import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import app from '../index';
import { createToken } from '../auth/jwt';
import type { AuthPayload } from '../../types/user';
import { ChallengeStatus, SubmissionStatus } from '../../types/challenge';

const JWT_SECRET = 'test-jwt-secret';

/**
 * Test environment interface
 */
interface TestEnv {
  platform_db: D1Database;
  JWT_SECRET: string;
}

/**
 * Create a JWT token for testing
 */
async function createTestToken(userId: string, email: string, name: string, role?: string): Promise<string> {
  const payload: AuthPayload & { role?: string } = { userId, email, name, role };
  return createToken(payload as AuthPayload, JWT_SECRET);
}

// ============================================================================
// Mock Database Setup
// ============================================================================

function createMockDb() {
  const mockUsers = new Map<string, Record<string, unknown>>();
  const mockRoles = new Map<string, Record<string, unknown>>();
  const mockChallenges = new Map<string, Record<string, unknown>>();
  const mockParticipants = new Map<string, Record<string, unknown>>();
  const mockSubmissions = new Map<string, Record<string, unknown>>();
  const mockPoints = new Map<string, Record<string, unknown>>();
  const mockPointActionsLog = new Map<string, Record<string, unknown>>();

  // Add test user
  mockUsers.set('user123', { id: 'user123', email: 'user@test.com', name: 'Test User' });
  mockUsers.set('admin123', { id: 'admin123', email: 'admin@test.com', name: 'Admin User' });

  // Add admin role
  mockRoles.set('admin123', { id: 'role123', user_id: 'admin123', role: 'admin' });

  const db = {
    prepare: vi.fn((query: string) => ({
      bind: vi.fn((...params: unknown[]) => ({
        all: vi.fn(async () => {
          // SELECT challenges (list all)
          if (query.includes('SELECT c.*, u.name as creator_name') && query.includes('FROM challenges c')) {
            let challenges = Array.from(mockChallenges.values());

            // Filter by status if provided
            if (query.includes('WHERE c.status = ?') && params.length > 0) {
              challenges = challenges.filter(c => c.status === params[0]);
            }

            // Add creator name and participant count
            challenges = challenges.map(c => {
              const creator = mockUsers.get(c.created_by_user_id as string);
              const participants = Array.from(mockParticipants.values())
                .filter(p => p.challenge_id === c.id);
              return {
                ...c,
                creator_name: creator?.name || 'Unknown',
                participant_count: participants.length
              };
            });

            return { results: challenges };
          }

          // SELECT challenge by ID
          if (query.includes('SELECT') && query.includes('challenges') && (query.includes('WHERE id = ?') || query.includes('WHERE c.id = ?'))) {
            const challengeId = params[0];
            const challenge = mockChallenges.get(challengeId);
            if (!challenge) return { results: [] };

            const creator = mockUsers.get(challenge.created_by_user_id as string);
            const participants = Array.from(mockParticipants.values())
              .filter(p => p.challenge_id === challengeId);

            return {
              results: [{
                ...challenge,
                creator_name: creator?.name || 'Unknown',
                participant_count: participants.length
              }]
            };
          }

          // SELECT user roles
          if (query.includes('SELECT') && query.includes('user_roles') && query.includes('WHERE user_id = ?')) {
            const userId = params[0];
            const role = mockRoles.get(userId);
            return { results: role ? [role] : [] };
          }

          // SELECT participant (check if user joined)
          if (query.includes('SELECT') && query.includes('challenge_participants') &&
              query.includes('WHERE user_id = ?') && query.includes('AND challenge_id = ?')) {
            const userId = params[0];
            const challengeId = params[1];
            const key = `${userId}:${challengeId}`;
            const participant = mockParticipants.get(key);
            return { results: participant ? [participant] : [] };
          }

          // SELECT submission
          if (query.includes('SELECT') && query.includes('challenge_submissions')) {
            // Get submissions for a challenge (with user info)
            if (query.includes('WHERE cs.challenge_id = ?') && query.includes('JOIN users')) {
              const challengeId = params[0];
              let submissions = Array.from(mockSubmissions.values())
                .filter(s => s.challenge_id === challengeId);

              submissions = submissions.map(s => {
                const user = mockUsers.get(s.user_id as string);
                return {
                  ...s,
                  user_name: user?.name || 'Unknown',
                  user_email: user?.email || ''
                };
              });

              return { results: submissions };
            }

            // Get submission by user and challenge
            if (query.includes('WHERE user_id = ?') && query.includes('AND challenge_id = ?')) {
              const userId = params[0];
              const challengeId = params[1];
              const key = `${userId}:${challengeId}`;
              const submission = mockSubmissions.get(key);
              return { results: submission ? [submission] : [] };
            }

            // Get submission by ID
            if (query.includes('WHERE id = ?')) {
              const submissionId = params[0];
              const submission = mockSubmissions.get(submissionId);
              return { results: submission ? [submission] : [] };
            }
          }

          // SELECT user points
          if (query.includes('SELECT') && query.includes('user_points') && query.includes('WHERE user_id = ?')) {
            const userId = params[0];
            const points = mockPoints.get(userId) || { user_id: userId, points: 0 };
            return { results: [points] };
          }

          // SELECT point_actions_log (for diminishing returns check)
          if (query.includes('SELECT COUNT') && query.includes('point_actions_log')) {
            const userId = params[0];
            const actionType = params[1];
            const timeWindow = params[2];
            // Count recent actions of this type for this user
            const count = Array.from(mockPointActionsLog.values())
              .filter(log =>
                log.user_id === userId &&
                log.action_type === actionType &&
                (log.created_at as number) >= timeWindow
              ).length;
            return { results: [{ count }] };
          }

          return { results: [] };
        }),

        first: vi.fn(async () => {
          // Get single challenge
          if (query.includes('SELECT') && query.includes('challenges') && (query.includes('WHERE id = ?') || query.includes('WHERE c.id = ?'))) {
            const challengeId = params[0];
            const challenge = mockChallenges.get(challengeId);
            if (!challenge) return null;

            const creator = mockUsers.get(challenge.created_by_user_id as string);
            const participants = Array.from(mockParticipants.values())
              .filter(p => p.challenge_id === challengeId);

            return {
              ...challenge,
              creator_name: creator?.name || 'Unknown',
              participant_count: participants.length
            };
          }

          // Get user role
          if (query.includes('SELECT') && query.includes('user_roles') && query.includes('WHERE user_id = ?')) {
            const userId = params[0];
            return mockRoles.get(userId) || null;
          }

          // Get user points (for awardPointsForAction and approval)
          if (query.includes('SELECT') && query.includes('user_points') && query.includes('WHERE user_id = ?')) {
            const userId = params[0];
            return mockPoints.get(userId) || null;
          }

          // Get point actions count (for diminishing returns)
          if (query.includes('SELECT COUNT') && query.includes('point_actions_log')) {
            const userId = params[0];
            const actionType = params[1];
            const timeWindow = params[2];
            // Count recent actions of this type for this user
            const count = Array.from(mockPointActionsLog.values())
              .filter(log =>
                log.user_id === userId &&
                log.action_type === actionType &&
                (log.created_at as number) >= timeWindow
              ).length;
            return { count };
          }

          // Get participant
          if (query.includes('challenge_participants')) {
            const userId = params[0];
            const challengeId = params[1];
            const key = `${userId}:${challengeId}`;
            return mockParticipants.get(key) || null;
          }

          // Get submission
          if (query.includes('challenge_submissions')) {
            if (params.length === 2) {
              const userId = params[0];
              const challengeId = params[1];
              const key = `${userId}:${challengeId}`;
              return mockSubmissions.get(key) || null;
            }
            const submissionId = params[0];
            return mockSubmissions.get(submissionId) || null;
          }

          return null;
        }),

        run: vi.fn(async () => {
          // INSERT challenge
          if (query.includes('INSERT INTO challenges')) {
            const [id, title, description, requirements, userId, pointReward, deadline, status, createdAt, updatedAt] = params;
            mockChallenges.set(id, {
              id, title, description, requirements,
              created_by_user_id: userId,
              point_reward: pointReward,
              deadline, status, created_at: createdAt, updated_at: updatedAt
            });
            return { success: true };
          }

          // UPDATE challenge
          if (query.includes('UPDATE challenges') && query.includes('SET')) {
            const challengeId = params[params.length - 1];
            const challenge = mockChallenges.get(challengeId);
            if (challenge) {
              // Parse SET clause to update fields
              if (query.includes('title = ?')) {
                challenge.title = params[0];
                challenge.description = params[1];
                challenge.requirements = params[2];
                challenge.point_reward = params[3];
                challenge.deadline = params[4];
                challenge.status = params[5];
                challenge.updated_at = params[6];
              }
              mockChallenges.set(challengeId, challenge);
            }
            return { success: true };
          }

          // DELETE challenge
          if (query.includes('DELETE FROM challenges')) {
            const challengeId = params[0];
            mockChallenges.delete(challengeId);
            // Delete related participants and submissions
            Array.from(mockParticipants.entries()).forEach(([key, p]) => {
              if (p.challenge_id === challengeId) mockParticipants.delete(key);
            });
            Array.from(mockSubmissions.entries()).forEach(([key, s]) => {
              if (s.challenge_id === challengeId) mockSubmissions.delete(key);
            });
            return { success: true };
          }

          // INSERT participant
          if (query.includes('INSERT INTO challenge_participants')) {
            const [id, userId, challengeId, joinedAt] = params;
            const key = `${userId}:${challengeId}`;
            mockParticipants.set(key, { id, user_id: userId, challenge_id: challengeId, joined_at: joinedAt });
            return { success: true };
          }

          // INSERT submission
          if (query.includes('INSERT INTO challenge_submissions')) {
            const [id, userId, challengeId, submissionText, submissionUrl, status, submittedAt] = params;
            const key = `${userId}:${challengeId}`;
            mockSubmissions.set(key, {
              id, user_id: userId, challenge_id: challengeId,
              submission_text: submissionText, submission_url: submissionUrl,
              status, submitted_at: submittedAt,
              reviewed_at: null, reviewed_by_user_id: null, feedback: null
            });
            mockSubmissions.set(id, mockSubmissions.get(key)!);
            return { success: true };
          }

          // UPDATE submission (approve/reject)
          if (query.includes('UPDATE challenge_submissions')) {
            const submissionId = params[params.length - 1];
            const submission = mockSubmissions.get(submissionId);
            if (submission) {
              if (query.includes('status = ?')) {
                submission.status = params[0];
                submission.reviewed_at = params[1];
                submission.reviewed_by_user_id = params[2];
                if (params.length > 4) submission.feedback = params[3];
                mockSubmissions.set(submissionId, submission);
                // Also update in the user:challenge map
                const key = `${submission.user_id}:${submission.challenge_id}`;
                mockSubmissions.set(key, submission);
              }
            }
            return { success: true };
          }

          // UPDATE user points
          if (query.includes('UPDATE user_points') && query.includes('SET points')) {
            const newPoints = params[0];
            const userId = params[params.length - 1];
            const currentPoints = mockPoints.get(userId) || { user_id: userId, points: 0 };
            mockPoints.set(userId, { ...currentPoints, points: newPoints });
            return { success: true };
          }

          // INSERT user points
          if (query.includes('INSERT INTO user_points')) {
            const [id, userId, points] = params;
            mockPoints.set(userId as string, { id, user_id: userId, points });
            return { success: true };
          }

          // INSERT point_actions_log
          if (query.includes('INSERT INTO point_actions_log')) {
            const [id, userId, actionType, referenceId, pointsAwarded, createdAt] = params;
            mockPointActionsLog.set(id as string, {
              id, user_id: userId, action_type: actionType,
              reference_id: referenceId, points_awarded: pointsAwarded, created_at: createdAt
            });
            return { success: true };
          }

          return { success: true };
        })
      }))
    }))
  } as unknown as D1Database;

  return { db, mockUsers, mockRoles, mockChallenges, mockParticipants, mockSubmissions, mockPoints, mockPointActionsLog };
}

// ============================================================================
// Tests
// ============================================================================

describe('Challenges API', () => {
  let mockDb: D1Database;
  let mockChallenges: Map<string, Record<string, unknown>>;
  let mockSubmissions: Map<string, Record<string, unknown>>;
  let mockParticipants: Map<string, Record<string, unknown>>;
  let mockPoints: Map<string, Record<string, unknown>>;
  let mockPointActionsLog: Map<string, Record<string, unknown>>;
  let env: TestEnv;

  beforeEach(() => {
    const mocks = createMockDb();
    mockDb = mocks.db;
    mockChallenges = mocks.mockChallenges;
    mockSubmissions = mocks.mockSubmissions;
    mockParticipants = mocks.mockParticipants;
    mockPoints = mocks.mockPoints;
    mockPointActionsLog = mocks.mockPointActionsLog;
    env = {
      platform_db: mockDb,
      JWT_SECRET
    };

    // Add a test challenge
    mockChallenges.set('challenge1', {
      id: 'challenge1',
      title: 'Test Challenge',
      description: 'Test Description',
      requirements: 'Test Requirements',
      created_by_user_id: 'admin123',
      point_reward: 100,
      deadline: Date.now() + 86400000, // Tomorrow
      status: ChallengeStatus.Active,
      created_at: Date.now(),
      updated_at: Date.now()
    });
  });

  describe('GET /api/v1/challenges', () => {
    it('should return all challenges', async () => {
      const req = new Request('http://localhost/api/v1/challenges');
      const res = await app.fetch(req, env);

      expect(res.status).toBe(200);
      const data = await res.json() as { challenges: unknown[] };
      expect(Array.isArray(data.challenges)).toBe(true);
      expect(data.challenges.length).toBeGreaterThan(0);
    });

    it('should filter challenges by status', async () => {
      const req = new Request('http://localhost/api/v1/challenges?status=active');
      const res = await app.fetch(req, env);

      expect(res.status).toBe(200);
      const data = await res.json() as { challenges: Array<{ status: string }> };
      expect(data.challenges.every(c => c.status === 'active')).toBe(true);
    });
  });

  describe('POST /api/v1/challenges', () => {
    it('should create challenge with admin auth', async () => {
      const token = await createTestToken('admin123', 'admin@test.com', 'Admin User', 'admin');
      const req = new Request('http://localhost/api/v1/challenges', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'New Challenge',
          description: 'New Description',
          requirements: 'New Requirements',
          point_reward: 50,
          deadline: Date.now() + 86400000
        })
      });

      const res = await app.fetch(req, env);
      expect(res.status).toBe(201);
      const data = await res.json() as { challenge: { title: string } };
      expect(data.challenge.title).toBe('New Challenge');
    });

    it('should return 403 for non-admin users', async () => {
      const token = await createTestToken('user123', 'user@test.com', 'Test User');
      const req = new Request('http://localhost/api/v1/challenges', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'New Challenge',
          description: 'New Description',
          requirements: 'New Requirements',
          point_reward: 50,
          deadline: Date.now() + 86400000
        })
      });

      const res = await app.fetch(req, env);
      expect(res.status).toBe(403);
    });

    it('should return 400 for missing required fields', async () => {
      const token = await createTestToken('admin123', 'admin@test.com', 'Admin User', 'admin');
      const req = new Request('http://localhost/api/v1/challenges', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'New Challenge'
          // Missing required fields
        })
      });

      const res = await app.fetch(req, env);
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/challenges/:id', () => {
    it('should return challenge by ID', async () => {
      const req = new Request('http://localhost/api/v1/challenges/challenge1');
      const res = await app.fetch(req, env);

      expect(res.status).toBe(200);
      const data = await res.json() as { challenge: { id: string; title: string } };
      expect(data.challenge.id).toBe('challenge1');
      expect(data.challenge.title).toBe('Test Challenge');
    });

    it('should return 404 for non-existent challenge', async () => {
      const req = new Request('http://localhost/api/v1/challenges/nonexistent');
      const res = await app.fetch(req, env);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/v1/challenges/:id', () => {
    it('should update challenge with admin auth', async () => {
      const token = await createTestToken('admin123', 'admin@test.com', 'Admin User', 'admin');
      const req = new Request('http://localhost/api/v1/challenges/challenge1', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Updated Challenge',
          description: 'Updated Description',
          requirements: 'Updated Requirements',
          point_reward: 150,
          deadline: Date.now() + 86400000,
          status: ChallengeStatus.Active
        })
      });

      const res = await app.fetch(req, env);
      expect(res.status).toBe(200);
      const data = await res.json() as { challenge: { title: string } };
      expect(data.challenge.title).toBe('Updated Challenge');
    });

    it('should return 403 for non-admin users', async () => {
      const token = await createTestToken('user123', 'user@test.com', 'Test User');
      const req = new Request('http://localhost/api/v1/challenges/challenge1', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Updated Challenge'
        })
      });

      const res = await app.fetch(req, env);
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/challenges/:id', () => {
    it('should delete challenge with admin auth', async () => {
      const token = await createTestToken('admin123', 'admin@test.com', 'Admin User', 'admin');
      const req = new Request('http://localhost/api/v1/challenges/challenge1', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const res = await app.fetch(req, env);
      expect(res.status).toBe(200);
    });

    it('should return 403 for non-admin users', async () => {
      const token = await createTestToken('user123', 'user@test.com', 'Test User');
      const req = new Request('http://localhost/api/v1/challenges/challenge1', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const res = await app.fetch(req, env);
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/challenges/:id/join', () => {
    it('should allow user to join challenge', async () => {
      const token = await createTestToken('user123', 'user@test.com', 'Test User');
      const req = new Request('http://localhost/api/v1/challenges/challenge1/join', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const res = await app.fetch(req, env);
      expect(res.status).toBe(200);
    });

    it('should return 401 without auth', async () => {
      const req = new Request('http://localhost/api/v1/challenges/challenge1/join', {
        method: 'POST'
      });

      const res = await app.fetch(req, env);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/challenges/:id/submit', () => {
    it('should allow user to submit completion', async () => {
      // First join the challenge
      const token = await createTestToken('user123', 'user@test.com', 'Test User');
      mockParticipants.set('user123:challenge1', {
        id: 'part1',
        user_id: 'user123',
        challenge_id: 'challenge1',
        joined_at: Date.now()
      });

      const req = new Request('http://localhost/api/v1/challenges/challenge1/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          submission_text: 'I completed the challenge!',
          submission_url: 'https://example.com/proof'
        })
      });

      const res = await app.fetch(req, env);
      expect(res.status).toBe(200);
    });

    it('should return 401 without auth', async () => {
      const req = new Request('http://localhost/api/v1/challenges/challenge1/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          submission_text: 'I completed the challenge!'
        })
      });

      const res = await app.fetch(req, env);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/challenges/:id/submissions', () => {
    it('should return submissions for admin', async () => {
      const token = await createTestToken('admin123', 'admin@test.com', 'Admin User', 'admin');
      const req = new Request('http://localhost/api/v1/challenges/challenge1/submissions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const res = await app.fetch(req, env);
      expect(res.status).toBe(200);
      const data = await res.json() as { submissions: unknown[] };
      expect(Array.isArray(data.submissions)).toBe(true);
    });

    it('should return 403 for non-admin users', async () => {
      const token = await createTestToken('user123', 'user@test.com', 'Test User');
      const req = new Request('http://localhost/api/v1/challenges/challenge1/submissions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const res = await app.fetch(req, env);
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/submissions/:id/approve', () => {
    it('should approve submission and award points (admin only)', async () => {
      // Add a test submission
      mockSubmissions.set('sub1', {
        id: 'sub1',
        user_id: 'user123',
        challenge_id: 'challenge1',
        submission_text: 'Done!',
        submission_url: null,
        status: SubmissionStatus.Pending,
        submitted_at: Date.now(),
        reviewed_at: null,
        reviewed_by_user_id: null,
        feedback: null
      });

      const token = await createTestToken('admin123', 'admin@test.com', 'Admin User', 'admin');
      const req = new Request('http://localhost/api/v1/submissions/sub1/approve', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const res = await app.fetch(req, env);
      expect(res.status).toBe(200);
    });

    it('should return 403 for non-admin users', async () => {
      const token = await createTestToken('user123', 'user@test.com', 'Test User');
      const req = new Request('http://localhost/api/v1/submissions/sub1/approve', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const res = await app.fetch(req, env);
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/submissions/:id/reject', () => {
    it('should reject submission with feedback (admin only)', async () => {
      // Add a test submission
      mockSubmissions.set('sub2', {
        id: 'sub2',
        user_id: 'user123',
        challenge_id: 'challenge1',
        submission_text: 'Done!',
        submission_url: null,
        status: SubmissionStatus.Pending,
        submitted_at: Date.now(),
        reviewed_at: null,
        reviewed_by_user_id: null,
        feedback: null
      });

      const token = await createTestToken('admin123', 'admin@test.com', 'Admin User', 'admin');
      const req = new Request('http://localhost/api/v1/submissions/sub2/reject', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          feedback: 'Please provide more details'
        })
      });

      const res = await app.fetch(req, env);
      expect(res.status).toBe(200);
    });

    it('should return 403 for non-admin users', async () => {
      const token = await createTestToken('user123', 'user@test.com', 'Test User');
      const req = new Request('http://localhost/api/v1/submissions/sub1/reject', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const res = await app.fetch(req, env);
      expect(res.status).toBe(403);
    });
  });

  // ============================================================================
  // Challenge Points System Tests (TDD - RED phase)
  // ============================================================================

  describe('Challenge Points System', () => {
    describe('Join Challenge Points', () => {
      it('should award 5 points when joining a challenge', async () => {
        // Initialize user with 0 points
        mockPoints.set('user123', { id: 'points1', user_id: 'user123', points: 0 });

        const token = await createTestToken('user123', 'user@test.com', 'Test User');
        const req = new Request('http://localhost/api/v1/challenges/challenge1/join', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const res = await app.fetch(req, env);
        expect(res.status).toBe(200);

        // Verify points were awarded
        const userPoints = mockPoints.get('user123');
        expect(userPoints?.points).toBe(5);
      });

      it('should log challenge_joined action in point_actions_log', async () => {
        mockPoints.set('user123', { id: 'points1', user_id: 'user123', points: 0 });

        const token = await createTestToken('user123', 'user@test.com', 'Test User');
        const req = new Request('http://localhost/api/v1/challenges/challenge1/join', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        await app.fetch(req, env);

        // Verify action was logged
        const actionLogs = Array.from(mockPointActionsLog.values());
        const joinLog = actionLogs.find(log =>
          log.user_id === 'user123' &&
          log.action_type === 'challenge_joined' &&
          log.reference_id === 'challenge1'
        );
        expect(joinLog).toBeDefined();
        expect(joinLog?.points_awarded).toBe(5);
      });

      it('should award 0 points for 6th join in 24 hours (anti-abuse)', async () => {
        mockPoints.set('user123', { id: 'points1', user_id: 'user123', points: 25 }); // Already have 25 points from 5 joins

        // Simulate 5 previous joins in the last hour (use seconds, not milliseconds)
        const nowSeconds = Math.floor(Date.now() / 1000);
        for (let i = 0; i < 5; i++) {
          mockPointActionsLog.set(`log${i}`, {
            id: `log${i}`,
            user_id: 'user123',
            action_type: 'challenge_joined',
            reference_id: `challenge${i}`,
            points_awarded: 5,
            created_at: nowSeconds - 100 // Recent (100 seconds ago)
          });
        }

        // Create a new challenge for the 6th join
        mockChallenges.set('challenge6', {
          id: 'challenge6',
          title: 'Challenge 6',
          description: 'Desc',
          requirements: 'Req',
          created_by_user_id: 'admin123',
          point_reward: 100,
          deadline: Date.now() + 86400000,
          status: ChallengeStatus.Active,
          created_at: Date.now(),
          updated_at: Date.now()
        });

        const token = await createTestToken('user123', 'user@test.com', 'Test User');
        const req = new Request('http://localhost/api/v1/challenges/challenge6/join', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        await app.fetch(req, env);

        // Verify no additional points were awarded (still 25)
        const userPoints = mockPoints.get('user123');
        expect(userPoints?.points).toBe(25);

        // Verify the action was logged with 0 points
        const actionLogs = Array.from(mockPointActionsLog.values());
        const sixthJoinLog = actionLogs.find(log =>
          log.user_id === 'user123' &&
          log.action_type === 'challenge_joined' &&
          log.reference_id === 'challenge6'
        );
        expect(sixthJoinLog).toBeDefined();
        expect(sixthJoinLog?.points_awarded).toBe(0);
      });
    });

    describe('Submit Challenge Points', () => {
      it('should award 10 points when submitting a challenge', async () => {
        mockPoints.set('user123', { id: 'points1', user_id: 'user123', points: 5 }); // Already have 5 from join
        mockParticipants.set('user123:challenge1', {
          id: 'part1',
          user_id: 'user123',
          challenge_id: 'challenge1',
          joined_at: Date.now()
        });

        const token = await createTestToken('user123', 'user@test.com', 'Test User');
        const req = new Request('http://localhost/api/v1/challenges/challenge1/submit', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            submission_text: 'I completed the challenge!'
          })
        });

        const res = await app.fetch(req, env);
        expect(res.status).toBe(200);

        // Verify points were awarded (5 from join + 10 from submit = 15)
        const userPoints = mockPoints.get('user123');
        expect(userPoints?.points).toBe(15);
      });

      it('should log challenge_submitted action in point_actions_log', async () => {
        mockPoints.set('user123', { id: 'points1', user_id: 'user123', points: 5 });
        mockParticipants.set('user123:challenge1', {
          id: 'part1',
          user_id: 'user123',
          challenge_id: 'challenge1',
          joined_at: Date.now()
        });

        const token = await createTestToken('user123', 'user@test.com', 'Test User');
        const req = new Request('http://localhost/api/v1/challenges/challenge1/submit', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            submission_text: 'I completed the challenge!'
          })
        });

        await app.fetch(req, env);

        // Verify action was logged
        const actionLogs = Array.from(mockPointActionsLog.values());
        const submitLog = actionLogs.find(log =>
          log.user_id === 'user123' &&
          log.action_type === 'challenge_submitted' &&
          log.reference_id === 'challenge1'
        );
        expect(submitLog).toBeDefined();
        expect(submitLog?.points_awarded).toBe(10);
      });

      it('should award 0 points for 4th submission in 24 hours (anti-abuse)', async () => {
        mockPoints.set('user123', { id: 'points1', user_id: 'user123', points: 35 }); // 5 + 30 from 3 submissions

        // Simulate 3 previous submissions in the last hour (use seconds, not milliseconds)
        const nowSeconds = Math.floor(Date.now() / 1000);
        for (let i = 0; i < 3; i++) {
          mockPointActionsLog.set(`sublog${i}`, {
            id: `sublog${i}`,
            user_id: 'user123',
            action_type: 'challenge_submitted',
            reference_id: `challenge${i}`,
            points_awarded: 10,
            created_at: nowSeconds - 100 // Recent (100 seconds ago)
          });
        }

        // Create a new challenge for the 4th submission
        mockChallenges.set('challenge4', {
          id: 'challenge4',
          title: 'Challenge 4',
          description: 'Desc',
          requirements: 'Req',
          created_by_user_id: 'admin123',
          point_reward: 100,
          deadline: Date.now() + 86400000,
          status: ChallengeStatus.Active,
          created_at: Date.now(),
          updated_at: Date.now()
        });

        // User has joined this challenge
        mockParticipants.set('user123:challenge4', {
          id: 'part4',
          user_id: 'user123',
          challenge_id: 'challenge4',
          joined_at: Date.now()
        });

        const token = await createTestToken('user123', 'user@test.com', 'Test User');
        const req = new Request('http://localhost/api/v1/challenges/challenge4/submit', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            submission_text: 'I completed challenge 4!'
          })
        });

        await app.fetch(req, env);

        // Verify no additional points were awarded (still 35)
        const userPoints = mockPoints.get('user123');
        expect(userPoints?.points).toBe(35);

        // Verify the action was logged with 0 points
        const actionLogs = Array.from(mockPointActionsLog.values());
        const fourthSubmitLog = actionLogs.find(log =>
          log.user_id === 'user123' &&
          log.action_type === 'challenge_submitted' &&
          log.reference_id === 'challenge4'
        );
        expect(fourthSubmitLog).toBeDefined();
        expect(fourthSubmitLog?.points_awarded).toBe(0);
      });
    });

    describe('Approval Points', () => {
      it('should still award challenge.point_reward on approval', async () => {
        mockPoints.set('user123', { id: 'points1', user_id: 'user123', points: 15 }); // 5 join + 10 submit

        // Add a test submission
        mockSubmissions.set('sub_points', {
          id: 'sub_points',
          user_id: 'user123',
          challenge_id: 'challenge1',
          submission_text: 'Done!',
          submission_url: null,
          status: SubmissionStatus.Pending,
          submitted_at: Date.now(),
          reviewed_at: null,
          reviewed_by_user_id: null,
          feedback: null
        });

        const token = await createTestToken('admin123', 'admin@test.com', 'Admin User', 'admin');
        const req = new Request('http://localhost/api/v1/submissions/sub_points/approve', {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const res = await app.fetch(req, env);
        expect(res.status).toBe(200);

        // Verify points were awarded (15 + 100 challenge reward = 115)
        const userPoints = mockPoints.get('user123');
        expect(userPoints?.points).toBe(115);
      });
    });
  });
});
