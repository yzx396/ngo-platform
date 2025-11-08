/**
 * React Test Match Fixtures
 *
 * Pre-defined match objects for React component testing.
 *
 * Usage:
 * ```typescript
 * import { matchFixtures } from '../fixtures/matches';
 *
 * render(<MatchCard match={matchFixtures.pending} />);
 * ```
 */

import type { Match } from '../../types/match';

// ============================================================================
// Pre-defined Test Matches
// ============================================================================

export const matchFixtures = {
  /**
   * A pending match
   */
  pending: {
    id: 'match-pending-1',
    mentor_id: 'mentor-123',
    mentee_id: 'mentee-456',
    status: 'pending',
    introduction: 'I am looking for mentorship in system design',
    preferred_time: 'Weekends',
    cv_included: 0,
    created_at: 1000000000,
    updated_at: 1000000000,
  } as Match,

  /**
   * An active match
   */
  active: {
    id: 'match-active-1',
    mentor_id: 'mentor-123',
    mentee_id: 'mentee-456',
    status: 'active',
    introduction: 'Looking for guidance on career development',
    preferred_time: 'Flexible schedule',
    cv_included: 0,
    created_at: 1000000000,
    updated_at: 1000000001,
  } as Match,

  /**
   * A completed match
   */
  completed: {
    id: 'match-completed-1',
    mentor_id: 'mentor-123',
    mentee_id: 'mentee-456',
    status: 'completed',
    introduction: 'Completed mentorship program',
    preferred_time: 'Weekday evenings',
    cv_included: 0,
    created_at: 1000000000,
    updated_at: 1000000002,
  } as Match,

  /**
   * A rejected match
   */
  rejected: {
    id: 'match-rejected-1',
    mentor_id: 'mentor-123',
    mentee_id: 'mentee-456',
    status: 'rejected',
    introduction: 'Not a good fit',
    preferred_time: 'Weekend mornings',
    cv_included: 0,
    created_at: 1000000000,
    updated_at: 1000000001,
  } as Match,

  /**
   * Multiple matches for list testing
   */
  list: [
    {
      id: 'match-list-1',
      mentor_id: 'mentor-1',
      mentee_id: 'mentee-1',
      status: 'pending',
      introduction: 'First match',
      preferred_time: 'Morning',
      cv_included: 0,
      created_at: 1000000000,
      updated_at: 1000000000,
    } as Match,
    {
      id: 'match-list-2',
      mentor_id: 'mentor-2',
      mentee_id: 'mentee-2',
      status: 'active',
      introduction: 'Second match',
      preferred_time: 'Afternoon',
      cv_included: 0,
      created_at: 1000000001,
      updated_at: 1000000001,
    } as Match,
    {
      id: 'match-list-3',
      mentor_id: 'mentor-3',
      mentee_id: 'mentee-3',
      status: 'completed',
      introduction: 'Third match',
      preferred_time: 'Evening',
      cv_included: 0,
      created_at: 1000000002,
      updated_at: 1000000002,
    } as Match,
  ],
};

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a custom match for React tests
 */
export function createMatch(overrides: Partial<Match> = {}): Match {
  const timestamp = Date.now();
  return {
    id: `match-${timestamp}`,
    mentor_id: `mentor-${timestamp}`,
    mentee_id: `mentee-${timestamp}`,
    status: 'pending',
    introduction: `Introduction ${timestamp}`,
    preferred_time: 'Weekends',
    cv_included: 0,
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  };
}

/**
 * Creates a pending match
 */
export function createPendingMatch(mentorId: string, menteeId: string): Match {
  return createMatch({
    mentor_id: mentorId,
    mentee_id: menteeId,
    status: 'pending',
  });
}

/**
 * Creates an active match
 */
export function createActiveMatch(mentorId: string, menteeId: string): Match {
  return createMatch({
    mentor_id: mentorId,
    mentee_id: menteeId,
    status: 'active',
  });
}

/**
 * Creates a completed match
 */
export function createCompletedMatch(mentorId: string, menteeId: string): Match {
  return createMatch({
    mentor_id: mentorId,
    mentee_id: menteeId,
    status: 'completed',
  });
}

/**
 * Creates a list of matches
 */
export function createMatches(count: number): Match[] {
  return Array.from({ length: count }, (_, i) => createMatch({ id: `match-${i}` }));
}
