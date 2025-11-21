import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiClientModule from '../apiClient';
import { uploadCV, getCVMetadata, deleteCV } from '../cvService';

vi.mock('../apiClient', () => ({
  apiUpload: vi.fn(),
  apiGet: vi.fn(),
  apiDelete: vi.fn(),
}));

describe('cvService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadCV', () => {
    it('should upload a valid PDF file', async () => {
      const mockFile = new File(['content'], 'resume.pdf', { type: 'application/pdf' });
      const mockResponse = {
        success: true,
        filename: 'cv_user_123.pdf',
        originalFilename: 'resume.pdf',
        uploadedAt: Date.now(),
        message: 'CV uploaded successfully',
      };
      vi.mocked(apiClientModule.apiUpload).mockResolvedValue(mockResponse);

      const result = await uploadCV('user_123', mockFile);

      expect(apiClientModule.apiUpload).toHaveBeenCalledWith(
        '/api/v1/users/user_123/cv',
        expect.any(FormData)
      );
      expect(result.success).toBe(true);
      expect(result.filename).toBe('cv_user_123.pdf');
    });

    it('should throw error when no file provided', async () => {
      const mockFile = null as any;

      await expect(uploadCV('user_123', mockFile)).rejects.toThrow('No file provided');
    });

    it('should throw error when file is not PDF', async () => {
      const mockFile = new File(['content'], 'document.txt', { type: 'text/plain' });

      await expect(uploadCV('user_123', mockFile)).rejects.toThrow('Only PDF files are allowed');
    });

    it('should throw error when file is too large', async () => {
      const largeContent = new ArrayBuffer(6 * 1024 * 1024);
      const mockFile = new File([largeContent], 'large.pdf', { type: 'application/pdf' });

      await expect(uploadCV('user_123', mockFile)).rejects.toThrow(
        'File size must be less than 5MB'
      );
    });

    it('should throw error when upload fails', async () => {
      const mockFile = new File(['content'], 'resume.pdf', { type: 'application/pdf' });
      const error = new Error('Upload failed');
      vi.mocked(apiClientModule.apiUpload).mockRejectedValue(error);

      await expect(uploadCV('user_123', mockFile)).rejects.toThrow('Upload failed');
    });
  });

  describe('getCVMetadata', () => {
    it('should fetch CV metadata', async () => {
      const mockResponse = {
        cv_url: 'https://example.com/cv_user_123.pdf',
        cv_filename: 'cv_user_123.pdf',
        cv_uploaded_at: Date.now(),
      };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getCVMetadata('user_123');

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/users/user_123/cv');
      expect(result).toEqual(mockResponse);
    });

    it('should return null when CV not found (404)', async () => {
      const error = new Error('404');
      vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

      const result = await getCVMetadata('user_123');

      expect(result).toBeNull();
    });

    it('should throw non-404 errors', async () => {
      const error = new Error('Server error');
      vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

      await expect(getCVMetadata('user_123')).rejects.toThrow('Server error');
    });
  });

  describe('deleteCV', () => {
    it('should delete CV successfully', async () => {
      const mockResponse = { success: true, message: 'CV deleted' };
      vi.mocked(apiClientModule.apiDelete).mockResolvedValue(mockResponse);

      const result = await deleteCV('user_123');

      expect(apiClientModule.apiDelete).toHaveBeenCalledWith('/api/v1/users/user_123/cv');
      expect(result.success).toBe(true);
    });

    it('should throw error when CV not found', async () => {
      const error = new Error('CV not found');
      vi.mocked(apiClientModule.apiDelete).mockRejectedValue(error);

      await expect(deleteCV('user_123')).rejects.toThrow('CV not found');
    });

    it('should throw error when unauthorized', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiDelete).mockRejectedValue(error);

      await expect(deleteCV('user_123')).rejects.toThrow('Unauthorized');
    });
  });
});
