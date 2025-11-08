/**
 * React Test Mentor Profile Fixtures
 *
 * Pre-defined mentor profile objects for React component testing.
 *
 * Usage:
 * ```typescript
 * import { mentorProfileFixtures } from '../fixtures/mentorProfiles';
 *
 * render(<MentorProfileCard profile={mentorProfileFixtures.complete} />);
 * ```
 */

import type { MentorProfile } from '../../types/mentor';
import { MentoringLevel, PaymentType } from '../../types/mentor';

// ============================================================================
// Pre-defined Test Mentor Profiles
// ============================================================================

export const mentorProfileFixtures = {
  /**
   * A complete mentor profile
   */
  complete: {
    id: 'profile-complete-1',
    user_id: 'user-mentor-101',
    nick_name: 'CodeMentor',
    bio: 'Experienced software engineer with 10 years in the industry',
    mentoring_levels: MentoringLevel.Entry | MentoringLevel.Senior,
    availability: 'Weekdays 9am-5pm EST',
    hourly_rate: 75,
    payment_types: PaymentType.Venmo | PaymentType.Paypal,
    expertise_domains: 0,
    expertise_topics_preset: 0,
    expertise_topics_custom: [],
    allow_reviews: true,
    allow_recording: true,
    linkedin_url: 'https://www.linkedin.com/in/codementor',
    created_at: 1000000000,
    updated_at: 1000000000,
  } as MentorProfile,

  /**
   * A minimal mentor profile
   */
  minimal: {
    id: 'profile-minimal-1',
    user_id: 'user-regular-456',
    nick_name: 'MinimalMentor',
    bio: 'Short bio',
    mentoring_levels: MentoringLevel.Entry,
    availability: null,
    hourly_rate: null,
    payment_types: PaymentType.Venmo,
    expertise_domains: 0,
    expertise_topics_preset: 0,
    expertise_topics_custom: [],
    allow_reviews: true,
    allow_recording: true,
    linkedin_url: null,
    created_at: 1000000000,
    updated_at: 1000000000,
  } as MentorProfile,

  /**
   * A senior mentor profile
   */
  senior: {
    id: 'profile-senior-1',
    user_id: 'user-mentor-101',
    nick_name: 'SeniorMentor',
    bio: 'Senior software engineer with extensive experience',
    mentoring_levels: MentoringLevel.Senior | MentoringLevel.Staff,
    availability: 'Weekends and evenings',
    hourly_rate: 100,
    payment_types: PaymentType.Venmo | PaymentType.Paypal | PaymentType.Zelle,
    expertise_domains: 0,
    expertise_topics_preset: 0,
    expertise_topics_custom: [],
    allow_reviews: true,
    allow_recording: false,
    linkedin_url: null,
    created_at: 1000000000,
    updated_at: 1000000000,
  } as MentorProfile,

  /**
   * A mentor with LinkedIn profile
   */
  withLinkedIn: {
    id: 'profile-linkedin-1',
    user_id: 'user-mentor-101',
    nick_name: 'LinkedInMentor',
    bio: 'Software engineer with LinkedIn profile',
    mentoring_levels: MentoringLevel.Entry,
    availability: null,
    hourly_rate: null,
    payment_types: PaymentType.Venmo,
    expertise_domains: 0,
    expertise_topics_preset: 0,
    expertise_topics_custom: [],
    allow_reviews: true,
    allow_recording: true,
    linkedin_url: 'https://www.linkedin.com/in/johndoe',
    created_at: 1000000000,
    updated_at: 1000000000,
  } as MentorProfile,

  /**
   * A free mentor
   */
  free: {
    id: 'profile-free-1',
    user_id: 'user-regular-456',
    nick_name: 'FreeMentor',
    bio: 'I mentor for free',
    mentoring_levels: MentoringLevel.Entry,
    availability: null,
    hourly_rate: 0,
    payment_types: 0,
    expertise_domains: 0,
    expertise_topics_preset: 0,
    expertise_topics_custom: [],
    allow_reviews: true,
    allow_recording: true,
    linkedin_url: null,
    created_at: 1000000000,
    updated_at: 1000000000,
  } as MentorProfile,

  /**
   * Multiple mentor profiles for list testing
   */
  list: [
    {
      id: 'profile-list-1',
      user_id: 'user-mentor-1',
      nick_name: 'Mentor One',
      bio: 'First mentor',
      mentoring_levels: MentoringLevel.Entry,
      availability: null,
      hourly_rate: 50,
      payment_types: PaymentType.Venmo,
      expertise_domains: 0,
      expertise_topics_preset: 0,
      expertise_topics_custom: [],
      allow_reviews: true,
      allow_recording: true,
      linkedin_url: null,
      created_at: 1000000000,
      updated_at: 1000000000,
    } as MentorProfile,
    {
      id: 'profile-list-2',
      user_id: 'user-mentor-2',
      nick_name: 'Mentor Two',
      bio: 'Second mentor',
      mentoring_levels: MentoringLevel.Senior,
      availability: 'Evenings',
      hourly_rate: 75,
      payment_types: PaymentType.Paypal,
      expertise_domains: 0,
      expertise_topics_preset: 0,
      expertise_topics_custom: [],
      allow_reviews: true,
      allow_recording: true,
      linkedin_url: null,
      created_at: 1000000001,
      updated_at: 1000000001,
    } as MentorProfile,
    {
      id: 'profile-list-3',
      user_id: 'user-mentor-3',
      nick_name: 'Mentor Three',
      bio: 'Third mentor',
      mentoring_levels: MentoringLevel.Management,
      availability: 'Weekends',
      hourly_rate: 100,
      payment_types: PaymentType.Zelle,
      expertise_domains: 0,
      expertise_topics_preset: 0,
      expertise_topics_custom: [],
      allow_reviews: false,
      allow_recording: true,
      linkedin_url: null,
      created_at: 1000000002,
      updated_at: 1000000002,
    } as MentorProfile,
  ],
};

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a custom mentor profile for React tests
 */
export function createMentorProfile(overrides: Partial<MentorProfile> = {}): MentorProfile {
  const timestamp = Date.now();
  return {
    id: `profile-${timestamp}`,
    user_id: `user-${timestamp}`,
    nick_name: `Mentor${timestamp}`,
    bio: `Bio for mentor ${timestamp}`,
    mentoring_levels: MentoringLevel.Entry,
    availability: null,
    hourly_rate: 50,
    payment_types: PaymentType.Venmo,
    expertise_domains: 0,
    expertise_topics_preset: 0,
    expertise_topics_custom: [],
    allow_reviews: true,
    allow_recording: true,
    linkedin_url: null,
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  };
}

/**
 * Creates a list of mentor profiles
 */
export function createMentorProfiles(count: number): MentorProfile[] {
  return Array.from({ length: count }, (_, i) => createMentorProfile({ id: `profile-${i}` }));
}
