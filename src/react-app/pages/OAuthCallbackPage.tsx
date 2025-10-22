import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const hasHandledRef = useRef(false);

  useEffect(() => {
    if (hasHandledRef.current) {
      return;
    }
    hasHandledRef.current = true;

    /**
     * Handle OAuth callback
     * Exchange authorization code for JWT token
     */
    const handleCallback = async () => {
      try {
        // Get authorization code from URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const errorParam = params.get('error');

        if (errorParam) {
          throw new Error(`OAuth error: ${errorParam}`);
        }

        if (!code) {
          throw new Error('Missing authorization code');
        }

        // Exchange code for token - pass code in query parameter
        const response = await fetch(`/api/v1/auth/google/callback?code=${encodeURIComponent(code)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Authentication failed');
        }

        const data = await response.json();

        if (!data.token || !data.user) {
          throw new Error('Invalid response from server');
        }

        // Save token and user info
        login(data.token, data.user);

        // Check if there's a return URL saved
        const returnUrl = localStorage.getItem('auth_return_url');
        localStorage.removeItem('auth_return_url'); // Clear it

        // Redirect to return URL or home page
        navigate(returnUrl || '/', { replace: true });
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    };

    handleCallback();
  }, [login, navigate]);

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h1>{t('auth.authenticationFailed')}</h1>
        <p>{error}</p>
        <button onClick={() => navigate('/login', { replace: true })}>
          {t('auth.backToLogin')}
        </button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <h1>{t('auth.signingInTitle')}</h1>
      <p>{t('auth.signingInMessage')}</p>
      <div style={{ marginTop: '20px' }}>
        <div style={{
          display: 'inline-block',
          width: '40px',
          height: '40px',
          border: '4px solid #f3f4f6',
          borderTopColor: '#667eea',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite',
        }}></div>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
