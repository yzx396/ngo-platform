/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '../../types/user';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  getUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider component that wraps the application
 * Manages authentication state and provides auth utilities
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from cookie on mount
  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const response = await fetch('/api/v1/auth/me', {
          credentials: 'include', // Send cookies with request
          signal: abortController.signal,
        });

        if (response.ok) {
          const userData = await response.json();
          if (isMounted) {
            setUser(userData);
          }
        } else {
          // No valid cookie or session expired
          if (isMounted) {
            setUser(null);
          }
        }
      } catch (error) {
        if (isMounted && error instanceof Error && error.name !== 'AbortError') {
          console.error('Failed to restore session:', error);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  /**
   * Login with user data (token is in HTTP-only cookie)
   */
  const login = (userData: User) => {
    setUser(userData);
  };

  /**
   * Logout and clear server-side cookie
   */
  const logout = async () => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      setUser(null);
    }
  };

  /**
   * Get current user info
   */
  const getUser = async (): Promise<User | null> => {
    try {
      const response = await fetch('/api/v1/auth/me', {
        credentials: 'include', // Send cookies with request
      });

      if (!response.ok) {
        if (response.status === 401) {
          setUser(null);
        }
        return null;
      }

      const userData = await response.json();
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Failed to get user:', error);
      return null;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    getUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
