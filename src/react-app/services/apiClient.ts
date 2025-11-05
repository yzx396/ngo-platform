import { toast } from 'sonner';

/**
 * API Client Configuration
 * Handles all HTTP requests with:
 * - JWT Bearer token authentication
 * - Retry logic with exponential backoff
 * - Error handling and logging
 */

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

interface ApiOptions extends RequestInit {
  retries?: number;
}

/**
 * Exponential backoff delay calculation
 * @param attempt - Current attempt number (0-based)
 * @returns Delay in milliseconds
 */
function getBackoffDelay(attempt: number): number {
  return INITIAL_DELAY_MS * Math.pow(2, attempt);
}

/**
 * Check if an error is retryable
 * Network errors and 5xx server errors are retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof TypeError) {
    // Network errors are retryable
    return error.message.includes('Failed to fetch') || error.message.includes('NetworkError');
  }
  return false;
}

/**
 * Get JWT token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

/**
 * Main API fetch function with retry logic
 * @param url - API endpoint URL
 * @param options - Fetch options including custom retries count
 * @returns Promise with response data or error
 */
export async function apiFetch<T>(
  url: string,
  options: ApiOptions = {}
): Promise<T> {
  const { retries = MAX_RETRIES, ...fetchOptions } = options;

  // Ensure proper content type for JSON
  const headers = new Headers(fetchOptions.headers || {});
  if (!headers.has('Content-Type') && fetchOptions.body) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject JWT token for authentication
  const token = getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const finalOptions: RequestInit = {
    ...fetchOptions,
    headers,
  };

  let lastError: Error | null = null;

  // Attempt request with retries
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, finalOptions);

      // Handle HTTP error statuses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = (errorData as Record<string, unknown>).error as string || `HTTP ${response.status}`;
        throw new ApiError(errorMessage, response.status, errorData);
      }

      // Parse and return response
      const data = await response.json() as T;
      return data;
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable and we have attempts left
      if (isRetryableError(error) && attempt < retries) {
        const delay = getBackoffDelay(attempt);
        console.warn(
          `Request to ${url} failed (attempt ${attempt + 1}/${retries + 1}). ` +
          `Retrying in ${delay}ms...`,
          error
        );
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // No more retries, throw error
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error',
        0,
        error
      );
    }
  }

  // Should never reach here, but just in case
  throw lastError || new ApiError('Request failed after all retries');
}

/**
 * Custom API Error class for better error handling
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 0,
    public data: unknown = null
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Helper function for GET requests
 */
export async function apiGet<T>(url: string, options?: ApiOptions): Promise<T> {
  return apiFetch<T>(url, { ...options, method: 'GET' });
}

/**
 * Helper function for POST requests
 */
export async function apiPost<T>(
  url: string,
  data?: unknown,
  options?: ApiOptions
): Promise<T> {
  return apiFetch<T>(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Helper function for PUT requests
 */
export async function apiPut<T>(
  url: string,
  data?: unknown,
  options?: ApiOptions
): Promise<T> {
  return apiFetch<T>(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Helper function for PATCH requests
 */
export async function apiPatch<T>(
  url: string,
  data?: unknown,
  options?: ApiOptions
): Promise<T> {
  return apiFetch<T>(url, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Helper function for DELETE requests
 */
export async function apiDelete<T>(url: string, options?: ApiOptions): Promise<T> {
  return apiFetch<T>(url, { ...options, method: 'DELETE' });
}

/**
 * Helper function for file uploads (multipart/form-data)
 * Used for uploading files to R2 via the backend
 */
export async function apiUpload<T>(
  url: string,
  formData: FormData,
  options?: ApiOptions
): Promise<T> {
  const { retries = MAX_RETRIES, ...fetchOptions } = options || {};

  // Create headers without Content-Type - browser will set it with boundary
  const headers = new Headers(fetchOptions.headers || {});

  // Inject JWT token for authentication
  const token = getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const finalOptions: RequestInit = {
    ...fetchOptions,
    method: 'POST',
    headers,
    body: formData,
  };

  let lastError: Error | null = null;

  // Attempt request with retries
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, finalOptions);

      // Handle HTTP error statuses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = (errorData as Record<string, unknown>).error as string || `HTTP ${response.status}`;
        throw new ApiError(errorMessage, response.status, errorData);
      }

      // Parse and return response
      const data = await response.json() as T;
      return data;
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable and we have attempts left
      if (isRetryableError(error) && attempt < retries) {
        const delay = getBackoffDelay(attempt);
        console.warn(
          `File upload to ${url} failed (attempt ${attempt + 1}/${retries + 1}). ` +
          `Retrying in ${delay}ms...`,
          error
        );
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // No more retries, throw error
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error',
        0,
        error
      );
    }
  }

  // Should never reach here, but just in case
  throw lastError || new ApiError('File upload failed after all retries');
}

/**
 * Helper to handle API errors with user feedback
 * Automatically shows toast notification for errors
 */
export function handleApiError(error: unknown): string {
  const message = error instanceof ApiError ? error.message : 'An error occurred';
  toast.error(message);
  console.error('API Error:', error);
  return message;
}

/**
 * Helper to show success toast (for mutations)
 */
export function showSuccessToast(message: string = 'Success'): void {
  toast.success(message);
}
