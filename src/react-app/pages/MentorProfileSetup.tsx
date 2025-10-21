import { useState, useEffect } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { MentoringLevelPicker } from '../components/MentoringLevelPicker';
import { PaymentTypePicker } from '../components/PaymentTypePicker';
import { AvailabilityInput } from '../components/AvailabilityInput';
import { createMentorProfile, getMentorProfileByUserId, updateMentorProfile } from '../services/mentorService';
import { handleApiError, showSuccessToast } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import type { MentorProfile } from '../../types/mentor';

// Zod validation schema with custom refinement for hourly_rate
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

type MentorProfileFormData = z.infer<typeof mentorProfileSchema>;

/**
 * MentorProfileSetup page
 * Multi-step form for mentors to create their profile
 * Includes validation and saving to backend
 */
export function MentorProfileSetup() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [existingProfile, setExistingProfile] = useState<MentorProfile | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const form = useForm<MentorProfileFormData>({
    resolver: zodResolver(mentorProfileSchema),
    mode: 'onChange',
    defaultValues: {
      nick_name: '',
      bio: '',
      mentoring_levels: 0,
      availability: '',
      hourly_rate: 50,
      payment_types: 0,
      allow_reviews: true,
      allow_recording: true,
    },
  });

  // Fetch existing mentor profile on mount
  useEffect(() => {
    const loadExistingProfile = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const profile = await getMentorProfileByUserId(user.id);
        if (profile) {
          setExistingProfile(profile);
          // Populate form with existing data
          form.reset({
            nick_name: profile.nick_name,
            bio: profile.bio,
            mentoring_levels: profile.mentoring_levels,
            availability: profile.availability || '',
            hourly_rate: profile.hourly_rate ?? 50,
            payment_types: profile.payment_types,
            allow_reviews: profile.allow_reviews,
            allow_recording: profile.allow_recording,
          });
        }
      } catch (error) {
        // If profile doesn't exist, that's fine - user is creating a new one
        console.error('Error loading mentor profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleNext = async () => {
    // Validate fields for current step
    if (step === 1) {
      const isValid = await form.trigger(['nick_name', 'bio']);
      if (isValid) setStep(2);
    } else if (step === 2) {
      const isValid = await form.trigger('mentoring_levels');
      if (isValid) setStep(3);
    } else if (step === 3) {
      const isValid = await form.trigger(['hourly_rate', 'availability']);
      if (isValid) setStep(4);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (data: MentorProfileFormData) => {
    setIsSubmitting(true);
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Filter out NaN and falsy values
      const hourlyRate = data.hourly_rate && !isNaN(data.hourly_rate) ? data.hourly_rate : undefined;
      const availability = data.availability || undefined;

      if (existingProfile) {
        // Update existing profile
        await updateMentorProfile(existingProfile.id, {
          ...data,
          hourly_rate: hourlyRate,
          availability,
        });
        showSuccessToast('Mentor profile updated successfully!');
      } else {
        // Create new profile
        await createMentorProfile({
          ...data,
          user_id: user.id,
          hourly_rate: hourlyRate,
          availability,
        });
        showSuccessToast('Mentor profile created successfully!');
      }

      // Redirect to browse page after successful creation/update
      navigate('/mentors/browse');
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while fetching profile
  if (isLoading) {
    return (
      <div className="container py-12">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">
            {existingProfile ? 'Edit Your Mentor Profile' : 'Create Your Mentor Profile'}
          </h1>
          <p className="text-lg text-muted-foreground">Step {step} of 4</p>
        </div>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            <Card className="p-8 space-y-6 min-h-96">
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="nick_name">Nickname</Label>
                    <Input
                      id="nick_name"
                      placeholder="How do you want to be called?"
                      {...form.register('nick_name')}
                    />
                    {form.formState.errors.nick_name && (
                      <p className="text-sm text-red-500">{form.formState.errors.nick_name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell mentees about your experience and expertise"
                      rows={6}
                      {...form.register('bio')}
                    />
                    {form.formState.errors.bio && (
                      <p className="text-sm text-red-500">{form.formState.errors.bio.message}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Mentoring Levels */}
              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-lg font-semibold">What mentoring levels can you help with?</p>
                  <MentoringLevelPicker control={form.control} />
                  {form.formState.errors.mentoring_levels && (
                    <p className="text-sm text-red-500">{form.formState.errors.mentoring_levels.message}</p>
                  )}
                </div>
              )}

              {/* Step 3: Rate & Availability */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      placeholder="50"
                      {...form.register('hourly_rate', { valueAsNumber: true })}
                    />
                    {form.formState.errors.hourly_rate && (
                      <p className="text-sm text-red-500">{form.formState.errors.hourly_rate.message}</p>
                    )}
                  </div>
                  <AvailabilityInput control={form.control} />
                  {form.formState.errors.availability && (
                    <p className="text-sm text-red-500">{form.formState.errors.availability.message}</p>
                  )}
                </div>
              )}

              {/* Step 4: Payment & Preferences */}
              {step === 4 && (
                <div className="space-y-6">
                  <PaymentTypePicker control={form.control} />
                  {form.formState.errors.payment_types && (
                    <p className="text-sm text-red-500">{form.formState.errors.payment_types.message}</p>
                  )}

                  <div className="space-y-3">
                    <Controller
                      control={form.control}
                      name="allow_reviews"
                      render={({ field }) => (
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <span>Allow mentees to leave reviews</span>
                        </label>
                      )}
                    />
                    <Controller
                      control={form.control}
                      name="allow_recording"
                      render={({ field }) => (
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <span>Allow recording of mentoring sessions</span>
                        </label>
                      )}
                    />
                  </div>
                </div>
              )}
            </Card>

            {/* Navigation Buttons */}
            <div className="flex justify-between gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={step === 1}
              >
                Back
              </Button>

              {step < 4 ? (
                <Button type="button" onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting 
                    ? (existingProfile ? 'Updating...' : 'Creating...') 
                    : (existingProfile ? 'Update Profile' : 'Create Profile')}
                </Button>
              )}
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}
