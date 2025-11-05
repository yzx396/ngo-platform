import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { handleApiError, showSuccessToast } from '../services/apiClient';
import { createMatch } from '../services/matchService';
import { getCVMetadata } from '../services/cvService';
import { useAuth } from '../context/AuthContext';
import type { MentorProfile } from '../../types/mentor';

/**
 * Validation schema for mentorship request form
 */
const mentorshipRequestSchema = z.object({
  introduction: z.string()
    .min(10, { message: 'Introduction must be at least 10 characters' })
    .max(500, { message: 'Introduction must not exceed 500 characters' }),
  preferred_time: z.string()
    .min(3, { message: 'Preferred time must be at least 3 characters' })
    .max(200, { message: 'Preferred time must not exceed 200 characters' }),
  cv_included: z.boolean().optional(),
});

type MentorshipRequestFormData = z.infer<typeof mentorshipRequestSchema>;

interface RequestMentorshipDialogProps {
  mentor: MentorProfile | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * RequestMentorshipDialog component
 * Modal dialog for collecting mentee information when requesting mentorship
 */
export function RequestMentorshipDialog({
  mentor,
  isOpen,
  onOpenChange,
  onSuccess,
}: RequestMentorshipDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCv, setHasCv] = useState(false);
  const [isCheckingCV, setIsCheckingCV] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<MentorshipRequestFormData>({
    resolver: zodResolver(mentorshipRequestSchema),
    defaultValues: {
      cv_included: false,
    },
  });

  // Watch introduction field for character count
  const introductionValue = watch('introduction') || '';
  const introductionLength = introductionValue.length;
  const maxIntroductionLength = 500;

  // Check if user has CV when dialog opens
  useEffect(() => {
    if (isOpen && user) {
      setIsCheckingCV(true);
      getCVMetadata(user.id)
        .then((metadata) => {
          if (metadata) {
            setHasCv(true);
            // Set default to true if user has CV
            setValue('cv_included', true);
          } else {
            setHasCv(false);
            setValue('cv_included', false);
          }
        })
        .catch(() => {
          setHasCv(false);
          setValue('cv_included', false);
        })
        .finally(() => {
          setIsCheckingCV(false);
        });
    }
  }, [isOpen, user, setValue]);

  const onSubmit = async (data: MentorshipRequestFormData) => {
    if (!mentor) return;

    setIsSubmitting(true);
    try {
      await createMatch({
        mentor_id: mentor.user_id,
        introduction: data.introduction,
        preferred_time: data.preferred_time,
        cv_included: data.cv_included ?? false,
      });
      showSuccessToast(t('matches.requestSent'));
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('matches.requestDialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('matches.requestDialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* CV Status Message */}
          {!hasCv && !isCheckingCV && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-900">
                {t('matches.noCvPrompt')}
              </p>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="mt-2 p-0 h-auto"
                onClick={() => {
                  handleOpenChange(false);
                  window.location.href = '/profile/edit';
                }}
              >
                {t('matches.uploadCvLink')}
              </Button>
            </div>
          )}

          {/* Introduction Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="introduction">{t('matches.introduction')}</Label>
              <span className="text-xs text-muted-foreground">
                {introductionLength}/{maxIntroductionLength}
              </span>
            </div>
            <Textarea
              id="introduction"
              placeholder={t('matches.introductionPlaceholder')}
              {...register('introduction')}
              className="min-h-[120px] resize-none"
              disabled={isSubmitting}
            />
            {errors.introduction && (
              <p className="text-sm text-destructive">{errors.introduction.message}</p>
            )}
          </div>

          {/* Preferred Time Field */}
          <div className="space-y-2">
            <Label htmlFor="preferred_time">{t('matches.preferredTime')}</Label>
            <Input
              id="preferred_time"
              type="text"
              placeholder={t('matches.preferredTimePlaceholder')}
              {...register('preferred_time')}
              disabled={isSubmitting}
            />
            {errors.preferred_time && (
              <p className="text-sm text-destructive">{errors.preferred_time.message}</p>
            )}
          </div>

          {/* CV Include Checkbox */}
          {hasCv && !isCheckingCV && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
              <Checkbox
                id="cv_included"
                {...register('cv_included')}
                disabled={isSubmitting || isCheckingCV}
              />
              <Label htmlFor="cv_included" className="text-sm cursor-pointer">
                {t('matches.includeCv')}
              </Label>
            </div>
          )}
        </form>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? t('mentor.sending') : t('matches.sendRequest')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
