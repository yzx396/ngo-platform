import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
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
import { createMentorProfile } from '../services/mentorService';
import { handleApiError, showSuccessToast } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';

// Zod validation schema
const mentorProfileSchema = z.object({
  nick_name: z.string().min(2, 'Nickname must be at least 2 characters'),
  bio: z.string().min(10, 'Bio must be at least 10 characters'),
  mentoring_levels: z.number().min(1, 'Select at least one mentoring level'),
  availability: z.string().optional(),
  hourly_rate: z.number().positive('Hourly rate must be positive').optional(),
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

      await createMentorProfile({
        ...data,
        user_id: user.id,
        hourly_rate: data.hourly_rate || undefined,
        availability: data.availability || undefined,
      });

      showSuccessToast('Mentor profile created successfully!');
      // Redirect to browse page after successful creation
      navigate('/mentors/browse');
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Create Your Mentor Profile</h1>
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
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <Checkbox {...form.register('allow_reviews')} />
                      <span>Allow mentees to leave reviews</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <Checkbox {...form.register('allow_recording')} />
                      <span>Allow recording of mentoring sessions</span>
                    </label>
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
                  {isSubmitting ? 'Creating...' : 'Create Profile'}
                </Button>
              )}
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}
