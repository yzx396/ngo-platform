/**
 * React Test User Fixtures
 *
 * Pre-defined user objects for React component testing.
 * Similar to Worker fixtures but optimized for frontend.
 *
 * Usage:
 * ```typescript
 * import { userFixtures } from '../fixtures/users';
 *
 * render(<UserProfile user={userFixtures.authenticated} />);
 * ```
 */

import type { User } from '../../types/user';

// ============================================================================
// Pre-defined Test Users
// ============================================================================

export const userFixtures = {
  /**
   * An authenticated user
   */
  authenticated: {
    id: 'user-auth-123',
    email: 'authenticated@example.com',
    name: 'Authenticated User',
    created_at: 1000000000,
    updated_at: 1000000000,
  } as User,

  /**
   * A regular user
   */
  regular: {
    id: 'user-regular-456',
    email: 'user@example.com',
    name: 'Regular User',
    created_at: 1000000000,
    updated_at: 1000000000,
  } as User,

  /**
   * An admin user
   */
  admin: {
    id: 'user-admin-789',
    email: 'admin@example.com',
    name: 'Admin User',
    created_at: 1000000000,
    updated_at: 1000000000,
  } as User,

  /**
   * A mentor user
   */
  mentor: {
    id: 'user-mentor-101',
    email: 'mentor@example.com',
    name: 'Test Mentor',
    created_at: 1000000000,
    updated_at: 1000000000,
  } as User,

  /**
   * A mentee user
   */
  mentee: {
    id: 'user-mentee-202',
    email: 'mentee@example.com',
    name: 'Test Mentee',
    created_at: 1000000000,
    updated_at: 1000000000,
  } as User,

  /**
   * A user with special characters in name
   */
  specialChars: {
    id: 'user-special-303',
    email: 'special@example.com',
    name: "O'Brien-Smith (José) 李明",
    created_at: 1000000000,
    updated_at: 1000000000,
  } as User,

  /**
   * Multiple users for list testing
   */
  list: [
    {
      id: 'user-list-1',
      email: 'user1@example.com',
      name: 'User One',
      created_at: 1000000000,
      updated_at: 1000000000,
    } as User,
    {
      id: 'user-list-2',
      email: 'user2@example.com',
      name: 'User Two',
      created_at: 1000000001,
      updated_at: 1000000001,
    } as User,
    {
      id: 'user-list-3',
      email: 'user3@example.com',
      name: 'User Three',
      created_at: 1000000002,
      updated_at: 1000000002,
    } as User,
  ],
};

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a custom user for React tests
 */
export function createUser(overrides: Partial<User> = {}): User {
  const timestamp = Date.now();
  return {
    id: `user-${timestamp}`,
    email: `user${timestamp}@example.com`,
    name: `Test User ${timestamp}`,
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  };
}

/**
 * Creates a random authenticated user
 */
export function createAuthenticatedUser(): User {
  return createUser({
    id: 'user-authenticated',
    email: 'authenticated@example.com',
    name: 'Authenticated User',
  });
}

/**
 * Creates a random admin user
 */
export function createAdminUser(): User {
  return createUser({
    id: 'user-admin',
    email: 'admin@example.com',
    name: 'Admin User',
  });
}

/**
 * Creates a list of users
 */
export function createUsers(count: number): User[] {
  return Array.from({ length: count }, (_, i) => createUser({ id: `user-${i}` }));
}
