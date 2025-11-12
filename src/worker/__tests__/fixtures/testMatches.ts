/**
 * Test Match Fixtures
 *
 * Pre-defined match objects for testing. Eliminates repeated match creation across test files.
 *
 * Usage:
 * ```typescript
 * import { testMatches } from '../fixtures/testMatches';
 *
 * const match = testMatches.pending;
 * ```
 */

import type { Match } from '../../../types/match';

// ============================================================================
// Pre-defined Test Matches
// ============================================================================

export const testMatches = {
  /**
   * A pending match request
   */
  pending: {
    id: 'match-pending-1',
    mentor_id: 'user-mentor-789',
    mentee_id: 'user-mentee-101',
    status: 'pending',
    introduction: 'I am a software engineer looking for mentorship in system design.',
    preferred_time: 'Weekends, preferably Saturday afternoons',
    cv_included: 1,
    created_at: 1000000000,
    updated_at: 1000000000,
  } as Match,

  /**
   * An active match (accepted)
   */
  active: {
    id: 'match-active-1',
    mentor_id: 'user-mentor-789',
    mentee_id: 'user-mentee-101',
    status: 'active',
    introduction: 'Looking for guidance on career development',
    preferred_time: 'Flexible schedule',
    cv_included: 1,
    created_at: 1000000000,
    updated_at: 1000000001,
  } as Match,

  /**
   * A completed match
   */
  completed: {
    id: 'match-completed-1',
    mentor_id: 'user-mentor-789',
    mentee_id: 'user-mentee-101',
    status: 'completed',
    introduction: 'Interested in learning from experienced mentor',
    preferred_time: 'Weekday evenings',
    cv_included: 1,
    created_at: 1000000000,
    updated_at: 1000000002,
  } as Match,

  /**
   * A rejected match
   */
  rejected: {
    id: 'match-rejected-1',
    mentor_id: 'user-mentor-789',
    mentee_id: 'user-mentee-101',
    status: 'rejected',
    introduction: 'Test introduction for rejection',
    preferred_time: 'Weekend mornings',
    cv_included: 1,
    created_at: 1000000000,
    updated_at: 1000000001,
  } as Match,

  /**
   * A match with CV included
   * @deprecated CV is now mandatory for all matches. This fixture is kept for backward compatibility.
   */
  withCv: {
    id: 'match-with-cv-1',
    mentor_id: 'user-mentor-789',
    mentee_id: 'user-mentee-101',
    status: 'pending',
    introduction: 'I have attached my CV for review',
    preferred_time: 'Any time works',
    cv_included: 1,
    created_at: 1000000000,
    updated_at: 1000000000,
  } as Match,

  /**
   * A match for testing get by ID
   */
  getTest: {
    id: 'match-get-test-1',
    mentor_id: 'user-mentor-789',
    mentee_id: 'user-mentee-101',
    status: 'pending',
    introduction: 'Lifecycle integration test introduction',
    preferred_time: 'Any time works',
    cv_included: 1,
    created_at: 1000000000,
    updated_at: 1000000000,
  } as Match,

  /**
   * A match for testing updates
   */
  updateTest: {
    id: 'match-update-test-1',
    mentor_id: 'user-mentor-789',
    mentee_id: 'user-mentee-101',
    status: 'pending',
    introduction: 'Original introduction',
    preferred_time: 'Original time',
    cv_included: 1,
    created_at: 1000000000,
    updated_at: 1000000000,
  } as Match,

  /**
   * A match for testing deletion
   */
  deleteTest: {
    id: 'match-delete-test-1',
    mentor_id: 'user-mentor-789',
    mentee_id: 'user-mentee-101',
    status: 'pending',
    introduction: 'Test introduction for deletion',
    preferred_time: 'Morning sessions',
    cv_included: 1,
    created_at: 1000000000,
    updated_at: 1000000000,
  } as Match,

  /**
   * A match for testing duplicate prevention
   */
  duplicateTest: {
    id: 'match-duplicate-test-1',
    mentor_id: 'user-mentor-789',
    mentee_id: 'user-mentee-101',
    status: 'pending',
    introduction: 'First attempt',
    preferred_time: 'Weekends',
    cv_included: 1,
    created_at: 1000000000,
    updated_at: 1000000000,
  } as Match,

  /**
   * Multiple matches for list testing
   */
  multiple: [
    {
      id: 'match-multi-1',
      mentor_id: 'mentor-1',
      mentee_id: 'mentee-1',
      status: 'pending',
      introduction: 'First match',
      preferred_time: 'Morning',
      cv_included: 1,
      created_at: 1000000000,
      updated_at: 1000000000,
    } as Match,
    {
      id: 'match-multi-2',
      mentor_id: 'mentor-1',
      mentee_id: 'mentee-2',
      status: 'active',
      introduction: 'Second match',
      preferred_time: 'Afternoon',
      cv_included: 1,
      created_at: 1000000001,
      updated_at: 1000000001,
    } as Match,
    {
      id: 'match-multi-3',
      mentor_id: 'mentor-2',
      mentee_id: 'mentee-1',
      status: 'completed',
      introduction: 'Third match',
      preferred_time: 'Evening',
      cv_included: 1,
      created_at: 1000000002,
      updated_at: 1000000002,
    } as Match,
  ],
};

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a custom match
 */
export function createMatch(
  id: string,
  mentorId: string,
  menteeId: string,
  status: 'pending' | 'accepted' | 'active' | 'rejected' | 'completed',
  introduction: string,
  preferredTime: string,
  options: {
    cvIncluded?: number;
    createdAt?: number;
    updatedAt?: number;
  } = {}
): Match {
  const {
    cvIncluded = 1,  // CV is now mandatory for all matches
    createdAt = Date.now(),
    updatedAt = createdAt,
  } = options;

  return {
    id,
    mentor_id: mentorId,
    mentee_id: menteeId,
    status,
    introduction,
    preferred_time: preferredTime,
    cv_included: cvIncluded,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

/**
 * Creates a pending match
 */
export function createPendingMatch(
  id: string,
  mentorId: string,
  menteeId: string,
  introduction: string,
  preferredTime: string
): Match {
  return createMatch(id, mentorId, menteeId, 'pending', introduction, preferredTime);
}

/**
 * Creates an active match
 */
export function createActiveMatch(
  id: string,
  mentorId: string,
  menteeId: string,
  introduction: string,
  preferredTime: string
): Match {
  return createMatch(id, mentorId, menteeId, 'active', introduction, preferredTime);
}

/**
 * Creates a completed match
 */
export function createCompletedMatch(
  id: string,
  mentorId: string,
  menteeId: string,
  introduction: string,
  preferredTime: string
): Match {
  return createMatch(id, mentorId, menteeId, 'completed', introduction, preferredTime);
}

/**
 * Creates a rejected match
 */
export function createRejectedMatch(
  id: string,
  mentorId: string,
  menteeId: string,
  introduction: string,
  preferredTime: string
): Match {
  return createMatch(id, mentorId, menteeId, 'rejected', introduction, preferredTime);
}

/**
 * Creates a randomized match
 */
export function createRandomMatch(
  mentorId: string,
  menteeId: string,
  prefix: string = 'match'
): Match {
  const timestamp = Date.now();
  return createMatch(
    `${prefix}-${timestamp}`,
    mentorId,
    menteeId,
    'pending',
    `${prefix} introduction`,
    `${prefix} preferred time`
  );
}

/**
 * Creates a list of matches with different statuses
 */
export function createMatchList(
  count: number,
  mentorId: string,
  menteeId: string
): Match[] {
  const statuses: Array<Match['status']> = ['pending', 'active', 'completed', 'rejected'];

  return Array.from({ length: count }, (_, i) =>
    createMatch(
      `match-${i}`,
      mentorId,
      menteeId,
      statuses[i % statuses.length],
      `Introduction ${i}`,
      `Preferred time ${i}`
    )
  );
}
