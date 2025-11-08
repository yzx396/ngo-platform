/**
 * Test Assertions Utilities
 *
 * Centralizes common response validation and error checking patterns.
 * Eliminates repeated expect() statements across test files.
 *
 * Usage:
 * ```typescript
 * const res = await app.fetch(req, env);
 * expectCreated(res, { expectedFields: ['id', 'email'] });
 * expectBadRequest(res, 'email is required');
 * ```
 */

import type { Match } from '../../../types/match';
import type { User } from '../../../types/user';
import type { MentorProfile } from '../../../types/mentor';

// ============================================================================
// HTTP Status Code Assertions
// ============================================================================

/**
 * Asserts that a response has 200 OK status
 */
export function expectOk(res: Response, message?: string): Promise<unknown> {
  expect(res.status).toBe(200, message);
  return res.json();
}

/**
 * Asserts that a response has 201 Created status
 */
export function expectCreated(res: Response, message?: string): Promise<unknown> {
  expect(res.status).toBe(201, message);
  return res.json();
}

/**
 * Asserts that a response has 400 Bad Request status
 */
export function expectBadRequest(
  res: Response,
  message?: string,
  expectedErrorText?: string
): Promise<unknown> {
  expect(res.status).toBe(400, message);
  return validateErrorResponse(res, 400, expectedErrorText);
}

/**
 * Asserts that a response has 401 Unauthorized status
 */
export function expectUnauthorized(res: Response, message?: string): Promise<unknown> {
  expect(res.status).toBe(401, message);
  return validateErrorResponse(res, 401);
}

/**
 * Asserts that a response has 403 Forbidden status
 */
export function expectForbidden(res: Response, message?: string): Promise<unknown> {
  expect(res.status).toBe(403, message);
  return validateErrorResponse(res, 403);
}

/**
 * Asserts that a response has 404 Not Found status
 */
export function expectNotFound(res: Response, message?: string): Promise<unknown> {
  expect(res.status).toBe(404, message);
  return validateErrorResponse(res, 404);
}

/**
 * Asserts that a response has 409 Conflict status
 */
export function expectConflict(res: Response, message?: string, expectedErrorText?: string): Promise<unknown> {
  expect(res.status).toBe(409, message);
  return validateErrorResponse(res, 409, expectedErrorText);
}

// ============================================================================
// Data Validation Assertions
// ============================================================================

/**
 * Validates that a response contains a user object with expected fields
 */
export async function expectUserResponse(res: Response, expectedUser?: Partial<User>): Promise<User> {
  const data = await res.json();
  expect(data).toHaveProperty('id');
  expect(typeof data.id).toBe('string');
  expect(data).toHaveProperty('email');
  expect(typeof data.email).toBe('string');
  expect(data).toHaveProperty('name');
  expect(typeof data.name).toBe('string');
  expect(data).toHaveProperty('created_at');
  expect(typeof data.created_at).toBe('number');
  expect(data).toHaveProperty('updated_at');
  expect(typeof data.updated_at).toBe('number');

  if (expectedUser) {
    if (expectedUser.email) expect(data.email).toBe(expectedUser.email);
    if (expectedUser.name) expect(data.name).toBe(expectedUser.name);
  }

  return data;
}

/**
 * Validates that a response contains a mentor profile with expected fields
 */
export async function expectMentorProfileResponse(
  res: Response,
  expectedProfile?: Partial<MentorProfile>
): Promise<MentorProfile> {
  const data = await res.json();
  expect(data).toHaveProperty('id');
  expect(typeof data.id).toBe('string');
  expect(data).toHaveProperty('user_id');
  expect(typeof data.user_id).toBe('string');
  expect(data).toHaveProperty('nick_name');
  expect(typeof data.nick_name).toBe('string');
  expect(data).toHaveProperty('bio');
  expect(typeof data.bio).toBe('string');
  expect(data).toHaveProperty('mentoring_levels');
  expect(typeof data.mentoring_levels).toBe('number');
  expect(data).toHaveProperty('payment_types');
  expect(typeof data.payment_types).toBe('number');
  expect(data).toHaveProperty('created_at');
  expect(typeof data.created_at).toBe('number');
  expect(data).toHaveProperty('updated_at');
  expect(typeof data.updated_at).toBe('number');

  if (expectedProfile) {
    if (expectedProfile.nick_name) expect(data.nick_name).toBe(expectedProfile.nick_name);
    if (expectedProfile.bio) expect(data.bio).toBe(expectedProfile.bio);
    if (expectedProfile.mentoring_levels) expect(data.mentoring_levels).toBe(expectedProfile.mentoring_levels);
    if (expectedProfile.payment_types) expect(data.payment_types).toBe(expectedProfile.payment_types);
  }

  return data;
}

/**
 * Validates that a response contains a match object with expected fields
 */
export async function expectMatchResponse(res: Response, expectedMatch?: Partial<Match>): Promise<Match> {
  const data = await res.json();
  expect(data).toHaveProperty('id');
  expect(typeof data.id).toBe('string');
  expect(data).toHaveProperty('mentor_id');
  expect(typeof data.mentor_id).toBe('string');
  expect(data).toHaveProperty('mentee_id');
  expect(typeof data.mentee_id).toBe('string');
  expect(data).toHaveProperty('status');
  expect(['pending', 'accepted', 'active', 'rejected', 'completed']).toContain(data.status);
  expect(data).toHaveProperty('created_at');
  expect(typeof data.created_at).toBe('number');
  expect(data).toHaveProperty('updated_at');
  expect(typeof data.updated_at).toBe('number');

  if (expectedMatch) {
    if (expectedMatch.status) expect(data.status).toBe(expectedMatch.status);
    if (expectedMatch.mentor_id) expect(data.mentor_id).toBe(expectedMatch.mentor_id);
    if (expectedMatch.mentee_id) expect(data.mentee_id).toBe(expectedMatch.mentee_id);
  }

  return data;
}

/**
 * Validates that a response contains an array of matches
 */
export async function expectMatchesListResponse(res: Response, expectedCount?: number): Promise<{ matches: Match[] }> {
  const data = await res.json();
  expect(data).toHaveProperty('matches');
  expect(Array.isArray(data.matches)).toBe(true);

  if (expectedCount !== undefined) {
    expect(data.matches).toHaveLength(expectedCount);
  }

  // Validate structure of each match
  data.matches.forEach((match: unknown) => {
    expect(match).toHaveProperty('id');
    expect(match).toHaveProperty('mentor_id');
    expect(match).toHaveProperty('mentee_id');
    expect(match).toHaveProperty('status');
    expect(match).toHaveProperty('created_at');
  });

  return data;
}

/**
 * Validates that a response contains success: true
 */
export async function expectSuccessResponse(res: Response): Promise<{ success: boolean }> {
  const data = await res.json();
  expect(data).toHaveProperty('success');
  expect(data.success).toBe(true);
  return data;
}

// ============================================================================
// Private Helper Functions
// ============================================================================

/**
 * Validates the structure of an error response
 */
async function validateErrorResponse(
  res: Response,
  expectedStatus: number,
  expectedErrorText?: string
): Promise<unknown> {
  const data = await res.json();
  expect(res.status).toBe(expectedStatus);
  expect(data).toHaveProperty('error');
  expect(typeof data.error).toBe('string');

  if (expectedErrorText) {
    expect(data.error.toLowerCase()).toContain(expectedErrorText.toLowerCase());
  }

  return data;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates that a user object has all required fields
 */
export function validateUser(user: unknown): void {
  expect(user).toBeDefined();
  expect(user).toHaveProperty('id');
  expect(user).toHaveProperty('email');
  expect(user).toHaveProperty('name');
  expect(user).toHaveProperty('created_at');
  expect(user).toHaveProperty('updated_at');
  const userObj = user as Record<string, unknown>;
  expect(typeof userObj.id).toBe('string');
  expect(typeof userObj.email).toBe('string');
  expect(typeof userObj.name).toBe('string');
  expect(typeof userObj.created_at).toBe('number');
  expect(typeof userObj.updated_at).toBe('number');
}

/**
 * Validates that a mentor profile object has all required fields
 */
export function validateMentorProfile(profile: unknown): void {
  expect(profile).toBeDefined();
  expect(profile).toHaveProperty('id');
  expect(profile).toHaveProperty('user_id');
  expect(profile).toHaveProperty('nick_name');
  expect(profile).toHaveProperty('bio');
  expect(profile).toHaveProperty('mentoring_levels');
  expect(profile).toHaveProperty('payment_types');
  expect(profile).toHaveProperty('created_at');
  expect(profile).toHaveProperty('updated_at');
  const profileObj = profile as Record<string, unknown>;
  expect(typeof profileObj.id).toBe('string');
  expect(typeof profileObj.user_id).toBe('string');
  expect(typeof profileObj.nick_name).toBe('string');
  expect(typeof profileObj.bio).toBe('string');
  expect(typeof profileObj.mentoring_levels).toBe('number');
  expect(typeof profileObj.payment_types).toBe('number');
  expect(typeof profileObj.created_at).toBe('number');
  expect(typeof profileObj.updated_at).toBe('number');
}

/**
 * Validates that a match object has all required fields
 */
export function validateMatch(match: unknown): void {
  expect(match).toBeDefined();
  expect(match).toHaveProperty('id');
  expect(match).toHaveProperty('mentor_id');
  expect(match).toHaveProperty('mentee_id');
  expect(match).toHaveProperty('status');
  expect(match).toHaveProperty('created_at');
  expect(match).toHaveProperty('updated_at');
  const matchObj = match as Record<string, unknown>;
  expect(typeof matchObj.id).toBe('string');
  expect(typeof matchObj.mentor_id).toBe('string');
  expect(typeof matchObj.mentee_id).toBe('string');
  expect(typeof matchObj.status).toBe('string');
  expect(typeof matchObj.created_at).toBe('number');
  expect(typeof matchObj.updated_at).toBe('number');
}

// ============================================================================
// JSON Structure Validation
// ============================================================================

/**
 * Validates that a response is valid JSON
 */
export async function expectValidJson(res: Response): Promise<unknown> {
  const text = await res.text();
  expect(() => JSON.parse(text)).not.toThrow();
  return JSON.parse(text);
}

/**
 * Validates that a response has the correct Content-Type header
 */
export function expectContentType(res: Response, expectedType: string): void {
  const contentType = res.headers.get('content-type');
  expect(contentType).toBeTruthy();
  expect(contentType).toContain(expectedType);
}

/**
 * Validates that a response has application/json content type
 */
export function expectJsonContentType(res: Response): void {
  expectContentType(res, 'application/json');
}

// ============================================================================
// Redirect and Cookie Assertions
// ============================================================================

/**
 * Validates that a response sets a cookie
 */
export function expectCookie(res: Response, cookieName: string): void {
  const setCookie = res.headers.get('set-cookie');
  expect(setCookie).toBeTruthy();
  expect(setCookie).toContain(cookieName);
}

/**
 * Validates that a response clears a cookie
 */
export function expectClearedCookie(res: Response, cookieName: string): void {
  const setCookie = res.headers.get('set-cookie');
  expect(setCookie).toBeTruthy();
  expect(setCookie).toContain(`${cookieName}=`);
  expect(setCookie).toContain('Max-Age=0');
}
