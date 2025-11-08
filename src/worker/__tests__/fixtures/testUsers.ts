/**
 * Test User Fixtures
 *
 * Pre-defined user objects for testing. Eliminates repeated user creation across test files.
 *
 * Usage:
 * ```typescript
 * import { testUsers } from '../fixtures/testUsers';
 *
 * const user = testUsers.regular;
 * ```
 */

import type { User } from '../../../types/user';

// ============================================================================
// Mock Environment Types
// ============================================================================

interface MockPreparedStatement {
  bind: () => MockPreparedStatement;
  getTable: (name: string) => MockTable;
}

interface MockTable {
  insert: (data: unknown) => void;
  data: unknown[];
}

interface MockDb {
  prepare: (sql: string) => MockPreparedStatement;
  _tables?: {
    users?: MockTable;
  };
}

interface MockEnv {
  platform_db: MockDb;
}

// ============================================================================
// Pre-defined Test Users
// ============================================================================

export const testUsers = {
  /**
   * A regular test user
   */
  regular: {
    id: 'user-regular-123',
    email: 'user@example.com',
    name: 'Regular User',
    created_at: 1000000000,
    updated_at: 1000000000,
  } as User,

  /**
   * A test admin user
   */
  admin: {
    id: 'user-admin-456',
    email: 'admin@example.com',
    name: 'Admin User',
    created_at: 1000000000,
    updated_at: 1000000000,
  } as User,

  /**
   * A test mentor user
   */
  mentor: {
    id: 'user-mentor-789',
    email: 'mentor@example.com',
    name: 'Test Mentor',
    created_at: 1000000000,
    updated_at: 1000000000,
  } as User,

  /**
   * A test mentee user
   */
  mentee: {
    id: 'user-mentee-101',
    email: 'mentee@example.com',
    name: 'Test Mentee',
    created_at: 1000000000,
    updated_at: 1000000000,
  } as User,

  /**
   * A test user with special characters in name
   */
  specialChars: {
    id: 'user-special-202',
    email: 'special@example.com',
    name: "O'Brien-Smith (José) 李明",
    created_at: 1000000000,
    updated_at: 1000000000,
  } as User,

  /**
   * A test user with a very long email
   */
  longEmail: {
    id: 'user-longemail-303',
    email: 'a'.repeat(100) + '@example.com',
    name: 'Long Email User',
    created_at: 1000000000,
    updated_at: 1000000000,
  } as User,

  /**
   * A test user with a very long name
   */
  longName: {
    id: 'user-longname-404',
    email: 'longname@example.com',
    name: 'A'.repeat(500),
    created_at: 1000000000,
    updated_at: 1000000000,
  } as User,

  /**
   * Multiple test users for complex scenarios
   */
  multiple: [
    {
      id: 'user-multiple-1',
      email: 'multi1@example.com',
      name: 'Multiple User 1',
      created_at: 1000000000,
      updated_at: 1000000000,
    } as User,
    {
      id: 'user-multiple-2',
      email: 'multi2@example.com',
      name: 'Multiple User 2',
      created_at: 1000000000,
      updated_at: 1000000000,
    } as User,
    {
      id: 'user-multiple-3',
      email: 'multi3@example.com',
      name: 'Multiple User 3',
      created_at: 1000000000,
      updated_at: 1000000000,
    } as User,
  ],
};

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a custom test user
 */
export function createUser(
  id: string,
  email: string,
  name: string,
  createdAt: number = Date.now(),
  updatedAt: number = Date.now()
): User {
  return {
    id,
    email,
    name,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

/**
 * Creates a user with randomized data
 */
export function createRandomUser(prefix: string = 'user'): User {
  const timestamp = Date.now();
  return {
    id: `${prefix}-${timestamp}`,
    email: `${prefix}${timestamp}@example.com`,
    name: `${prefix.charAt(0).toUpperCase()}${prefix.slice(1)} User`,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

/**
 * Creates a test user and adds it to the mock database
 */
export async function createTestUser(
  mockEnv: MockEnv,
  email: string,
  name: string,
  id: string = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
): Promise<User> {
  const user = createUser(id, email, name);
  const db = mockEnv.platform_db;

  // Add user to the mock database using the correct API
  // The mockDbFactory stores tables in _mockTables and uses Map-like methods
  if ('_mockTables' in db && db._mockTables) {
    const usersTable = db._mockTables.users || {};
    usersTable[id] = user;
    db._mockTables.users = usersTable;
  }

  return user;
}

/**
 * Creates a list of test users
 */
export function createUsers(count: number, prefix: string = 'user'): User[] {
  return Array.from({ length: count }, (_, i) => createRandomUser(`${prefix}-${i}`));
}

/**
 * Creates a set of users for a mentor-mentee scenario
 */
export function createMentorMenteePair(): { mentor: User; mentee: User } {
  return {
    mentor: createUser('mentor-123', 'mentor@example.com', 'Test Mentor'),
    mentee: createUser('mentee-456', 'mentee@example.com', 'Test Mentee'),
  };
}

/**
 * Creates a complete set of users for complex test scenarios
 */
export function createTestUserSet(): {
  admin: User;
  mentor1: User;
  mentor2: User;
  mentee1: User;
  mentee2: User;
  regular: User;
} {
  return {
    admin: createUser('admin-001', 'admin@example.com', 'Admin User'),
    mentor1: createUser('mentor-001', 'mentor1@example.com', 'Mentor One'),
    mentor2: createUser('mentor-002', 'mentor2@example.com', 'Mentor Two'),
    mentee1: createUser('mentee-001', 'mentee1@example.com', 'Mentee One'),
    mentee2: createUser('mentee-002', 'mentee2@example.com', 'Mentee Two'),
    regular: createUser('user-001', 'user@example.com', 'Regular User'),
  };
}
