import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useFeatures } from '../context/FeatureContext';
import { Button } from '../components/ui/button';
import {
  listAllFeatures,
  createFeature,
  toggleFeature,
  deleteFeature,
} from '../services/featureService';
import type { FeatureFlag, FeatureFlagCreateRequest } from '../../types/features';
import { UserRole } from '../../types/role';
import { ApiError } from '../services/apiClient';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

/**
 * AdminFeatureTogglePage Component
 * Allows admins to view and manage feature flags
 */
export function AdminFeatureTogglePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { refetch: refetchEnabledFeatures } = useFeatures();
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingFeatureId, setUpdatingFeatureId] = useState<string | null>(null);
  const [deletingFeatureId, setDeletingFeatureId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFeature, setNewFeature] = useState<FeatureFlagCreateRequest>({
    feature_key: '',
    display_name: '',
    description: '',
    enabled: false,
  });

  // Fetch features list
  const loadFeatures = async () => {
    try {
      setLoading(true);
      setError(null);
      const featuresList = await listAllFeatures();
      setFeatures(featuresList);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load features';
      setError(message);
      toast.error(message);
      console.error('Error loading features:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeatures();
  }, []);

  // Handle toggle feature
  const handleToggle = async (featureId: string, currentEnabled: boolean) => {
    try {
      setUpdatingFeatureId(featureId);
      const updated = await toggleFeature(featureId, !currentEnabled);
      toast.success(
        t('admin.features.toggleSuccess', `Feature ${updated.enabled ? 'enabled' : 'disabled'}`)
      );

      // Update local state
      setFeatures((prev) =>
        prev.map((f) => (f.id === featureId ? updated : f))
      );

      // Refetch enabled features to update global state
      await refetchEnabledFeatures();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to toggle feature';
      toast.error(message);
      console.error('Error toggling feature:', err);
    } finally {
      setUpdatingFeatureId(null);
    }
  };

  // Handle delete feature
  const handleDelete = async (featureId: string, displayName: string) => {
    if (!confirm(t('admin.features.confirmDelete', `Delete feature "${displayName}"?`))) {
      return;
    }

    try {
      setDeletingFeatureId(featureId);
      await deleteFeature(featureId);
      toast.success(t('admin.features.deleteSuccess', 'Feature deleted'));

      // Update local state
      setFeatures((prev) => prev.filter((f) => f.id !== featureId));

      // Refetch enabled features to update global state
      await refetchEnabledFeatures();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete feature';
      toast.error(message);
      console.error('Error deleting feature:', err);
    } finally {
      setDeletingFeatureId(null);
    }
  };

  // Handle create feature
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const created = await createFeature(newFeature);
      toast.success(t('admin.features.createSuccess', 'Feature created'));

      // Update local state
      setFeatures((prev) => [created, ...prev]);

      // Reset form
      setNewFeature({
        feature_key: '',
        display_name: '',
        description: '',
        enabled: false,
      });
      setShowCreateForm(false);

      // Refetch if created as enabled
      if (created.enabled) {
        await refetchEnabledFeatures();
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create feature';
      toast.error(message);
      console.error('Error creating feature:', err);
    }
  };

  // Check if user is admin
  if (!user || user.role !== UserRole.Admin) {
    return <Navigate to="/" replace />;
  }

  // Render loading state
  if (loading && features.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{t('admin.features.title', 'Feature Toggles')}</h1>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.features.title', 'Feature Toggles')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('admin.features.description', 'Manage feature flags for the platform')}
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? t('common.cancel', 'Cancel') : t('admin.features.addFeature', 'Add Feature')}
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-semibold mb-4">
            {t('admin.features.createNew', 'Create New Feature')}
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('admin.features.featureKey', 'Feature Key')} *
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., new_feature"
                value={newFeature.feature_key}
                onChange={(e) =>
                  setNewFeature({ ...newFeature, feature_key: e.target.value })
                }
                required
                pattern="[a-z0-9_]+"
                title="Only lowercase letters, numbers, and underscores"
              />
              <p className="text-sm text-muted-foreground mt-1">
                {t('admin.features.keyHint', 'Lowercase letters, numbers, and underscores only')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('admin.features.displayName', 'Display Name')} *
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., New Feature"
                value={newFeature.display_name}
                onChange={(e) =>
                  setNewFeature({ ...newFeature, display_name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('admin.features.description', 'Description')}
              </label>
              <textarea
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Optional description"
                rows={3}
                value={newFeature.description}
                onChange={(e) =>
                  setNewFeature({ ...newFeature, description: e.target.value })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enabled"
                checked={newFeature.enabled}
                onChange={(e) =>
                  setNewFeature({ ...newFeature, enabled: e.target.checked })
                }
              />
              <label htmlFor="enabled" className="text-sm font-medium">
                {t('admin.features.enabledOnCreate', 'Enable immediately')}
              </label>
            </div>
            <Button type="submit">{t('common.create', 'Create')}</Button>
          </form>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg">
          {error}
        </div>
      )}

      {/* Features Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium">
                {t('admin.features.table.name', 'Feature Name')}
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium">
                {t('admin.features.table.key', 'Key')}
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium">
                {t('admin.features.table.description', 'Description')}
              </th>
              <th className="px-6 py-3 text-center text-sm font-medium">
                {t('admin.features.table.status', 'Status')}
              </th>
              <th className="px-6 py-3 text-center text-sm font-medium">
                {t('admin.features.table.actions', 'Actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {features.map((feature) => (
              <tr key={feature.id} className="hover:bg-muted/50">
                <td className="px-6 py-4 text-sm font-medium">{feature.display_name}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground font-mono">
                  {feature.feature_key}
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {feature.description || '-'}
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      feature.enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {feature.enabled
                      ? t('admin.features.enabled', 'Enabled')
                      : t('admin.features.disabled', 'Disabled')}
                  </span>
                </td>
                <td className="px-6 py-4 text-center space-x-2">
                  <Button
                    size="sm"
                    variant={feature.enabled ? 'outline' : 'default'}
                    onClick={() => handleToggle(feature.id, feature.enabled)}
                    disabled={updatingFeatureId === feature.id}
                  >
                    {updatingFeatureId === feature.id
                      ? t('common.loading', 'Loading...')
                      : feature.enabled
                      ? t('admin.features.disable', 'Disable')
                      : t('admin.features.enable', 'Enable')}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(feature.id, feature.display_name)}
                    disabled={deletingFeatureId === feature.id}
                  >
                    {deletingFeatureId === feature.id
                      ? t('common.loading', 'Loading...')
                      : t('common.delete', 'Delete')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {features.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {t('admin.features.empty', 'No feature flags yet. Create one to get started.')}
          </p>
        </div>
      )}
    </div>
  );
}
