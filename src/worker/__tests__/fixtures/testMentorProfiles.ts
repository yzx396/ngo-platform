/**
 * Test Mentor Profile Fixtures
 *
 * Pre-defined mentor profile objects for testing. Eliminates repeated profile creation across test files.
 *
 * Usage:
 * ```typescript
 * import { testMentorProfiles } from '../fixtures/testMentorProfiles';
 *
 * const profile = testMentorProfiles.complete;
 * ```
 */

import type { MentorProfile } from '../../../types/mentor';
import { MentoringLevel, PaymentType } from '../../../types/mentor';

// ============================================================================
// Pre-defined Test Mentor Profiles
// ============================================================================

export const testMentorProfiles = {
  /**
   * A complete mentor profile with all fields
   */
  complete: {
    id: 'mentor-profile-1',
    user_id: 'user-mentor-789',
    nick_name: 'CodeMentor',
    bio: 'Experienced software engineer with 10 years in the industry',
    mentoring_levels: MentoringLevel.Entry | MentoringLevel.Senior, // 3
    availability: 'Weekdays 9am-5pm EST',
    hourly_rate: 75,
    payment_types: PaymentType.Venmo | PaymentType.Paypal, // 3
    expertise_domains: 0,
    expertise_topics_preset: 0,
    allow_reviews: true,
    allow_recording: true,
    linkedin_url: 'https://www.linkedin.com/in/codementor',
    created_at: 1000000000,
    updated_at: 1000000000,
  } as MentorProfile,

  /**
   * A minimal mentor profile with required fields only
   */
  minimal: {
    id: 'mentor-profile-2',
    user_id: 'user-regular-123',
    nick_name: 'MinimalMentor',
    bio: 'Short bio',
    mentoring_levels: MentoringLevel.Entry,
    availability: null,
    hourly_rate: null,
    payment_types: PaymentType.Venmo,
    expertise_domains: 0,
    expertise_topics_preset: 0,
    allow_reviews: true,
    allow_recording: true,
    linkedin_url: null,
    created_at: 1000000000,
    updated_at: 1000000000,
  } as MentorProfile,

  /**
   * A mentor profile for testing updates
   */
  updateTest: {
    id: 'mentor-profile-3',
    user_id: 'user-regular-123',
    nick_name: 'UpdateTestMentor',
    bio: 'Original bio',
    mentoring_levels: MentoringLevel.Entry,
    availability: null,
    hourly_rate: 50,
    payment_types: PaymentType.Venmo,
    expertise_domains: 0,
    expertise_topics_preset: 0,
    allow_reviews: true,
    allow_recording: true,
    linkedin_url: null,
    created_at: 1000000000,
    updated_at: 1000000000,
  } as MentorProfile,

  /**
   * A senior-level mentor profile
   */
  senior: {
    id: 'mentor-profile-4',
    user_id: 'user-mentor-789',
    nick_name: 'SeniorMentor',
    bio: 'Senior software engineer with extensive experience',
    mentoring_levels: MentoringLevel.Senior | MentoringLevel.Staff | MentoringLevel.Management, // 14
    availability: 'Weekends and evenings',
    hourly_rate: 100,
    payment_types: PaymentType.Venmo | PaymentType.Paypal | PaymentType.Zelle, // 7
    expertise_domains: 0,
    expertise_topics_preset: 0,
    allow_reviews: true,
    allow_recording: false,
    linkedin_url: null,
    created_at: 1000000000,
    updated_at: 1000000000,
  } as MentorProfile,

  /**
   * A mentor profile with LinkedIn URL
   */
  withLinkedIn: {
    id: 'mentor-profile-5',
    user_id: 'user-mentor-789',
    nick_name: 'LinkedInMentor',
    bio: 'Software engineer with LinkedIn profile',
    mentoring_levels: MentoringLevel.Entry,
    availability: null,
    hourly_rate: null,
    payment_types: PaymentType.Venmo,
    expertise_domains: 0,
    expertise_topics_preset: 0,
    allow_reviews: true,
    allow_recording: true,
    linkedin_url: 'https://www.linkedin.com/in/johndoe',
    created_at: 1000000000,
    updated_at: 1000000000,
  } as MentorProfile,

  /**
   * A mentor profile without LinkedIn URL
   */
  withoutLinkedIn: {
    id: 'mentor-profile-6',
    user_id: 'user-regular-123',
    nick_name: 'NoLinkedInMentor',
    bio: 'Software engineer without LinkedIn',
    mentoring_levels: MentoringLevel.Entry,
    availability: null,
    hourly_rate: null,
    payment_types: PaymentType.Venmo,
    expertise_domains: 0,
    expertise_topics_preset: 0,
    allow_reviews: true,
    allow_recording: true,
    linkedin_url: null,
    created_at: 1000000000,
    updated_at: 1000000000,
  } as MentorProfile,

  /**
   * A mentor profile with special characters in nickname
   */
  specialChars: {
    id: 'mentor-profile-7',
    user_id: 'user-regular-123',
    nick_name: 'Code-Master_2024',
    bio: 'Test bio',
    mentoring_levels: MentoringLevel.Entry,
    availability: null,
    hourly_rate: null,
    payment_types: PaymentType.Venmo,
    expertise_domains: 0,
    expertise_topics_preset: 0,
    allow_reviews: true,
    allow_recording: true,
    linkedin_url: null,
    created_at: 1000000000,
    updated_at: 1000000000,
  } as MentorProfile,

  /**
   * A free mentor (zero hourly rate)
   */
  freeMentor: {
    id: 'mentor-profile-8',
    user_id: 'user-regular-123',
    nick_name: 'FreeMentor',
    bio: 'I mentor for free',
    mentoring_levels: MentoringLevel.Entry,
    availability: null,
    hourly_rate: 0,
    payment_types: 0, // No payment types
    expertise_domains: 0,
    expertise_topics_preset: 0,
    allow_reviews: true,
    allow_recording: true,
    linkedin_url: null,
    created_at: 1000000000,
    updated_at: 1000000000,
  } as MentorProfile,

  /**
   * A mentor with all mentoring levels
   */
  allLevels: {
    id: 'mentor-profile-9',
    user_id: 'user-mentor-789',
    nick_name: 'AllLevelsMentor',
    bio: 'I mentor all levels',
    mentoring_levels: MentoringLevel.Entry | MentoringLevel.Senior | MentoringLevel.Staff | MentoringLevel.Management, // 15
    availability: null,
    hourly_rate: null,
    payment_types: PaymentType.Venmo,
    expertise_domains: 0,
    expertise_topics_preset: 0,
    allow_reviews: true,
    allow_recording: true,
    linkedin_url: null,
    created_at: 1000000000,
    updated_at: 1000000000,
  } as MentorProfile,

  /**
   * A mentor with all payment types
   */
  allPaymentTypes: {
    id: 'mentor-profile-10',
    user_id: 'user-mentor-789',
    nick_name: 'AllPaymentsMentor',
    bio: 'I accept all payment types',
    mentoring_levels: MentoringLevel.Entry,
    availability: null,
    hourly_rate: null,
    payment_types: PaymentType.Venmo | PaymentType.Paypal | PaymentType.Zelle | PaymentType.Alipay | PaymentType.Wechat | PaymentType.Crypto, // 63
    expertise_domains: 0,
    expertise_topics_preset: 0,
    allow_reviews: true,
    allow_recording: true,
    linkedin_url: null,
    created_at: 1000000000,
    updated_at: 1000000000,
  } as MentorProfile,

  /**
   * Multiple mentor profiles for complex scenarios
   */
  multiple: [
    {
      id: 'mentor-multi-1',
      user_id: 'mentor-1',
      nick_name: 'Mentor One',
      bio: 'First mentor profile',
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
    {
      id: 'mentor-multi-2',
      user_id: 'mentor-2',
      nick_name: 'Mentor Two',
      bio: 'Second mentor profile',
      mentoring_levels: MentoringLevel.Senior,
      availability: null,
      hourly_rate: null,
      payment_types: PaymentType.Paypal,
      expertise_domains: 0,
      expertise_topics_preset: 0,
      expertise_topics_custom: [],
      allow_reviews: true,
      allow_recording: true,
      linkedin_url: null,
      created_at: 1000000000,
      updated_at: 1000000000,
    } as MentorProfile,
  ],
};

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a custom mentor profile
 */
export function createMentorProfile(
  id: string,
  userId: string,
  nickName: string,
  bio: string,
  mentoringLevels: number,
  paymentTypes: number,
  options: {
    availability?: string | null;
    hourlyRate?: number | null;
    allowReviews?: boolean;
    allowRecording?: boolean;
    linkedinUrl?: string | null;
    createdAt?: number;
    updatedAt?: number;
  } = {}
): MentorProfile {
  const {
    availability = null,
    hourlyRate = null,
    allowReviews = true,
    allowRecording = true,
    linkedinUrl = null,
    createdAt = Date.now(),
    updatedAt = Date.now(),
  } = options;

  return {
    id,
    user_id: userId,
    nick_name: nickName,
    bio,
    mentoring_levels: mentoringLevels,
    availability,
    hourly_rate: hourlyRate,
    payment_types: paymentTypes,
    expertise_domains: 0,
    expertise_topics_preset: 0,
    expertise_topics_custom: [],
    allow_reviews: allowReviews,
    allow_recording: allowRecording,
    linkedin_url: linkedinUrl,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

/**
 * Creates a randomized mentor profile
 */
export function createRandomMentorProfile(
  userId: string,
  prefix: string = 'mentor'
): MentorProfile {
  const timestamp = Date.now();
  return createMentorProfile(
    `${prefix}-profile-${timestamp}`,
    userId,
    `${prefix.charAt(0).toUpperCase()}${prefix.slice(1)}Profile`,
    `Bio for ${prefix}`,
    MentoringLevel.Entry,
    PaymentType.Venmo
  );
}

/**
 * Creates a list of mentor profiles
 */
export function createMentorProfiles(count: number, userIds: string[]): MentorProfile[] {
  return Array.from({ length: count }, (_, i) =>
    createRandomMentorProfile(userIds[i % userIds.length], `mentor-${i}`)
  );
}
