import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { OAuthCallbackPage } from '../pages/OAuthCallbackPage';

// Mock react-router-dom useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

describe('OAuthCallbackPage', () => {
  const mockNavigate = vi.fn();
  const mockFetch = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    (useNavigate as any).mockReturnValue(mockNavigate);
    global.fetch = mockFetch;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should extract authorization code from URL and send it to backend', async () => {
    // Mock successful OAuth callback response
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          token: 'jwt-token-123',
          user: {
            id: 'user-456',
            email: 'user@example.com',
            name: 'Test User',
          },
        }),
        { status: 200 }
      )
    );

    // Set up URL with authorization code
    delete (window as any).location;
    window.location = new URL('http://localhost:5173/auth/google/callback?code=auth-code-123') as any;

    render(
      <BrowserRouter>
        <AuthProvider>
          <OAuthCallbackPage />
        </AuthProvider>
      </BrowserRouter>
    );

    // Wait for the callback to be processed
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Verify the fetch was called with the correct code in the URL
    const callArgs = mockFetch.mock.calls[0][0];
    expect(callArgs).toContain('code=auth-code-123');
    expect(callArgs).toContain('/api/v1/auth/google/callback');
  });

  it('should handle missing authorization code', async () => {
    // Set up URL without authorization code
    delete (window as any).location;
    window.location = new URL('http://localhost:5173/auth/google/callback') as any;

    render(
      <BrowserRouter>
        <AuthProvider>
          <OAuthCallbackPage />
        </AuthProvider>
      </BrowserRouter>
    );

    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText(/missing authorization code/i)).toBeInTheDocument();
    });

    // Should not call fetch if code is missing
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should handle OAuth error from Google', async () => {
    // Set up URL with error parameter
    delete (window as any).location;
    window.location = new URL('http://localhost:5173/auth/google/callback?error=access_denied') as any;

    render(
      <BrowserRouter>
        <AuthProvider>
          <OAuthCallbackPage />
        </AuthProvider>
      </BrowserRouter>
    );

    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText(/oauth error/i)).toBeInTheDocument();
    });

    // Should not call fetch if OAuth error is present
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should handle backend authentication failure', async () => {
    // Mock failed authentication response
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: 'Invalid authorization code' }),
        { status: 400 }
      )
    );

    // Set up URL with authorization code
    delete (window as any).location;
    window.location = new URL('http://localhost:5173/auth/google/callback?code=invalid-code') as any;

    render(
      <BrowserRouter>
        <AuthProvider>
          <OAuthCallbackPage />
        </AuthProvider>
      </BrowserRouter>
    );

    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText(/invalid authorization code/i)).toBeInTheDocument();
    });
  });

  it('should redirect to home page after successful login', async () => {
    // Mock successful OAuth callback response
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          token: 'jwt-token-456',
          user: {
            id: 'user-789',
            email: 'success@example.com',
            name: 'Success User',
          },
        }),
        { status: 200 }
      )
    );

    // Set up URL with authorization code
    delete (window as any).location;
    window.location = new URL('http://localhost:5173/auth/google/callback?code=valid-code') as any;

    render(
      <BrowserRouter>
        <AuthProvider>
          <OAuthCallbackPage />
        </AuthProvider>
      </BrowserRouter>
    );

    // Wait for navigation to be called
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    // Verify token was stored
    expect(localStorage.getItem('auth_token')).toBe('jwt-token-456');
  });

  it('should properly encode authorization code with special characters', async () => {
    // Mock successful response
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          token: 'jwt-token-789',
          user: {
            id: 'user-abc',
            email: 'encoded@example.com',
            name: 'Encoded User',
          },
        }),
        { status: 200 }
      )
    );

    // Authorization codes from Google may have special characters
    const specialCode = 'code/with+special=chars&more';
    delete (window as any).location;
    window.location = new URL(`http://localhost:5173/auth/google/callback?code=${encodeURIComponent(specialCode)}`) as any;

    render(
      <BrowserRouter>
        <AuthProvider>
          <OAuthCallbackPage />
        </AuthProvider>
      </BrowserRouter>
    );

    // Wait for the callback to be processed
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Verify the fetch was called with the properly encoded code
    const callArgs = mockFetch.mock.calls[0][0];
    expect(callArgs).toContain(encodeURIComponent(specialCode));
  });
});
