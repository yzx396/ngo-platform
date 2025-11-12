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
import { getCVMetadata, uploadCV } from '../services/cvService';
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
 * CV upload is now mandatory before sending request
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
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isUploadingCV, setIsUploadingCV] = useState(false);
  const [cvUploadError, setCvUploadError] = useState<string | null>(null);
  const [useExistingCV, setUseExistingCV] = useState(false);
  const [existingCVFilename, setExistingCVFilename] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<MentorshipRequestFormData>({
    resolver: zodResolver(mentorshipRequestSchema),
  });

  // Watch introduction field for character count
  const introductionValue = watch('introduction') || '';
  const introductionLength = introductionValue.length;
  const maxIntroductionLength = 500;

  // Check if user has CV when dialog opens
  useEffect(() => {
    if (isOpen && user) {
      setIsCheckingCV(true);
      setCvUploadError(null);
      getCVMetadata(user.id)
        .then((metadata) => {
          if (metadata) {
            setHasCv(true);
            setUseExistingCV(true);
            setExistingCVFilename(metadata.cv_filename);
          } else {
            setHasCv(false);
            setUseExistingCV(false);
            setExistingCVFilename(null);
          }
        })
        .catch(() => {
          setHasCv(false);
          setUseExistingCV(false);
          setExistingCVFilename(null);
        })
        .finally(() => {
          setIsCheckingCV(false);
        });
    }
  }, [isOpen, user]);

  const handleCVFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      setCvUploadError(t('matches.cvUploadError') + ': Only PDF files are allowed');
      return;
    }

    // Validate file size (5MB max)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setCvUploadError(t('matches.cvUploadError') + ': File size must be less than 5MB');
      return;
    }

    setCvFile(file);
    setCvUploadError(null);
    setUseExistingCV(false);
  };

  const uploadCVFile = async (): Promise<boolean> => {
    if (!cvFile || !user) return false;

    setIsUploadingCV(true);
    setCvUploadError(null);

    try {
      await uploadCV(user.id, cvFile);
      showSuccessToast(t('matches.cvUploadSuccess'));
      setHasCv(true);
      setExistingCVFilename(cvFile.name);
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : t('matches.cvUploadError');
      setCvUploadError(errorMsg);
      handleApiError(error);
      return false;
    } finally {
      setIsUploadingCV(false);
    }
  };

  const onSubmit = async (data: MentorshipRequestFormData) => {
    if (!mentor || !user) return;

    // Validate CV requirement
    if (!useExistingCV && !cvFile) {
      setCvUploadError(t('matches.cvRequired'));
      return;
    }

    setIsSubmitting(true);
    setCvUploadError(null);

    try {
      // Upload new CV if selected
      if (cvFile && !useExistingCV) {
        const uploadSuccess = await uploadCVFile();
        if (!uploadSuccess) {
          setIsSubmitting(false);
          return;
        }
      }

      // Create match request with cv_included flag set to true
      await createMatch({
        mentor_id: mentor.user_id,
        introduction: data.introduction,
        preferred_time: data.preferred_time,
        cv_included: true, // Always true since CV is mandatory
      });

      showSuccessToast(t('matches.requestSent'));
      reset();
      setCvFile(null);
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
      setCvFile(null);
      setCvUploadError(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('matches.requestDialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('matches.requestDialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              disabled={isSubmitting || isUploadingCV}
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
              disabled={isSubmitting || isUploadingCV}
            />
            {errors.preferred_time && (
              <p className="text-sm text-destructive">{errors.preferred_time.message}</p>
            )}
          </div>

          {/* CV Upload Section */}
          <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                {t('matches.cvUpload')} <span className="text-red-500">*</span>
              </Label>
              {isCheckingCV && (
                <span className="text-xs text-muted-foreground">{t('common.loading')}</span>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {t('matches.cvUploadDescription')}
            </p>

            {/* Show existing CV option if available */}
            {hasCv && existingCVFilename && !cvFile && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                  <Checkbox
                    id="use_existing_cv"
                    checked={useExistingCV}
                    onCheckedChange={(checked) => setUseExistingCV(checked as boolean)}
                    disabled={isSubmitting || isUploadingCV}
                  />
                  <Label htmlFor="use_existing_cv" className="text-sm cursor-pointer flex-1">
                    {t('matches.useExistingCV')}: <strong>{existingCVFilename}</strong>
                  </Label>
                </div>
                {!useExistingCV && (
                  <p className="text-xs text-blue-600">{t('matches.uploadNewCV')}</p>
                )}
              </div>
            )}

            {/* File upload input */}
            {(!useExistingCV || !hasCv) && (
              <div className="space-y-2">
                <Input
                  id="cv_file"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleCVFileSelect}
                  disabled={isSubmitting || isUploadingCV}
                  className="cursor-pointer"
                />
                {cvFile && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t('matches.cvFileSelected', { filename: cvFile.name })}
                  </div>
                )}
              </div>
            )}

            {/* Upload progress */}
            {isUploadingCV && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                {t('matches.cvUploading')}
              </div>
            )}

            {/* Error message */}
            {cvUploadError && (
              <p className="text-sm text-destructive">{cvUploadError}</p>
            )}

            {/* Validation reminder */}
            {!hasCv && !cvFile && (
              <p className="text-xs text-red-600">{t('matches.cvRequired')}</p>
            )}
          </div>
        </form>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting || isUploadingCV}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || isUploadingCV || (!useExistingCV && !cvFile && !hasCv)}
          >
            {isSubmitting || isUploadingCV ? t('mentor.sending') : t('matches.sendRequest')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
