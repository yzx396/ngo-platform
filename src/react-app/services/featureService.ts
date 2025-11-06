import { apiGet, apiPost, apiPatch, apiDelete } from './apiClient';
import type {
  FeatureFlag,
  FeatureFlagCreateRequest,
  FeatureFlagUpdateRequest,
  EnabledFeatures,
} from '../../types/features';

/**
 * Feature Service
 * Handles all feature flag API operations
 */

/**
 * List all feature flags (admin only)
 * @returns Array of all feature flags
 */
export async function listAllFeatures(): Promise<FeatureFlag[]> {
  return apiGet<FeatureFlag[]>('/api/v1/admin/features');
}

/**
 * Create a new feature flag (admin only)
 * @param request - Feature flag creation request
 * @returns Created feature flag
 */
export async function createFeature(
  request: FeatureFlagCreateRequest
): Promise<FeatureFlag> {
  return apiPost<FeatureFlag>('/api/v1/admin/features', request);
}

/**
 * Toggle a feature flag on/off (admin only)
 * @param id - Feature flag ID
 * @param enabled - New enabled status
 * @returns Updated feature flag
 */
export async function toggleFeature(
  id: string,
  enabled: boolean
): Promise<FeatureFlag> {
  const body: FeatureFlagUpdateRequest = { enabled };
  return apiPatch<FeatureFlag>(`/api/v1/admin/features/${id}`, body);
}

/**
 * Delete a feature flag (admin only)
 * @param id - Feature flag ID
 */
export async function deleteFeature(id: string): Promise<void> {
  return apiDelete<void>(`/api/v1/admin/features/${id}`);
}

/**
 * Get enabled features (public endpoint)
 * @returns Map of feature keys to boolean values
 */
export async function getEnabledFeatures(): Promise<EnabledFeatures> {
  return apiGet<EnabledFeatures>('/api/v1/features/enabled');
}
