/**
 * Test Authentication Utilities
 *
 * Centralizes JWT token creation and authenticated request setup for tests.
 * Eliminates repeated createTestToken() functions across test files.
 *
 * Usage:
 * ```typescript
 * const token = createTestToken(user.id, user.email, user.name);
 * const req = createAuthenticatedRequest('/api/v1/users', token, { method: 'POST' });
 * const mockEnv = createTestEnv({ JWT_SECRET: 'test-secret' });
 * ```
 */

import type { AuthPayload } from '../../../types/user';
import type { D1Database } from '@cloudflare/workers-types';
import { createToken } from '../../auth/jwt';

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_TEST_JWT_SECRET = 'test-jwt-secret';
export const DEFAULT_GOOGLE_CLIENT_ID = 'test-client-id';
export const DEFAULT_GOOGLE_CLIENT_SECRET = 'test-client-secret';

// ============================================================================
// Token Creation
// ============================================================================

/**
 * Creates a JWT token for testing
 */
export async function createTestToken(
  userId: string,
  email: string,
  name: string,
  role?: string,
  jwtSecret: string = DEFAULT_TEST_JWT_SECRET
): Promise<string> {
  const payload: AuthPayload & { role?: string } = { userId, email, name, role };
  return createToken(payload as AuthPayload, jwtSecret);
}

/**
 * Creates a test user object
 */
export function createTestUser(
  id: string,
  email: string,
  name: string,
  createdAt: number = Date.now(),
  updatedAt: number = Date.now()
) {
  return {
    id,
    email,
    name,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

/**
 * Creates an admin test user
 */
export function createAdminTestUser(
  id: string,
  email: string,
  name: string,
  createdAt: number = Date.now(),
  updatedAt: number = Date.now()
) {
  return {
    ...createTestUser(id, email, name, createdAt, updatedAt),
    role: 'admin' as const,
  };
}

// ============================================================================
// Request Creation
// ============================================================================

/**
 * Creates an authenticated request
 */
export function createAuthenticatedRequest(
  url: string,
  token: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Request {
  const {
    method = 'GET',
    body,
    headers = {},
  } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...headers,
  };

  return new Request(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Creates an unauthenticated request
 */
export function createUnauthenticatedRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Request {
  const { method = 'GET', body, headers = {} } = options;

  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ============================================================================
// Environment Setup
// ============================================================================

export interface TestEnvConfig {
  platform_db?: D1Database;
  JWT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

export interface TestEnv extends Record<string, unknown> {
  platform_db: D1Database;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

/**
 * Creates a test environment with default values
 */
export function createTestEnv(config: TestEnvConfig = {}): TestEnv {
  return {
    platform_db: config.platform_db || {
      prepare: () => ({
        bind: () => ({
          all: async () => ({ results: [] }),
          first: async () => null,
          run: async () => ({ success: true, meta: { changes: 0 } }),
        }),
        all: async () => ({ results: [] }),
        first: async () => null,
        run: async () => ({ success: true, meta: { changes: 0 } }),
      }),
    } as unknown as D1Database,
    JWT_SECRET: config.JWT_SECRET || DEFAULT_TEST_JWT_SECRET,
    GOOGLE_CLIENT_ID: config.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: config.GOOGLE_CLIENT_SECRET || DEFAULT_GOOGLE_CLIENT_SECRET,
  } as TestEnv;
}

/**
 * Creates a test environment with a mock D1 database
 */
export function createTestEnvWithDb(platform_db: D1Database, config: Omit<TestEnvConfig, 'platform_db'> = {}): TestEnv {
  return createTestEnv({ ...config, platform_db });
}

// ============================================================================
// Helper Functions for Test Scenarios
// ============================================================================

/**
 * Sets up a complete test scenario with a user and authentication
 */
export async function setupAuthenticatedUser(
  db: D1Database,
  userId: string,
  email: string,
  name: string,
  jwtSecret: string = DEFAULT_TEST_JWT_SECRET
): Promise<{ user: ReturnType<typeof createTestUser>; token: string; env: TestEnv }> {
  const user = createTestUser(userId, email, name);
  const token = await createTestToken(userId, email, name, undefined, jwtSecret);
  const env = createTestEnvWithDb(db, { JWT_SECRET: jwtSecret });

  return { user, token, env };
}

/**
 * Sets up a complete test scenario with an admin user and authentication
 */
export async function setupAuthenticatedAdmin(
  db: D1Database,
  userId: string,
  email: string,
  name: string,
  jwtSecret: string = DEFAULT_TEST_JWT_SECRET
): Promise<{ user: ReturnType<typeof createAdminTestUser>; token: string; env: TestEnv }> {
  const user = createAdminTestUser(userId, email, name);
  const token = await createTestToken(userId, email, name, 'admin', jwtSecret);
  const env = createTestEnvWithDb(db, { JWT_SECRET: jwtSecret });

  return { user, token, env };
}

/**
 * Creates a pair of users (mentor and mentee) for testing
 */
export async function setupMentorMenteeScenario(
  db: D1Database,
  mentorId: string,
  mentorEmail: string,
  mentorName: string,
  menteeId: string,
  menteeEmail: string,
  menteeName: string,
  jwtSecret: string = DEFAULT_TEST_JWT_SECRET
): Promise<{
  mentor: ReturnType<typeof createTestUser>;
  mentee: ReturnType<typeof createTestUser>;
  mentorToken: string;
  menteeToken: string;
  env: TestEnv;
}> {
  const mentor = createTestUser(mentorId, mentorEmail, mentorName);
  const mentee = createTestUser(menteeId, menteeEmail, menteeName);
  const mentorToken = await createTestToken(mentorId, mentorEmail, mentorName, undefined, jwtSecret);
  const menteeToken = await createTestToken(menteeId, menteeEmail, menteeName, undefined, jwtSecret);
  const env = createTestEnvWithDb(db, { JWT_SECRET: jwtSecret });

  return { mentor, mentee, mentorToken, menteeToken, env };
}

// ============================================================================
// Token Verification Helpers
// ============================================================================

/**
 * Extracts the token from an Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/);
  return match ? match[1] : null;
}

/**
 * Checks if a request has authentication
 */
export function isAuthenticated(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  return authHeader !== null && authHeader.startsWith('Bearer ');
}
