import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiClientModule from '../apiClient';
import {
  listAllFeatures,
  createFeature,
  toggleFeature,
  deleteFeature,
  getEnabledFeatures,
} from '../featureService';

vi.mock('../apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

describe('featureService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockFeature = {
    id: 'feature_123',
    key: 'new_blog_editor',
    name: 'New Blog Editor',
    description: 'Modern rich text editor for blogs',
    enabled: true,
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  describe('listAllFeatures', () => {
    it('should list all feature flags', async () => {
      const mockResponse = [mockFeature, { ...mockFeature, id: 'feature_456', key: 'dark_mode' }];
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await listAllFeatures();

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/admin/features');
      expect(result).toHaveLength(2);
    });

    it('should throw error when unauthorized', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

      await expect(listAllFeatures()).rejects.toThrow('Unauthorized');
    });
  });

  describe('createFeature', () => {
    it('should create a feature flag', async () => {
      vi.mocked(apiClientModule.apiPost).mockResolvedValue(mockFeature);

      const request = {
        key: 'new_blog_editor',
        name: 'New Blog Editor',
        description: 'Modern rich text editor',
        enabled: true,
      };

      const result = await createFeature(request);

      expect(apiClientModule.apiPost).toHaveBeenCalledWith('/api/v1/admin/features', request);
      expect(result).toEqual(mockFeature);
    });

    it('should throw error when key already exists', async () => {
      const error = new Error('Feature already exists');
      vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

      const request = { key: 'existing', name: 'Existing', description: 'Desc', enabled: true };

      await expect(createFeature(request)).rejects.toThrow('Feature already exists');
    });

    it('should throw error when unauthorized', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

      const request = { key: 'new', name: 'New', description: 'Desc', enabled: true };

      await expect(createFeature(request)).rejects.toThrow('Unauthorized');
    });
  });

  describe('toggleFeature', () => {
    it('should enable a feature flag', async () => {
      const enabled = { ...mockFeature, enabled: true };
      vi.mocked(apiClientModule.apiPatch).mockResolvedValue(enabled);

      const result = await toggleFeature('feature_123', true);

      expect(apiClientModule.apiPatch).toHaveBeenCalledWith('/api/v1/admin/features/feature_123', {
        enabled: true,
      });
      expect(result.enabled).toBe(true);
    });

    it('should disable a feature flag', async () => {
      const disabled = { ...mockFeature, enabled: false };
      vi.mocked(apiClientModule.apiPatch).mockResolvedValue(disabled);

      const result = await toggleFeature('feature_123', false);

      expect(apiClientModule.apiPatch).toHaveBeenCalledWith('/api/v1/admin/features/feature_123', {
        enabled: false,
      });
      expect(result.enabled).toBe(false);
    });

    it('should throw error when feature not found', async () => {
      const error = new Error('Feature not found');
      vi.mocked(apiClientModule.apiPatch).mockRejectedValue(error);

      await expect(toggleFeature('invalid_id', true)).rejects.toThrow('Feature not found');
    });
  });

  describe('deleteFeature', () => {
    it('should delete a feature flag', async () => {
      vi.mocked(apiClientModule.apiDelete).mockResolvedValue(undefined);

      await deleteFeature('feature_123');

      expect(apiClientModule.apiDelete).toHaveBeenCalledWith('/api/v1/admin/features/feature_123');
    });

    it('should throw error when feature not found', async () => {
      const error = new Error('Feature not found');
      vi.mocked(apiClientModule.apiDelete).mockRejectedValue(error);

      await expect(deleteFeature('invalid_id')).rejects.toThrow('Feature not found');
    });

    it('should throw error when unauthorized', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiDelete).mockRejectedValue(error);

      await expect(deleteFeature('feature_123')).rejects.toThrow('Unauthorized');
    });
  });

  describe('getEnabledFeatures', () => {
    it('should get enabled features', async () => {
      const mockResponse = {
        new_blog_editor: true,
        dark_mode: false,
        new_dashboard: true,
      };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getEnabledFeatures();

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/features/enabled');
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty feature list', async () => {
      const mockResponse = {};
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getEnabledFeatures();

      expect(result).toEqual({});
    });
  });
});
