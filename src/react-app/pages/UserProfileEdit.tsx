import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { CVUpload } from '../components/CVUpload';
import { getCVMetadata } from '../services/cvService';
import { userService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { handleApiError, showSuccessToast } from '../services/apiClient';

/**
 * UserProfileEdit Page
 * Allows authenticated users to manage their profile including:
 * - Upload/update/delete CV
 * - View profile information
 */
export function UserProfileEdit() {
  const { t } = useTranslation();
  const { user, getUser } = useAuth();
  const [cvFilename, setCVFilename] = useState<string | null>(null);
  const [cvUploadedAt, setCVUploadedAt] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState({ name: '', email: '' });

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

  // Initialize form data when user is loaded
  useEffect(() => {
    if (user) {
      setFormData({ name: user.name, email: user.email });
    }
  }, [user]);

  const validateForm = (): boolean => {
    const newErrors = { name: '', email: '' };
    let isValid = true;

    if (!formData.name.trim()) {
      newErrors.name = t('profile.nameRequired');
      isValid = false;
    }

    if (!formData.email.trim()) {
      newErrors.email = t('profile.emailRequired');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('profile.invalidEmail');
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleEdit = () => {
    setIsEditing(true);
    setErrors({ name: '', email: '' });
  };

  const handleCancel = () => {
    if (user) {
      setFormData({ name: user.name, email: user.email });
    }
    setIsEditing(false);
    setErrors({ name: '', email: '' });
  };

  const handleSave = async () => {
    if (!user || !validateForm()) return;

    setIsSaving(true);
    try {
      await userService.updateUser(user.id, formData);
      await getUser();
      showSuccessToast(t('profile.updateSuccess'));
      setIsEditing(false);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSaving(false);
    }
  };

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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('profile.profileInformation')}</CardTitle>
                <CardDescription>{t('profile.yourAccountDetails')}</CardDescription>
              </div>
              {!isEditing && (
                <Button onClick={handleEdit} variant="outline">
                  {t('profile.editProfile')}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('common.name')}</Label>
                {isEditing ? (
                  <>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('common.name')}
                      disabled={isSaving}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500">{errors.name}</p>
                    )}
                  </>
                ) : (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">{user.name}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('profile.email')}</Label>
                {isEditing ? (
                  <>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder={t('profile.email')}
                      disabled={isSaving}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500">{errors.email}</p>
                    )}
                  </>
                ) : (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">{user.email}</p>
                  </div>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? t('common.loading') : t('profile.saveChanges')}
                </Button>
                <Button onClick={handleCancel} variant="outline" disabled={isSaving}>
                  {t('profile.cancelEdit')}
                </Button>
              </div>
            )}
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
