/**
 * Mock Utilities for React Tests
 *
 * Centralizes common mock setups and configurations.
 * Eliminates repeated mock definitions across test files.
 *
 * Usage:
 * ```typescript
 * import { setupApiMocks } from '../utils/mocks';
 *
 * beforeEach(() => {
 *   setupApiMocks();
 * });
 * ```
 */

import { vi } from 'vitest';
import type { User } from '../../types/user';
import type { MentorProfile } from '../../types/mentor';
import type { Match } from '../../types/match';

// ============================================================================
// API Service Mocks
// ============================================================================

/**
 * Sets up mocked API service responses
 */
export function setupApiMocks(options: {
  currentUser?: User | null;
  leaderboard?: unknown[];
} = {}) {
  const { currentUser = null, leaderboard = [] } = options;

  // Mock fetch globally
  global.fetch = vi.fn((url: string | URL | Request) => {
    const urlString = typeof url === 'string' ? url : (url as Request).toString();

    // Auth endpoints
    if (urlString.includes('/api/v1/auth/me')) {
      if (currentUser) {
        return Promise.resolve(new Response(JSON.stringify(currentUser)));
      }
      return Promise.resolve(new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 }));
    }

    // Leaderboard endpoint
    if (urlString.includes('/api/v1/users/leaderboard')) {
      return Promise.resolve(new Response(JSON.stringify({ leaderboard })));
    }

    // Default response
    return Promise.reject(new Error(`Unhandled mock request: ${urlString}`));
  }) as unknown;

  return global.fetch;
}

/**
 * Sets up API mocks with authenticated user
 */
export function setupAuthenticatedApiMocks(user: User) {
  return setupApiMocks({ currentUser: user });
}

/**
 * Sets up API mocks with unauthenticated state
 */
export function setupUnauthenticatedApiMocks() {
  return setupApiMocks({ currentUser: null });
}

// ============================================================================
// Service Layer Mocks
// ============================================================================

/**
 * Mocks the mentor service
 */
export function mockMentorService() {
  const mockGetProfile = vi.fn();
  const mockCreateProfile = vi.fn();
  const mockUpdateProfile = vi.fn();
  const mockDeleteProfile = vi.fn();
  const mockSearchMentors = vi.fn();
  const mockGetAllMentors = vi.fn();

  vi.mock('../../services/mentorService', () => ({
    mentorService: {
      getProfile: mockGetProfile,
      createProfile: mockCreateProfile,
      updateProfile: mockUpdateProfile,
      deleteProfile: mockDeleteProfile,
      searchMentors: mockSearchMentors,
      getAllMentors: mockGetAllMentors,
    },
  }));

  return {
    getProfile: mockGetProfile,
    createProfile: mockCreateProfile,
    updateProfile: mockUpdateProfile,
    deleteProfile: mockDeleteProfile,
    searchMentors: mockSearchMentors,
    getAllMentors: mockGetAllMentors,
  };
}

/**
 * Mocks the match service
 */
export function mockMatchService() {
  const mockCreateMatch = vi.fn();
  const mockGetMatches = vi.fn();
  const mockRespondToMatch = vi.fn();
  const mockCompleteMatch = vi.fn();
  const mockDeleteMatch = vi.fn();

  vi.mock('../../services/matchService', () => ({
    matchService: {
      createMatch: mockCreateMatch,
      getMatches: mockGetMatches,
      respondToMatch: mockRespondToMatch,
      completeMatch: mockCompleteMatch,
      deleteMatch: mockDeleteMatch,
    },
  }));

  return {
    createMatch: mockCreateMatch,
    getMatches: mockGetMatches,
    respondToMatch: mockRespondToMatch,
    completeMatch: mockCompleteMatch,
    deleteMatch: mockDeleteMatch,
  };
}

/**
 * Mocks the user service
 */
export function mockUserService() {
  const mockGetCurrentUser = vi.fn();
  const mockUpdateUser = vi.fn();
  const mockGetLeaderboard = vi.fn();

  vi.mock('../../services/userService', () => ({
    userService: {
      getCurrentUser: mockGetCurrentUser,
      updateUser: mockUpdateUser,
      getLeaderboard: mockGetLeaderboard,
    },
  }));

  return {
    getCurrentUser: mockGetCurrentUser,
    updateUser: mockUpdateUser,
    getLeaderboard: mockGetLeaderboard,
  };
}

// ============================================================================
// Mock Data Creators
// ============================================================================

/**
 * Creates a mock user
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    created_at: 1000000000,
    updated_at: 1000000000,
    ...overrides,
  };
}

/**
 * Creates a mock mentor profile
 */
export function createMockMentorProfile(overrides: Partial<MentorProfile> = {}): MentorProfile {
  return {
    id: 'profile-123',
    user_id: 'user-123',
    nick_name: 'TestMentor',
    bio: 'Test bio',
    mentoring_levels: 1,
    availability: null,
    hourly_rate: 50,
    payment_types: 1,
    expertise_domains: 0,
    expertise_topics_preset: 0,
    expertise_topics_custom: [],
    allow_reviews: true,
    allow_recording: true,
    linkedin_url: null,
    created_at: 1000000000,
    updated_at: 1000000000,
    ...overrides,
  };
}

/**
 * Creates a mock match
 */
export function createMockMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-123',
    mentor_id: 'mentor-123',
    mentee_id: 'mentee-123',
    status: 'pending',
    introduction: 'Test introduction',
    preferred_time: 'Weekends',
    cv_included: 0,
    created_at: 1000000000,
    updated_at: 1000000000,
    ...overrides,
  };
}

// ============================================================================
// Cleanup Functions
// ============================================================================

/**
 * Cleans up all mocks after each test
 */
export function cleanupMocks() {
  vi.clearAllMocks();
  // Note: localStorage.clear() removed - no longer using localStorage
}

/**
 * Sets up common test environment
 */
export function setupTestEnvironment() {
  // Setup before each test
  beforeEach(() => {
    setupApiMocks();
    cleanupMocks();
  });

  // Cleanup after each test
  afterEach(() => {
    cleanupMocks();
  });
}
