import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { CVUpload } from '../components/CVUpload';
import { getCVMetadata } from '../services/cvService';
import { useAuth } from '../context/AuthContext';

/**
 * UserProfileEdit Page
 * Allows authenticated users to manage their profile including:
 * - Upload/update/delete CV
 * - View profile information
 */
export function UserProfileEdit() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [cvFilename, setCVFilename] = useState<string | null>(null);
  const [cvUploadedAt, setCVUploadedAt] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user's current CV metadata on mount
  useEffect(() => {
    const loadCVMetadata = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        const metadata = await getCVMetadata(user.id);
        if (metadata) {
          setCVFilename(metadata.cv_filename);
          setCVUploadedAt(metadata.cv_uploaded_at);
        }
      } catch (error) {
        // Silently fail - CV may not exist
        console.error('Failed to load CV metadata:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCVMetadata();
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t('common.myProfile')}</h1>
        <p className="text-muted-foreground">
          {t('profile.manageYourProfile')}
        </p>
      </div>

      <div className="grid gap-8">
        {/* Profile Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.profileInformation')}</CardTitle>
            <CardDescription>{t('profile.yourAccountDetails')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {t('common.name')}
                </label>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">{user.name}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {t('profile.email')}
                </label>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">{user.email}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CV Upload Card */}
        {!isLoading && (
          <CVUpload
            userId={user.id}
            currentFilename={cvFilename}
            currentUploadedAt={cvUploadedAt}
            onUploadSuccess={(filename, uploadedAt) => {
              setCVFilename(filename);
              setCVUploadedAt(uploadedAt);
            }}
            onDeleteSuccess={() => {
              setCVFilename(null);
              setCVUploadedAt(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
