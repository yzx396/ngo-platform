import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { uploadCV, deleteCV } from '../services/cvService';
import { handleApiError, showSuccessToast } from '../services/apiClient';

interface CVUploadProps {
  userId: string;
  currentFilename?: string | null;
  currentUploadedAt?: number | null;
  onUploadSuccess?: (filename: string, uploadedAt: number) => void;
  onDeleteSuccess?: () => void;
}

/**
 * CVUpload Component
 * Allows users to upload and manage their CV
 * Supports PDF files only, max 5MB
 */
export function CVUpload({
  userId,
  currentFilename,
  currentUploadedAt,
  onUploadSuccess,
  onDeleteSuccess,
}: CVUploadProps) {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      handleApiError(new Error(t('cv.errors.onlyPDF')));
      return;
    }

    // Validate file size (5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      handleApiError(new Error(t('cv.errors.fileTooLarge')));
      return;
    }

    // Upload file
    setIsUploading(true);
    try {
      const response = await uploadCV(userId, file);
      showSuccessToast(t('cv.uploadSuccess'));
      onUploadSuccess?.(response.originalFilename, response.uploadedAt);

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('cv.confirmDelete'))) return;

    setIsDeleting(true);
    try {
      await deleteCV(userId);
      showSuccessToast(t('cv.deleteSuccess'));
      onDeleteSuccess?.();
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('cv.yourCV')}</CardTitle>
        <CardDescription>{t('cv.description')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current CV Status */}
        {currentFilename ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{t('cv.currentCV')}</p>
                <p className="text-sm text-gray-600">{currentFilename}</p>
                {currentUploadedAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t('cv.uploadedOn')} {new Date(currentUploadedAt * 1000).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800">
                {t('cv.uploaded')}
              </Badge>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isDeleting}
              >
                {isUploading ? t('common.uploading') : t('cv.replaceCV')}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting || isUploading}
              >
                {isDeleting ? t('common.deleting') : t('cv.deleteCV')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center space-y-3">
            <p className="text-sm text-gray-600">{t('cv.noCV')}</p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? t('common.uploading') : t('cv.uploadCV')}
            </Button>
          </div>
        )}

        {/* File Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>✓ {t('cv.pdfOnly')}</p>
          <p>✓ {t('cv.maxSize')}</p>
          <p>✓ {t('cv.fileHelp')}</p>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          disabled={isUploading || isDeleting}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
}
