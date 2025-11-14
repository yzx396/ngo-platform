import { useState, useEffect } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { MentoringLevelPicker } from '../components/MentoringLevelPicker';
import { PaymentTypePicker } from '../components/PaymentTypePicker';
import { ExpertiseDomainPicker } from '../components/ExpertiseDomainPicker';
import { AvailabilityInput } from '../components/AvailabilityInput';
import { createMentorProfile, getMentorProfileByUserId, updateMentorProfile } from '../services/mentorService';
import { handleApiError, showSuccessToast } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import type { MentorProfile } from '../../types/mentor';

// LinkedIn URL regex validation
const linkedInUrlRegex = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/;

// Create schema factory to use translations
const createMentorProfileSchema = (t: (key: string) => string) => z.object({
  nick_name: z.string().min(2, t('mentor.validationNickname')),
  bio: z.string().min(10, t('mentor.validationBio')),
  expertise_domains: z.number().min(1, t('mentor.validationExpertiseDomain')),
  expertise_topics_preset: z.number().int(),
  mentoring_levels: z.number().min(1, t('mentor.validationLevel')),
  availability: z.string().min(10, t('mentor.validationAvailability')),
  hourly_rate: z.number().min(1, t('mentor.validationRateRequired')),
  payment_types: z.number().min(1, t('mentor.validationPayment')),
  allow_reviews: z.boolean().refine(
    (val) => val === true,
    t('mentor.validationReviewsRequired')
  ),
  allow_recording: z.boolean().refine(
    (val) => val === true,
    t('mentor.validationRecordingRequired')
  ),
  linkedin_url: z.string().min(1, t('mentor.validationLinkedInRequired')).refine(
    (val) => linkedInUrlRegex.test(val),
    t('mentor.validationLinkedInUrl')
  ),
});

type MentorProfileFormData = z.infer<ReturnType<typeof createMentorProfileSchema>>;

/**
 * MentorProfileSetup page
 * Single form for mentors to create their profile
 * Includes validation and saving to backend
 */
export function MentorProfileSetup() {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [existingProfile, setExistingProfile] = useState<MentorProfile | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const form = useForm<MentorProfileFormData>({
    resolver: zodResolver(createMentorProfileSchema(t)),
    mode: 'onChange',
    defaultValues: {
      nick_name: '',
      bio: '',
      mentoring_levels: 0,
      availability: '',
      hourly_rate: 50,
      payment_types: 0,
      expertise_domains: 0,
      expertise_topics_preset: 0,
      allow_reviews: false,
      allow_recording: false,
      linkedin_url: '',
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
            expertise_domains: profile.expertise_domains,
            expertise_topics_preset: profile.expertise_topics_preset,
            allow_reviews: profile.allow_reviews,
            allow_recording: profile.allow_recording,
            linkedin_url: profile.linkedin_url || '',
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
        showSuccessToast(t('mentor.profileUpdated'));
      } else {
        // Create new profile
        await createMentorProfile({
          ...data,
          user_id: user.id,
          hourly_rate: hourlyRate,
          availability,
        });
        showSuccessToast(t('mentor.profileCreated'));
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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          {existingProfile ? t('mentor.editTitle') : t('mentor.createTitle')}
        </h1>
        <p className="text-muted-foreground">
          {existingProfile ? t('mentor.editSubtitle') : t('mentor.createSubtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar: Instructions */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-4 bg-blue-50 border-blue-200">
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {t('mentor.setupInstructions')}
            </p>
          </Card>
        </div>

        {/* Right Column: Form */}
        <div className="lg:col-span-3">
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            <Card className="p-8 space-y-8">
              {/* Section 1: Basic Information */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="nick_name">
                    {t('mentor.nickname')}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="nick_name"
                    placeholder={t('mentor.nicknameHelp')}
                    {...form.register('nick_name')}
                  />
                  {form.formState.errors.nick_name && (
                    <p className="text-sm text-red-500">{form.formState.errors.nick_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">
                    {t('mentor.bio')}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Textarea
                    id="bio"
                    placeholder={t('mentor.bioHelp')}
                    rows={6}
                    {...form.register('bio')}
                  />
                  {form.formState.errors.bio && (
                    <p className="text-sm text-red-500">{form.formState.errors.bio.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin_url">
                    {t('mentor.linkedinUrl')}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="linkedin_url"
                    type="url"
                    placeholder="https://www.linkedin.com/in/your-profile"
                    {...form.register('linkedin_url')}
                  />
                  {form.formState.errors.linkedin_url && (
                    <p className="text-sm text-red-500">{form.formState.errors.linkedin_url.message}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{t('mentor.linkedinUrlHelp')}</p>
                </div>
              </div>

              {/* Section 2: Expertise Domains */}
              <div className="space-y-6">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <ExpertiseDomainPicker control={form.control as any} required={true} />
                {form.formState.errors.expertise_domains && (
                  <p className="text-sm text-red-500">{form.formState.errors.expertise_domains.message}</p>
                )}
              </div>

              {/* Section 3: Mentoring Levels */}
              <div className="space-y-4">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <MentoringLevelPicker control={form.control as any} />
                {form.formState.errors.mentoring_levels && (
                  <p className="text-sm text-red-500">{form.formState.errors.mentoring_levels.message}</p>
                )}
              </div>

              {/* Section 4: Rate & Availability */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">
                    {t('mentor.hourlyRateLabel')}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
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
                <div className="space-y-2">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <AvailabilityInput control={form.control as any} />
                  {form.formState.errors.availability && (
                    <p className="text-sm text-red-500">{form.formState.errors.availability.message}</p>
                  )}
                </div>
              </div>

              {/* Section 5: Payment & Preferences */}
              <div className="space-y-6">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <PaymentTypePicker control={form.control as any} />
                {form.formState.errors.payment_types && (
                  <p className="text-sm text-red-500">{form.formState.errors.payment_types.message}</p>
                )}
              </div>

              {/* Payment & Preferences (continued) */}
              <div className="space-y-6">
                {/* Consent Section */}
                <div className="space-y-6">
                  {/* Reviews Consent */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium">
                      {t('mentor.allowReviews')}
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <Controller
                      control={form.control}
                      name="allow_reviews"
                      render={({ field }) => (
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <span className="text-sm font-medium">
                            {t('mentor.consentAccept')}
                          </span>
                        </label>
                      )}
                    />
                    {form.formState.errors.allow_reviews && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.allow_reviews.message}
                      </p>
                    )}
                  </div>

                  {/* Recording Consent */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium">
                      {t('mentor.allowRecording')}
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <Controller
                      control={form.control}
                      name="allow_recording"
                      render={({ field }) => (
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <span className="text-sm font-medium">
                            {t('mentor.consentAccept')}
                          </span>
                        </label>
                      )}
                    />
                    {form.formState.errors.allow_recording && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.allow_recording.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
                  {isSubmitting
                    ? (existingProfile ? t('common.save') + '...' : t('common.save') + '...')
                    : t('common.save')}
                </Button>
              </div>
            </form>
          </FormProvider>
        </div>
      </div>
    </div>
  );
}
