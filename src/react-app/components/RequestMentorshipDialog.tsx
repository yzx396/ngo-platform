import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { handleApiError, showSuccessToast } from '../services/apiClient';
import { createMatch } from '../services/matchService';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MentorshipRequestFormData>({
    resolver: zodResolver(mentorshipRequestSchema),
  });

  const onSubmit = async (data: MentorshipRequestFormData) => {
    if (!mentor) return;

    setIsSubmitting(true);
    try {
      await createMatch({
        mentor_id: mentor.user_id,
        introduction: data.introduction,
        preferred_time: data.preferred_time,
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
          {/* Introduction Field */}
          <div className="space-y-2">
            <Label htmlFor="introduction">{t('matches.introduction')}</Label>
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
