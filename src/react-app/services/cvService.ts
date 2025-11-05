import { apiUpload, apiGet, apiDelete } from './apiClient';

/**
 * CV Service
 * Handles all CV-related API operations
 */

interface CVUploadResponse {
  success: boolean;
  filename: string;
  originalFilename: string;
  uploadedAt: number;
  message: string;
}

interface CVMetadata {
  cv_url: string;
  cv_filename: string | null;
  cv_uploaded_at: number | null;
}

/**
 * Upload a CV file for the current user
 * @param file - PDF file to upload
 * @param userId - User ID to upload CV for
 * @returns Upload response with file info
 */
export async function uploadCV(userId: string, file: File): Promise<CVUploadResponse> {
  // Validate file before upload
  if (!file) {
    throw new Error('No file provided');
  }

  if (file.type !== 'application/pdf') {
    throw new Error('Only PDF files are allowed');
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size must be less than 5MB');
  }

  // Create FormData
  const formData = new FormData();
  formData.append('file', file);

  // Upload to backend
  return apiUpload<CVUploadResponse>(`/api/v1/users/${userId}/cv`, formData);
}

/**
 * Get CV metadata for a user
 * @param userId - User ID to get CV for
 * @returns CV metadata or null if no CV exists
 */
export async function getCVMetadata(userId: string): Promise<CVMetadata | null> {
  try {
    const response = await apiGet<CVMetadata>(`/api/v1/users/${userId}/cv`);
    return response;
  } catch (error) {
    // 404 means no CV - return null instead of throwing
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Delete CV for a user
 * @param userId - User ID to delete CV for
 * @returns Success response
 */
export async function deleteCV(userId: string): Promise<{ success: boolean; message: string }> {
  return apiDelete<{ success: boolean; message: string }>(`/api/v1/users/${userId}/cv`);
}
