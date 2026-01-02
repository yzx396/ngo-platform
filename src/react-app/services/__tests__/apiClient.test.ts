import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toast } from 'sonner';
import {
  apiFetch,
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  apiUpload,
  ApiError,
  handleApiError,
  showSuccessToast,
} from '../apiClient';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock console methods to avoid noise in test output
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('ApiError', () => {
  it('should create an ApiError with message and default values', () => {
    const error = new ApiError('Test error');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.message).toBe('Test error');
    expect(error.status).toBe(0);
    expect(error.data).toBe(null);
  });

  it('should create an ApiError with status and data', () => {
    const errorData = { field: 'email', reason: 'invalid' };
    const error = new ApiError('Validation error', 400, errorData);
    expect(error.message).toBe('Validation error');
    expect(error.status).toBe(400);
    expect(error.data).toEqual(errorData);
  });
});

describe('apiFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should make a successful GET request and return JSON data', async () => {
    const mockData = { id: '1', name: 'Test' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const result = await apiFetch('/api/v1/test');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/test', {
      headers: expect.any(Headers),
      credentials: 'include',
    });
    expect(result).toEqual(mockData);
  });

  it('should include credentials with every request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await apiFetch('/api/v1/test');

    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs?.credentials).toBe('include');
  });

  it('should set Content-Type header for requests with body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await apiFetch('/api/v1/test', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
    });

    const callArgs = mockFetch.mock.calls[0][1];
    const headers = callArgs?.headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('should not override existing Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await apiFetch('/api/v1/test', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
      headers: {
        'Content-Type': 'application/custom',
      },
    });

    const callArgs = mockFetch.mock.calls[0][1];
    const headers = callArgs?.headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/custom');
  });

  it('should throw ApiError on HTTP 400 error with error message from response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Bad request' }),
    });

    await expect(apiFetch('/api/v1/test')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Bad request',
      status: 400,
    });
  });

  it('should throw ApiError on HTTP 401 error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    });

    await expect(apiFetch('/api/v1/test')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Unauthorized',
      status: 401,
    });
  });

  it('should throw ApiError on HTTP 404 error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
    });

    await expect(apiFetch('/api/v1/test')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Not found',
      status: 404,
    });
  });

  it('should throw ApiError on HTTP 500 error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' }),
    });

    await expect(apiFetch('/api/v1/test')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Internal server error',
      status: 500,
    });
  });

  it('should use default error message when response has no error field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    await expect(apiFetch('/api/v1/test')).rejects.toMatchObject({
      message: 'HTTP 500',
      status: 500,
    });
  });

  it('should handle error response with invalid JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    await expect(apiFetch('/api/v1/test')).rejects.toMatchObject({
      message: 'HTTP 500',
      status: 500,
    });
  });

  it('should retry on network error (Failed to fetch)', async () => {
    const networkError = new TypeError('Failed to fetch');
    mockFetch
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    const promise = apiFetch('/api/v1/test', { retries: 2 });

    // Fast-forward through retry delays
    await vi.runAllTimersAsync();

    const result = await promise;

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ success: true });
    expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
  });

  it('should retry on network error (NetworkError)', async () => {
    const networkError = new TypeError('NetworkError when attempting to fetch resource');
    mockFetch
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    const promise = apiFetch('/api/v1/test', { retries: 1 });

    await vi.runAllTimersAsync();

    const result = await promise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ success: true });
  });

  it('should use exponential backoff for retries', async () => {
    const networkError = new TypeError('Failed to fetch');
    mockFetch
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    const promise = apiFetch('/api/v1/test', { retries: 2 });

    // First retry after 1000ms (2^0 * 1000)
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Second retry after 2000ms (2^1 * 1000)
    await vi.advanceTimersByTimeAsync(2000);
    expect(mockFetch).toHaveBeenCalledTimes(3);

    await promise;
  });

  it('should throw ApiError after exhausting all retries', async () => {
    const networkError = new TypeError('Failed to fetch');
    mockFetch.mockRejectedValue(networkError);

    const promise = apiFetch('/api/v1/test', { retries: 2 });

    // Prevent unhandled rejection warning during timer advancement
    promise.catch(() => {});

    await vi.runAllTimersAsync();

    await expect(promise).rejects.toMatchObject({
      message: 'Failed to fetch',
      status: 0,
    });

    expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should not retry on non-retryable errors (ApiError)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Bad request' }),
    });

    await expect(apiFetch('/api/v1/test', { retries: 3 })).rejects.toThrow(ApiError);

    expect(mockFetch).toHaveBeenCalledTimes(1); // No retries
  });

  it('should not retry on non-network TypeError', async () => {
    const otherError = new TypeError('Some other type error');
    mockFetch.mockRejectedValueOnce(otherError);

    await expect(apiFetch('/api/v1/test', { retries: 3 })).rejects.toMatchObject({
      message: 'Some other type error',
    });

    expect(mockFetch).toHaveBeenCalledTimes(1); // No retries
  });

  it('should wrap non-ApiError exceptions in ApiError', async () => {
    const genericError = new Error('Something went wrong');
    mockFetch.mockRejectedValueOnce(genericError);

    await expect(apiFetch('/api/v1/test', { retries: 0 })).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Something went wrong',
      status: 0,
    });
  });

  it('should handle unknown error types', async () => {
    mockFetch.mockRejectedValueOnce('string error');

    await expect(apiFetch('/api/v1/test', { retries: 0 })).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Unknown error',
      status: 0,
    });
  });

  it('should use custom retry count when provided', async () => {
    const networkError = new TypeError('Failed to fetch');
    mockFetch.mockRejectedValue(networkError);

    const promise = apiFetch('/api/v1/test', { retries: 1 });

    // Prevent unhandled rejection warning during timer advancement
    promise.catch(() => {});

    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow(ApiError);

    expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
  });

  it('should not retry when retries is set to 0', async () => {
    const networkError = new TypeError('Failed to fetch');
    mockFetch.mockRejectedValue(networkError);

    await expect(apiFetch('/api/v1/test', { retries: 0 })).rejects.toThrow(ApiError);

    expect(mockFetch).toHaveBeenCalledTimes(1); // No retries
  });

  it('should preserve custom headers in request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await apiFetch('/api/v1/test', {
      headers: {
        'X-Custom-Header': 'custom-value',
      },
    });

    const callArgs = mockFetch.mock.calls[0][1];
    const headers = callArgs?.headers as Headers;
    expect(headers.get('X-Custom-Header')).toBe('custom-value');
  });

  it('should pass through other fetch options', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await apiFetch('/api/v1/test', {
      method: 'POST',
      signal: new AbortController().signal,
    });

    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs?.method).toBe('POST');
    expect(callArgs?.signal).toBeInstanceOf(AbortSignal);
  });
});

describe('HTTP Method Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('apiGet', () => {
    it('should make a GET request', async () => {
      const mockData = { id: '1' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await apiGet('/api/v1/test');

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/test', expect.objectContaining({
        method: 'GET',
      }));
      expect(result).toEqual(mockData);
    });

    it('should pass through options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await apiGet('/api/v1/test', { retries: 1 });

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('apiPost', () => {
    it('should make a POST request with data', async () => {
      const mockData = { id: '1' };
      const postData = { name: 'Test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await apiPost('/api/v1/test', postData);

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/test', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(postData),
      }));
      expect(result).toEqual(mockData);
    });

    it('should make a POST request without data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await apiPost('/api/v1/test');

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/test', expect.objectContaining({
        method: 'POST',
        body: undefined,
      }));
    });

    it('should pass through options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await apiPost('/api/v1/test', { data: 'test' }, { retries: 1 });

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('apiPut', () => {
    it('should make a PUT request with data', async () => {
      const mockData = { id: '1', updated: true };
      const putData = { name: 'Updated' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await apiPut('/api/v1/test/1', putData);

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/test/1', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(putData),
      }));
      expect(result).toEqual(mockData);
    });

    it('should make a PUT request without data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await apiPut('/api/v1/test/1');

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/test/1', expect.objectContaining({
        method: 'PUT',
        body: undefined,
      }));
    });
  });

  describe('apiPatch', () => {
    it('should make a PATCH request with data', async () => {
      const mockData = { id: '1', patched: true };
      const patchData = { status: 'active' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await apiPatch('/api/v1/test/1', patchData);

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/test/1', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(patchData),
      }));
      expect(result).toEqual(mockData);
    });

    it('should make a PATCH request without data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await apiPatch('/api/v1/test/1');

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/test/1', expect.objectContaining({
        method: 'PATCH',
        body: undefined,
      }));
    });
  });

  describe('apiDelete', () => {
    it('should make a DELETE request', async () => {
      const mockData = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await apiDelete('/api/v1/test/1');

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/test/1', expect.objectContaining({
        method: 'DELETE',
      }));
      expect(result).toEqual(mockData);
    });

    it('should pass through options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await apiDelete('/api/v1/test/1', { retries: 0 });

      expect(mockFetch).toHaveBeenCalled();
    });
  });
});

describe('apiUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should upload FormData successfully', async () => {
    const mockData = { fileId: 'file_123', url: 'https://example.com/file.pdf' };
    const formData = new FormData();
    formData.append('file', new Blob(['test']), 'test.txt');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const result = await apiUpload('/api/v1/upload', formData);

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/upload', expect.objectContaining({
      method: 'POST',
      body: formData,
      credentials: 'include',
    }));
    expect(result).toEqual(mockData);
  });

  it('should not set Content-Type header for FormData', async () => {
    const formData = new FormData();
    formData.append('file', new Blob(['test']), 'test.txt');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await apiUpload('/api/v1/upload', formData);

    const callArgs = mockFetch.mock.calls[0][1];
    const headers = callArgs?.headers as Headers;
    // Browser sets Content-Type with boundary automatically
    expect(headers.has('Content-Type')).toBe(false);
  });

  it('should retry file upload on network error', async () => {
    const formData = new FormData();
    const networkError = new TypeError('Failed to fetch');

    mockFetch
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    const promise = apiUpload('/api/v1/upload', formData, { retries: 1 });

    await vi.runAllTimersAsync();

    const result = await promise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ success: true });
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('File upload to /api/v1/upload failed'),
      networkError
    );
  });

  it('should throw ApiError on upload failure', async () => {
    const formData = new FormData();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'File too large' }),
    });

    await expect(apiUpload('/api/v1/upload', formData)).rejects.toMatchObject({
      message: 'File too large',
      status: 400,
    });
  });

  it('should use exponential backoff for upload retries', async () => {
    const formData = new FormData();
    const networkError = new TypeError('Failed to fetch');

    mockFetch
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    const promise = apiUpload('/api/v1/upload', formData, { retries: 2 });

    await vi.advanceTimersByTimeAsync(1000);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(2000);
    expect(mockFetch).toHaveBeenCalledTimes(3);

    await promise;
  });

  it('should throw error after exhausting upload retries', async () => {
    const formData = new FormData();
    const networkError = new TypeError('Failed to fetch');
    mockFetch.mockRejectedValue(networkError);

    const promise = apiUpload('/api/v1/upload', formData, { retries: 2 });

    // Prevent unhandled rejection warning during timer advancement
    promise.catch(() => {});

    await vi.runAllTimersAsync();

    await expect(promise).rejects.toMatchObject({
      message: 'Failed to fetch',
    });

    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('should handle upload error with invalid JSON response', async () => {
    const formData = new FormData();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    await expect(apiUpload('/api/v1/upload', formData)).rejects.toMatchObject({
      message: 'HTTP 500',
      status: 500,
    });
  });

  it('should pass through custom options for upload', async () => {
    const formData = new FormData();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await apiUpload('/api/v1/upload', formData, {
      retries: 1,
      headers: {
        'X-Custom-Header': 'value',
      },
    });

    const callArgs = mockFetch.mock.calls[0][1];
    const headers = callArgs?.headers as Headers;
    expect(headers.get('X-Custom-Header')).toBe('value');
  });
});

describe('Error Handling Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleApiError', () => {
    it('should show toast error and return message for ApiError', () => {
      const error = new ApiError('API error occurred', 500);

      const message = handleApiError(error);

      expect(toast.error).toHaveBeenCalledWith('API error occurred');
      expect(consoleErrorSpy).toHaveBeenCalledWith('API Error:', error);
      expect(message).toBe('API error occurred');
    });

    it('should show generic error message for non-ApiError', () => {
      const error = new Error('Generic error');

      const message = handleApiError(error);

      expect(toast.error).toHaveBeenCalledWith('An error occurred');
      expect(consoleErrorSpy).toHaveBeenCalledWith('API Error:', error);
      expect(message).toBe('An error occurred');
    });

    it('should handle unknown error types', () => {
      const error = 'string error';

      const message = handleApiError(error);

      expect(toast.error).toHaveBeenCalledWith('An error occurred');
      expect(message).toBe('An error occurred');
    });
  });

  describe('showSuccessToast', () => {
    it('should show success toast with custom message', () => {
      showSuccessToast('Operation completed');

      expect(toast.success).toHaveBeenCalledWith('Operation completed');
    });

    it('should show default success message when no message provided', () => {
      showSuccessToast();

      expect(toast.success).toHaveBeenCalledWith('Success');
    });
  });
});
