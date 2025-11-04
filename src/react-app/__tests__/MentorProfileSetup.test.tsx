import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Tests for MentorProfileSetup single-form validation
// The form now displays all fields at once (no wizard steps)
// All validation runs on form submission

const linkedInUrlRegex = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/;

const mentorProfileSchema = z.object({
  nick_name: z.string().min(2, 'Nickname must be at least 2 characters'),
  bio: z.string().min(10, 'Bio must be at least 10 characters'),
  mentoring_levels: z.number().min(1, 'Select at least one mentoring level'),
  availability: z.string().min(10, 'Availability must be at least 10 characters'),
  hourly_rate: z.number().min(1, 'Hourly rate is required'),
  payment_types: z.number().min(1, 'Select at least one payment method'),
  allow_reviews: z.boolean().refine(
    (val) => val === true,
    'You must accept this term to continue'
  ),
  allow_recording: z.boolean().refine(
    (val) => val === true,
    'You must accept this term to continue'
  ),
  linkedin_url: z.string().optional().refine(
    (val) => !val || linkedInUrlRegex.test(val),
    'Invalid LinkedIn URL format. Must be https://www.linkedin.com/in/username or https://linkedin.com/in/username'
  ),
});

describe('MentorProfileSetup - Single Form Validation', () => {
  it('should pass validation with complete valid data', () => {
    const validData = {
      nick_name: 'TestMentor',
      bio: 'This is a test bio for mentoring',
      mentoring_levels: 1,
      availability: 'Flexible schedule',
      hourly_rate: 50,
      payment_types: 1,
      allow_reviews: true,
      allow_recording: true,
    };

    const result = mentorProfileSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should fail validation when nick_name is too short', () => {
    const invalidData = {
      nick_name: 'T', // Too short
      bio: 'This is a test bio for mentoring',
      mentoring_levels: 1,
      availability: 'Flexible schedule',
      hourly_rate: 50,
      payment_types: 1,
      allow_reviews: true,
      allow_recording: true,
    };

    const result = mentorProfileSchema.safeParse(invalidData);
    expect(result.success).toBe(false);

    if (!result.success) {
      const nameError = result.error.issues.find((err) => err.path[0] === 'nick_name');
      expect(nameError?.message).toBe('Nickname must be at least 2 characters');
    }
  });

  it('should fail validation when bio is too short', () => {
    const invalidData = {
      nick_name: 'TestMentor',
      bio: 'Short', // Too short
      mentoring_levels: 1,
      availability: 'Flexible schedule',
      hourly_rate: 50,
      payment_types: 1,
      allow_reviews: true,
      allow_recording: true,
    };

    const result = mentorProfileSchema.safeParse(invalidData);
    expect(result.success).toBe(false);

    if (!result.success) {
      const bioError = result.error.issues.find((err) => err.path[0] === 'bio');
      expect(bioError?.message).toBe('Bio must be at least 10 characters');
    }
  });

  it('should fail validation when no mentoring levels are selected', () => {
    const invalidData = {
      nick_name: 'TestMentor',
      bio: 'This is a test bio for mentoring',
      mentoring_levels: 0, // No levels selected
      availability: 'Flexible schedule',
      hourly_rate: 50,
      payment_types: 1,
      allow_reviews: true,
      allow_recording: true,
    };

    const result = mentorProfileSchema.safeParse(invalidData);
    expect(result.success).toBe(false);

    if (!result.success) {
      const levelError = result.error.issues.find((err) => err.path[0] === 'mentoring_levels');
      expect(levelError?.message).toBe('Select at least one mentoring level');
    }
  });

  it('should fail validation when no payment types are selected', () => {
    const invalidData = {
      nick_name: 'TestMentor',
      bio: 'This is a test bio for mentoring',
      mentoring_levels: 1,
      availability: 'Flexible schedule',
      hourly_rate: 50,
      payment_types: 0, // No payment types selected
      allow_reviews: true,
      allow_recording: true,
    };

    const result = mentorProfileSchema.safeParse(invalidData);
    expect(result.success).toBe(false);

    if (!result.success) {
      const paymentError = result.error.issues.find((err) => err.path[0] === 'payment_types');
      expect(paymentError?.message).toBe('Select at least one payment method');
    }
  });

  it('should fail validation when hourly_rate is zero or negative', () => {
    const invalidData = {
      nick_name: 'TestMentor',
      bio: 'This is a test bio for mentoring',
      mentoring_levels: 1,
      availability: 'Flexible weekday evenings',
      hourly_rate: 0, // Invalid: must be at least 1
      payment_types: 1,
      allow_reviews: true,
      allow_recording: true,
    };

    const result = mentorProfileSchema.safeParse(invalidData);
    expect(result.success).toBe(false);

    if (!result.success) {
      const rateError = result.error.issues.find((err) => err.path[0] === 'hourly_rate');
      expect(rateError?.message).toBe('Hourly rate is required');
    }
  });

  it('should fail validation when availability is missing', () => {
    const invalidData = {
      nick_name: 'TestMentor',
      bio: 'This is a test bio for mentoring',
      mentoring_levels: 1,
      availability: '', // Empty availability is invalid
      hourly_rate: 50,
      payment_types: 1,
      allow_reviews: true,
      allow_recording: true,
    };

    const result = mentorProfileSchema.safeParse(invalidData);
    expect(result.success).toBe(false);

    if (!result.success) {
      const availError = result.error.issues.find((err) => err.path[0] === 'availability');
      expect(availError?.message).toBe('Availability must be at least 10 characters');
    }
  });

  it('should fail validation when availability is too short', () => {
    const invalidData = {
      nick_name: 'TestMentor',
      bio: 'This is a test bio for mentoring',
      mentoring_levels: 1,
      availability: 'Weekdays', // Too short (less than 10 chars)
      hourly_rate: 50,
      payment_types: 1,
      allow_reviews: true,
      allow_recording: true,
    };

    const result = mentorProfileSchema.safeParse(invalidData);
    expect(result.success).toBe(false);

    if (!result.success) {
      const availError = result.error.issues.find((err) => err.path[0] === 'availability');
      expect(availError?.message).toBe('Availability must be at least 10 characters');
    }
  });

  it('should fail when allow_reviews is not explicitly accepted', () => {
    const invalidData = {
      nick_name: 'TestMentor',
      bio: 'This is a test bio for mentoring',
      mentoring_levels: 1,
      availability: 'Flexible weekday evenings',
      hourly_rate: 50,
      payment_types: 1,
      allow_reviews: false, // Must be true
      allow_recording: true,
    };

    const result = mentorProfileSchema.safeParse(invalidData);
    expect(result.success).toBe(false);

    if (!result.success) {
      const reviewsError = result.error.issues.find((err) => err.path[0] === 'allow_reviews');
      expect(reviewsError?.message).toBe('You must accept this term to continue');
    }
  });

  it('should fail when allow_recording is not explicitly accepted', () => {
    const invalidData = {
      nick_name: 'TestMentor',
      bio: 'This is a test bio for mentoring',
      mentoring_levels: 1,
      availability: 'Flexible weekday evenings',
      hourly_rate: 50,
      payment_types: 1,
      allow_reviews: true,
      allow_recording: false, // Must be true
    };

    const result = mentorProfileSchema.safeParse(invalidData);
    expect(result.success).toBe(false);

    if (!result.success) {
      const recordingError = result.error.issues.find((err) => err.path[0] === 'allow_recording');
      expect(recordingError?.message).toBe('You must accept this term to continue');
    }
  });

  it('should accept multiple field errors at once', () => {
    // Test that all validations run together, not step-by-step
    const multipleErrorsData = {
      nick_name: 'T', // Too short
      bio: 'Short', // Too short
      mentoring_levels: 0, // None selected
      availability: 'Brief', // Too short
      hourly_rate: 0, // Invalid
      payment_types: 0, // None selected
      allow_reviews: false, // Not accepted
      allow_recording: false, // Not accepted
    };

    const result = mentorProfileSchema.safeParse(multipleErrorsData);
    expect(result.success).toBe(false);

    if (!result.success) {
      // Should have multiple errors
      expect(result.error.issues.length).toBeGreaterThan(1);

      // Verify we have errors for multiple fields
      const errorPaths = result.error.issues.map(issue => issue.path[0]);
      expect(errorPaths).toContain('nick_name');
      expect(errorPaths).toContain('bio');
      expect(errorPaths).toContain('mentoring_levels');
      expect(errorPaths).toContain('availability');
      expect(errorPaths).toContain('hourly_rate');
      expect(errorPaths).toContain('payment_types');
      expect(errorPaths).toContain('allow_reviews');
      expect(errorPaths).toContain('allow_recording');
    }
  });

  it('should pass validation with valid LinkedIn URL', () => {
    const validData = {
      nick_name: 'TestMentor',
      bio: 'This is a test bio for mentoring',
      mentoring_levels: 1,
      availability: 'Flexible schedule',
      hourly_rate: 50,
      payment_types: 1,
      allow_reviews: true,
      allow_recording: true,
      linkedin_url: 'https://www.linkedin.com/in/johndoe',
    };

    const result = mentorProfileSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should pass validation without LinkedIn URL (optional field)', () => {
    const validData = {
      nick_name: 'TestMentor',
      bio: 'This is a test bio for mentoring',
      mentoring_levels: 1,
      availability: 'Flexible schedule',
      hourly_rate: 50,
      payment_types: 1,
      allow_reviews: true,
      allow_recording: true,
      // linkedin_url is not provided
    };

    const result = mentorProfileSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should pass validation with empty string LinkedIn URL', () => {
    const validData = {
      nick_name: 'TestMentor',
      bio: 'This is a test bio for mentoring',
      mentoring_levels: 1,
      availability: 'Flexible schedule',
      hourly_rate: 50,
      payment_types: 1,
      allow_reviews: true,
      allow_recording: true,
      linkedin_url: '',
    };

    const result = mentorProfileSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should fail validation with invalid LinkedIn URL format', () => {
    const invalidData = {
      nick_name: 'TestMentor',
      bio: 'This is a test bio for mentoring',
      mentoring_levels: 1,
      availability: 'Flexible schedule',
      hourly_rate: 50,
      payment_types: 1,
      allow_reviews: true,
      allow_recording: true,
      linkedin_url: 'https://twitter.com/johndoe', // Invalid: not LinkedIn
    };

    const result = mentorProfileSchema.safeParse(invalidData);
    expect(result.success).toBe(false);

    if (!result.success) {
      const linkedInError = result.error.issues.find((err) => err.path[0] === 'linkedin_url');
      expect(linkedInError?.message).toContain('Invalid LinkedIn URL format');
    }
  });

  it('should fail validation with malformed LinkedIn URL', () => {
    const invalidData = {
      nick_name: 'TestMentor',
      bio: 'This is a test bio for mentoring',
      mentoring_levels: 1,
      availability: 'Flexible schedule',
      hourly_rate: 50,
      payment_types: 1,
      allow_reviews: true,
      allow_recording: true,
      linkedin_url: 'linkedin.com/in/johndoe', // Missing protocol
    };

    const result = mentorProfileSchema.safeParse(invalidData);
    expect(result.success).toBe(false);

    if (!result.success) {
      const linkedInError = result.error.issues.find((err) => err.path[0] === 'linkedin_url');
      expect(linkedInError?.message).toContain('Invalid LinkedIn URL format');
    }
  });

  it('should accept various valid LinkedIn URL formats', () => {
    const validUrls = [
      'https://www.linkedin.com/in/johndoe',
      'https://linkedin.com/in/johndoe',
      'https://www.linkedin.com/in/john-doe-123456',
      'http://www.linkedin.com/in/johndoe',
      'https://www.linkedin.com/in/johndoe/',
    ];

    for (const linkedin_url of validUrls) {
      const validData = {
        nick_name: 'TestMentor',
        bio: 'This is a test bio for mentoring',
        mentoring_levels: 1,
        availability: 'Flexible schedule',
        hourly_rate: 50,
        payment_types: 1,
        allow_reviews: true,
        allow_recording: true,
        linkedin_url,
      };

      const result = mentorProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    }
  });
});
