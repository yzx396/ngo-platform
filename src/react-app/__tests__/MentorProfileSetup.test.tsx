import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Tests for MentorProfileSetup single-form validation
// The form now displays all fields at once (no wizard steps)
// All validation runs on form submission

const mentorProfileSchema = z.object({
  nick_name: z.string().min(2, 'Nickname must be at least 2 characters'),
  bio: z.string().min(10, 'Bio must be at least 10 characters'),
  mentoring_levels: z.number().min(1, 'Select at least one mentoring level'),
  availability: z.string().optional(),
  hourly_rate: z.number().refine(
    (val) => isNaN(val) || val > 0,
    'Hourly rate must be positive'
  ).optional(),
  payment_types: z.number().min(1, 'Select at least one payment method'),
  allow_reviews: z.boolean(),
  allow_recording: z.boolean(),
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

  it('should fail validation when hourly_rate is negative', () => {
    const invalidData = {
      nick_name: 'TestMentor',
      bio: 'This is a test bio for mentoring',
      mentoring_levels: 1,
      availability: 'Flexible schedule',
      hourly_rate: -10, // Invalid: negative rate
      payment_types: 1,
      allow_reviews: true,
      allow_recording: true,
    };

    const result = mentorProfileSchema.safeParse(invalidData);
    expect(result.success).toBe(false);

    if (!result.success) {
      const rateError = result.error.issues.find((err) => err.path[0] === 'hourly_rate');
      expect(rateError?.message).toBe('Hourly rate must be positive');
    }
  });

  it('should allow hourly_rate and availability to be optional/empty', () => {
    const optionalData = {
      nick_name: 'TestMentor',
      bio: 'This is a test bio for mentoring',
      mentoring_levels: 1,
      availability: '', // Empty is okay since it's optional
      hourly_rate: undefined, // Undefined is okay since it's optional
      payment_types: 1,
      allow_reviews: true,
      allow_recording: true,
    };

    const result = mentorProfileSchema.safeParse(optionalData);
    expect(result.success).toBe(true);
  });

  it('should accept multiple field errors at once', () => {
    // Test that all validations run together, not step-by-step
    const multipleErrorsData = {
      nick_name: 'T', // Too short
      bio: 'Short', // Too short
      mentoring_levels: 0, // None selected
      availability: 'Flexible schedule',
      hourly_rate: -10, // Negative
      payment_types: 0, // None selected
      allow_reviews: true,
      allow_recording: true,
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
      expect(errorPaths).toContain('payment_types');
    }
  });
});
