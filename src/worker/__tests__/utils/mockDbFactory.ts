/**
 * Centralized Mock D1 Database Factory
 *
 * This factory creates mock D1 database instances for testing.
 * It eliminates the need to write 100-150 lines of mock setup in each test file.
 *
 * Usage:
 * ```typescript
 * const mockDb = createMockDb({
 *   tables: {
 *     users: {
 *       'user-1': { id: 'user-1', email: 'test@example.com', ... }
 *     },
 *     mentor_profiles: {
 *       'profile-1': { id: 'profile-1', user_id: 'user-1', ... }
 *     }
 *   }
 * });
 *
 * const mockEnv = { platform_db: mockDb as unknown } as Env;
 * ```
 */

import { vi } from 'vitest';

// ============================================================================
// Types
// ============================================================================

export interface MockTable {
  [id: string]: Record<string, unknown>;
}

export interface MockDbConfig {
  tables: {
    users?: MockTable;
    mentor_profiles?: MockTable;
    matches?: MockTable;
    posts?: MockTable;
    post_likes?: MockTable;
    post_comments?: MockTable;
    user_roles?: MockTable;
    user_points?: MockTable;
    [key: string]: MockTable | undefined;
  };
}

/**
 * Represents a mock D1 database instance with helper methods
 */
export interface MockDb {
  prepare: ReturnType<typeof vi.fn>;
  _mockTables: Record<string, MockTable>;
  _getTable: (tableName: string) => MockTable;
  _setTableData: (tableName: string, data: MockTable) => void;
}

// ============================================================================
// Core Factory Function
// ============================================================================

/**
 * Creates a mock D1 database for testing
 */
export function createMockDb(config: MockDbConfig): MockDb {
  // Create internal storage for all tables
  const mockTables: Record<string, MockTable> = {};

  // Initialize all requested tables
  for (const [tableName, data] of Object.entries(config.tables)) {
    mockTables[tableName] = { ...(data || {}) };
  }

  /**
   * Get a table by name, creating it if it doesn't exist
   */
  const getTable = (tableName: string): MockTable => {
    if (!mockTables[tableName]) {
      mockTables[tableName] = {};
    }
    return mockTables[tableName];
  };

  /**
   * Set or replace table data
   */
  const setTableData = (tableName: string, data: MockTable) => {
    mockTables[tableName] = { ...data };
  };

  const mockDb = {
    prepare: vi.fn((query: string) => ({
      bind: vi.fn((...params: unknown[]) => ({
        all: createAllHandler(query, params, mockTables, getTable),
        first: createFirstHandler(query, params, mockTables, getTable),
        run: createRunHandler(query, params, mockTables, getTable),
      })),
      // Direct methods on prepared statement (not recommended but supported)
      all: async () => ({ results: [] }),
      first: async () => null,
      run: async () => ({ success: true, meta: { changes: 0 } }),
    })),

    _mockTables: mockTables,
    _getTable: getTable,
    _setTableData: setTableData,
  } as unknown as MockDb;

  return mockDb;
}

// ============================================================================
// Query Handlers
// ============================================================================

function createAllHandler(
  query: string,
  params: unknown[],
  mockTables: Record<string, MockTable>,
  getTable: (name: string) => MockTable
) {
  return vi.fn(async () => {
    // ========================================================================
    // USERS TABLE
    // ========================================================================
    if (query.includes('SELECT') && query.includes('users') && query.includes('WHERE id = ?')) {
      const userId = params[0];
      const user = getTable('users')[userId as string];
      return { results: user ? [user] : [] };
    }

    if (query.includes('SELECT') && query.includes('users') && query.includes('WHERE email = ?')) {
      const email = params[0];
      const table = getTable('users');
      for (const [, user] of Object.entries(table)) {
        if (user.email === email) {
          return { results: [user] };
        }
      }
      return { results: [] };
    }

    // ========================================================================
    // MENTOR PROFILES TABLE
    // ========================================================================
    if (query.includes('SELECT') && query.includes('mentor_profiles') && query.includes('WHERE id = ?')) {
      const profileId = params[0];
      const profile = getTable('mentor_profiles')[profileId as string];
      return { results: profile ? [profile] : [] };
    }

    if (query.includes('SELECT') && query.includes('mentor_profiles') && query.includes('WHERE user_id = ?')) {
      const userId = params[0];
      const table = getTable('mentor_profiles');
      for (const [, profile] of Object.entries(table)) {
        if (profile.user_id === userId) {
          return { results: [profile] };
        }
      }
      return { results: [] };
    }

    if (query.includes('SELECT') && query.includes('mentor_profiles') && query.includes('WHERE nick_name = ?')) {
      const nickname = params[0];
      const table = getTable('mentor_profiles');
      for (const [, profile] of Object.entries(table)) {
        if (profile.nick_name === nickname) {
          return { results: [profile] };
        }
      }
      return { results: [] };
    }

    // ========================================================================
    // MATCHES TABLE
    // ========================================================================
    if (query.includes('SELECT') && query.includes('matches') && query.includes('WHERE')) {
      const table = getTable('matches');
      let results = Object.values(table);
      let paramIndex = 0;

      // Handle OR condition (mentor OR mentee filter)
      if (query.includes('(matches.mentor_id = ? OR matches.mentee_id = ?)')) {
        const userId = params[paramIndex++];
        results = results.filter(
          m => m.mentor_id === userId || m.mentee_id === userId
        );
        paramIndex++; // Skip the second parameter in the OR

        // Check for role filter
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

      // Add user names and contact info for all matches
      const usersTable = getTable('users');
      const mentorProfilesTable = getTable('mentor_profiles');
      results = results.map(match => {
        const mentorUser = usersTable[match.mentor_id as string];
        const menteeUser = usersTable[match.mentee_id as string];
        const mentorProfile = Object.values(mentorProfilesTable).find(
          (p: unknown) => (p as Record<string, unknown>).user_id === match.mentor_id
        );

        const result: Record<string, unknown> = {
          ...match,
          mentor_name: mentorUser?.name,
          mentee_name: menteeUser?.name,
        };

        // Include email addresses and LinkedIn URL only for active/completed matches
        if (['active', 'completed'].includes(match.status as string)) {
          result.mentor_email = mentorUser?.email;
          result.mentee_email = menteeUser?.email;
          result.mentor_linkedin_url = (mentorProfile as Record<string, unknown>)?.linkedin_url || null;
        }

        return result;
      });

      return { results };
    }

    if (
      query.includes('SELECT') &&
      query.includes('matches') &&
      query.includes('WHERE id = ?')
    ) {
      const matchId = params[0];
      const match = getTable('matches')[matchId as string];
      return { results: match ? [match] : [] };
    }

    // ========================================================================
    // POSTS TABLE
    // ========================================================================
    if (query.includes('SELECT *') && query.includes('FROM posts') && !query.includes('COUNT')) {
      let posts = Object.values(getTable('posts'));
      let paramIndex = 0;

      if (query.includes('WHERE post_type = ?')) {
        const postType = params[paramIndex++];
        posts = posts.filter(p => p.post_type === postType);
      }

      // Sort by created_at DESC (newest first)
      posts = posts.sort((a, b) => (b.created_at as number) - (a.created_at as number));

      // Handle LIMIT and OFFSET
      if (query.includes('LIMIT ? OFFSET ?')) {
        const limit = params[paramIndex];
        const offset = params[paramIndex + 1];
        posts = posts.slice(offset as number, (offset as number) + (limit as number));
      }

      return { results: posts };
    }

    if (query.includes('SELECT COUNT') && query.includes('FROM posts')) {
      let posts = Object.values(getTable('posts'));
      if (query.includes('WHERE post_type = ?')) {
        const postType = params[0];
        posts = posts.filter(p => p.post_type === postType);
      }
      return { results: [{ count: posts.length }] };
    }

    // ========================================================================
    // POST LIKES TABLE
    // ========================================================================
    if (query.includes('SELECT') && query.includes('post_likes') && query.includes('WHERE post_id = ?')) {
      const postId = params[0];
      const table = getTable('post_likes');
      const likes = Object.values(table).filter(like => like.post_id === postId);
      return { results: likes };
    }

    if (
      query.includes('SELECT') &&
      query.includes('post_likes') &&
      query.includes('WHERE post_id = ?') &&
      query.includes('AND user_id = ?')
    ) {
      const postId = params[0];
      const userId = params[1];
      const table = getTable('post_likes');
      const likeKey = `${postId}:${userId}`;
      const like = table[likeKey];
      return { results: like ? [like] : [] };
    }

    // ========================================================================
    // POST COMMENTS TABLE
    // ========================================================================
    if (
      query.includes('SELECT') &&
      query.includes('post_comments') &&
      (query.includes('WHERE post_id = ?') || query.includes('WHERE pc.post_id = ?')) &&
      !query.includes('COUNT')
    ) {
      const postId = params[0];
      let comments = Object.values(getTable('post_comments')).filter(
        c => c.post_id === postId
      );

      // Handle JOIN with users table
      if (query.includes('JOIN users')) {
        const usersTable = getTable('users');
        comments = comments.map(c => {
          const user = usersTable[c.user_id as string];
          return { ...c, author_name: user?.name, author_email: user?.email };
        });
      }

      // Sort by created_at
      comments = comments.sort((a, b) => (a.created_at as number) - (b.created_at as number));

      // Handle LIMIT and OFFSET
      if (query.includes('LIMIT')) {
        const limitMatch = query.match(/LIMIT\s+\?\s+OFFSET\s+\?/);
        if (limitMatch && params.length >= 2) {
          const limit = params[params.length - 2];
          const offset = params[params.length - 1];
          comments = comments.slice(offset as number, (offset as number) + (limit as number));
        }
      }

      return { results: comments };
    }

    if (query.includes('SELECT COUNT') && query.includes('post_comments')) {
      const postId = params[0];
      const count = Object.values(getTable('post_comments')).filter(
        c => c.post_id === postId
      ).length;
      return { results: [{ count }] };
    }

    if (query.includes('SELECT') && query.includes('post_comments') && query.includes('WHERE id = ?')) {
      const commentId = params[0];
      const table = getTable('post_comments');
      const comment = table[commentId as string];
      const result = comment ? { ...comment } : null;

      if (result && query.includes('JOIN users')) {
        const user = getTable('users')[comment?.user_id as string];
        return { results: [{ ...result, author_name: user?.name, author_email: user?.email }] };
      }
      return { results: comment ? [comment] : [] };
    }

    // ========================================================================
    // USER ROLES TABLE
    // ========================================================================
    if (query.includes('SELECT') && query.includes('user_roles') && query.includes('WHERE user_id = ?')) {
      const userId = params[0];
      const role = getTable('user_roles')[userId as string];
      return { results: role ? [role] : [] };
    }

    // ========================================================================
    // DEFAULT FALLBACK
    // ========================================================================
    return { results: [] };
  });
}

function createFirstHandler(
  query: string,
  params: unknown[],
  mockTables: Record<string, MockTable>,
  getTable: (name: string) => MockTable
) {
  return vi.fn(async () => {
    // ========================================================================
    // USERS TABLE
    // ========================================================================
    if (query.includes('SELECT') && query.includes('users') && query.includes('WHERE id = ?')) {
      const userId = params[0];
      return getTable('users')[userId as string] || null;
    }

    if (query.includes('SELECT') && query.includes('users') && query.includes('WHERE email = ?')) {
      const email = params[0];
      const table = getTable('users');
      for (const user of Object.values(table)) {
        if (user.email === email) {
          return user;
        }
      }
      return null;
    }

    // ========================================================================
    // MENTOR PROFILES TABLE
    // ========================================================================
    if (query.includes('SELECT') && query.includes('mentor_profiles') && query.includes('WHERE id = ?')) {
      const profileId = params[0];
      return getTable('mentor_profiles')[profileId as string] || null;
    }

    if (query.includes('SELECT') && query.includes('mentor_profiles') && query.includes('WHERE user_id = ?')) {
      const userId = params[0];
      const table = getTable('mentor_profiles');
      for (const [, profile] of Object.entries(table)) {
        if (profile.user_id === userId) {
          return profile;
        }
      }
      return null;
    }

    if (query.includes('SELECT') && query.includes('mentor_profiles') && query.includes('WHERE nick_name = ?')) {
      const nickname = params[0];
      const table = getTable('mentor_profiles');
      for (const [, profile] of Object.entries(table)) {
        if (profile.nick_name === nickname) {
          return profile;
        }
      }
      return null;
    }

    // ========================================================================
    // MATCHES TABLE
    // ========================================================================
    if (query.includes('SELECT') && query.includes('matches') && query.includes('WHERE id = ?')) {
      const matchId = params[0];
      return getTable('matches')[matchId as string] || null;
    }

    if (
      query.includes('SELECT') &&
      query.includes('matches') &&
      query.includes('mentor_id') &&
      query.includes('mentee_id')
    ) {
      const mentorId = params[0];
      const menteeId = params[1];
      const table = getTable('matches');
      for (const [, match] of Object.entries(table)) {
        if (match.mentor_id === mentorId && match.mentee_id === menteeId) {
          return match;
        }
      }
      return null;
    }

    // ========================================================================
    // POSTS TABLE
    // ========================================================================
    if (query.includes('SELECT') && query.includes('posts') && query.includes('WHERE id = ?')) {
      const postId = params[0];
      return getTable('posts')[postId as string] || null;
    }

    // ========================================================================
    // POST COMMENTS TABLE
    // ========================================================================
    if (query.includes('SELECT') && query.includes('post_comments') && query.includes('WHERE id = ?')) {
      const commentId = params[0];
      const table = getTable('post_comments');
      const comment = table[commentId as string];
      const result = comment ? { ...comment } : null;

      if (result && query.includes('JOIN users')) {
        const user = getTable('users')[comment?.user_id as string];
        return { ...result, author_name: user?.name, author_email: user?.email };
      }
      return result;
    }

    // ========================================================================
    // USER ROLES TABLE
    // ========================================================================
    if (query.includes('SELECT') && query.includes('user_roles') && query.includes('WHERE user_id = ?')) {
      const userId = params[0];
      return getTable('user_roles')[userId as string] || null;
    }

    // ========================================================================
    // DEFAULT FALLBACK
    // ========================================================================
    return null;
  });
}

function createRunHandler(
  query: string,
  params: unknown[],
  mockTables: Record<string, MockTable>,
  getTable: (name: string) => MockTable
) {
  return vi.fn(async () => {
    // ========================================================================
    // USERS TABLE
    // ========================================================================
    if (query.includes('INSERT INTO users')) {
      const [id, email, name, created_at, updated_at] = params;
      const table = getTable('users');
      table[id as string] = { id, email, name, created_at, updated_at };
      return { success: true, meta: { changes: 1 } };
    }

    if (query.includes('UPDATE users')) {
      const id = params[params.length - 1] as string;
      const table = getTable('users');
      const existing = table[id];
      if (existing) {
        const updated = { ...existing };

        // Parse the SET clause to determine which fields are being updated
        let paramIndex = 0;

        if (query.includes('name =')) {
          updated.name = params[paramIndex++];
        }
        if (query.includes('email =') && !query.includes('name =')) {
          updated.email = params[paramIndex++];
        } else if (query.includes('email =')) {
          updated.email = params[paramIndex++];
        }

        updated.updated_at = params[params.length - 2];
        table[id] = updated;
        return { success: true, meta: { changes: 1 } };
      }
      return { success: true, meta: { changes: 0 } };
    }

    // ========================================================================
    // MENTOR PROFILES TABLE
    // ========================================================================
    if (query.includes('INSERT INTO mentor_profiles')) {
      const [
        id,
        user_id,
        nick_name,
        bio,
        mentoring_levels,
        availability,
        hourly_rate,
        payment_types,
        expertise_domains,
        expertise_topics_preset,
        expertise_topics_custom,
        allow_reviews,
        allow_recording,
        linkedin_url,
        created_at,
        updated_at,
      ] = params;

      const profile = {
        id,
        user_id,
        nick_name,
        bio,
        mentoring_levels,
        availability,
        hourly_rate,
        payment_types,
        expertise_domains,
        expertise_topics_preset,
        expertise_topics_custom,
        allow_reviews,
        allow_recording,
        linkedin_url,
        created_at,
        updated_at,
      };

      getTable('mentor_profiles')[id as string] = profile;
      return { success: true, meta: { changes: 1 } };
    }

    if (query.includes('UPDATE mentor_profiles')) {
      const id = params[params.length - 1] as string;
      const table = getTable('mentor_profiles');

      // Try to find profile by id first
      let profile = table[id];

      // If not found by id, try to find by user_id (fallback)
      if (!profile) {
        for (const [, p] of Object.entries(table)) {
          if (p.user_id === id) {
            profile = p;
            break;
          }
        }
      }

      if (profile) {
        const updated = { ...profile };

        // Parse SET clause to determine parameter order
        const setClauseMatch = query.match(/SET\s+(.+?)\s+WHERE/i);
        if (setClauseMatch && setClauseMatch[1]) {
          const setClause = setClauseMatch[1];
          const fields = setClause.split(',').map(f => f.trim().split('=')[0].trim());
          let paramIndex = 0;

          for (const field of fields) {
            if (field === 'nick_name') updated.nick_name = params[paramIndex++];
            else if (field === 'bio') updated.bio = params[paramIndex++];
            else if (field === 'mentoring_levels') updated.mentoring_levels = params[paramIndex++];
            else if (field === 'availability') updated.availability = params[paramIndex++];
            else if (field === 'hourly_rate') updated.hourly_rate = params[paramIndex++];
            else if (field === 'payment_types') updated.payment_types = params[paramIndex++];
            else if (field === 'expertise_domains') updated.expertise_domains = params[paramIndex++];
            else if (field === 'expertise_topics_preset') updated.expertise_topics_preset = params[paramIndex++];
            else if (field === 'expertise_topics_custom') updated.expertise_topics_custom = params[paramIndex++];
            else if (field === 'allow_reviews') updated.allow_reviews = Boolean(params[paramIndex++]);
            else if (field === 'allow_recording') updated.allow_recording = Boolean(params[paramIndex++]);
            else if (field === 'linkedin_url') updated.linkedin_url = params[paramIndex++];
            else if (field === 'updated_at') updated.updated_at = params[paramIndex++];
            else paramIndex++; // Unknown field, skip parameter
          }
        }

        table[profile.id as string] = updated;
        return { success: true, meta: { changes: 1 } };
      }
      return { success: true, meta: { changes: 0 } };
    }

    if (query.includes('DELETE FROM mentor_profiles')) {
      const id = params[0];
      const table = getTable('mentor_profiles');
      if (id as string in table) {
        delete table[id as string];
        return { success: true, meta: { changes: 1 } };
      }
      return { success: true, meta: { changes: 0 } };
    }

    // ========================================================================
    // MATCHES TABLE
    // ========================================================================
    if (query.includes('INSERT INTO matches')) {
      const [id, mentor_id, mentee_id, status, introduction, preferred_time, cv_included, created_at, updated_at] =
        params;
      const table = getTable('matches');
      table[id as string] = {
        id,
        mentor_id,
        mentee_id,
        status,
        introduction,
        preferred_time,
        cv_included,
        created_at,
        updated_at,
      };
      return { success: true, meta: { changes: 1 } };
    }

    if (query.includes('UPDATE matches')) {
      const id = params[params.length - 1] as string;
      const table = getTable('matches');
      const existing = table[id];

      if (existing) {
        const updated = { ...existing };
        let paramIndex = 0;

        if (query.includes('status = ?')) {
          updated.status = params[paramIndex++];
        }
        if (query.includes('responded_at = ?')) {
          updated.responded_at = params[paramIndex++];
        }
        if (query.includes('completed_at = ?')) {
          updated.completed_at = params[paramIndex++];
        }

        updated.updated_at = params[params.length - 2];
        table[id] = updated;
        return { success: true, meta: { changes: 1 } };
      }
      return { success: true, meta: { changes: 0 } };
    }

    if (query.includes('DELETE FROM matches')) {
      const id = params[0];
      const table = getTable('matches');
      if (id as string in table) {
        delete table[id as string];
        return { success: true, meta: { changes: 1 } };
      }
      return { success: true, meta: { changes: 0 } };
    }

    // ========================================================================
    // POSTS TABLE
    // ========================================================================
    if (query.includes('INSERT INTO posts')) {
      const [id, user_id, post_type, content, created_at, updated_at] = params;
      const table = getTable('posts');
      table[id as string] = {
        id,
        user_id,
        post_type,
        content,
        created_at,
        updated_at,
      };
      return { success: true, meta: { changes: 1 } };
    }

    if (query.includes('UPDATE posts')) {
      const id = params[params.length - 1] as string;
      const table = getTable('posts');
      const existing = table[id];

      if (existing) {
        const updated = { ...existing };
        let paramIndex = 0;

        if (query.includes('content = ?')) {
          updated.content = params[paramIndex++];
        }
        if (query.includes('post_type = ?')) {
          updated.post_type = params[paramIndex++];
        }

        updated.updated_at = params[params.length - 2];
        table[id] = updated;
        return { success: true, meta: { changes: 1 } };
      }
      return { success: true, meta: { changes: 0 } };
    }

    if (query.includes('DELETE FROM posts')) {
      const id = params[0];
      const table = getTable('posts');
      if (id as string in table) {
        delete table[id as string];
        return { success: true, meta: { changes: 1 } };
      }
      return { success: true, meta: { changes: 0 } };
    }

    // ========================================================================
    // POST LIKES TABLE
    // ========================================================================
    if (query.includes('INSERT INTO post_likes')) {
      const [id, post_id, user_id, created_at] = params;
      const table = getTable('post_likes');
      const likeKey = `${post_id}:${user_id}`;
      table[likeKey] = { id, post_id, user_id, created_at };
      return { success: true, meta: { changes: 1 } };
    }

    if (query.includes('DELETE FROM post_likes')) {
      const postId = params[0];
      const userId = params[1];
      const table = getTable('post_likes');
      const likeKey = `${postId}:${userId}`;
      if (likeKey in table) {
        delete table[likeKey];
        return { success: true, meta: { changes: 1 } };
      }
      return { success: true, meta: { changes: 0 } };
    }

    // ========================================================================
    // POST COMMENTS TABLE
    // ========================================================================
    if (query.includes('INSERT INTO post_comments')) {
      const [id, post_id, user_id, content, created_at, updated_at] = params;
      const table = getTable('post_comments');
      table[id as string] = {
        id,
        post_id,
        user_id,
        content,
        created_at,
        updated_at,
      };
      return { success: true, meta: { changes: 1 } };
    }

    if (query.includes('UPDATE post_comments')) {
      const id = params[params.length - 1] as string;
      const table = getTable('post_comments');
      const existing = table[id];

      if (existing) {
        const updated = { ...existing };
        let paramIndex = 0;

        if (query.includes('content = ?')) {
          updated.content = params[paramIndex++];
        }

        updated.updated_at = params[params.length - 2];
        table[id] = updated;
        return { success: true, meta: { changes: 1 } };
      }
      return { success: true, meta: { changes: 0 } };
    }

    if (query.includes('DELETE FROM post_comments')) {
      const id = params[0];
      const table = getTable('post_comments');
      if (id as string in table) {
        delete table[id as string];
        return { success: true, meta: { changes: 1 } };
      }
      return { success: true, meta: { changes: 0 } };
    }

    // ========================================================================
    // USER ROLES TABLE
    // ========================================================================
    if (query.includes('INSERT INTO user_roles')) {
      const [id, user_id, role, created_at] = params;
      const table = getTable('user_roles');
      table[user_id as string] = { id, user_id, role, created_at };
      return { success: true, meta: { changes: 1 } };
    }

    if (query.includes('UPDATE user_roles')) {
      const userId = params[params.length - 2] as string;
      const role = params[0] as string;
      const table = getTable('user_roles');
      const existing = table[userId];
      if (existing) {
        table[userId] = { ...existing, role };
        return { success: true, meta: { changes: 1 } };
      }
      return { success: true, meta: { changes: 0 } };
    }

    if (query.includes('DELETE FROM user_roles')) {
      const userId = params[0];
      const table = getTable('user_roles');
      if (userId as string in table) {
        delete table[userId as string];
        return { success: true, meta: { changes: 1 } };
      }
      return { success: true, meta: { changes: 0 } };
    }

    // ========================================================================
    // DEFAULT FALLBACK
    // ========================================================================
    return { success: true, meta: { changes: 0 } };
  });
}
