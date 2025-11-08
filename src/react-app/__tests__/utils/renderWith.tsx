/**
 * Render Utilities for React Testing
 *
 * Centralizes React component rendering with providers and test setup.
 * Eliminates repeated render setup across component test files.
 *
 * Usage:
 * ```typescript
 * const { render } = renderWithAuth(user, token);
 * render(<MyComponent />);
 * ```
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';
import type { User } from '../../types/user';

// ============================================================================
// Types
// ============================================================================

export interface RenderWithAuthOptions {
  user?: User | null;
  token?: string | null;
  i18n?: typeof i18n;
}

export interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  wrapper?: React.ComponentType;
}

// ============================================================================
// Core Render Functions
// ============================================================================

/**
 * Creates a render function with authentication context
 */
export function createRenderWithAuth(options: RenderWithAuthOptions = {}) {
  const { token = null, i18n: i18nInstance = i18n } = options;

  // Setup localStorage for auth token
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }

  // Mock AuthContext
  const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
  };

  /**
   * Custom render function
   */
  function renderWithAuth(
    ui: ReactElement,
    renderOptions: CustomRenderOptions = {}
  ) {
    const { wrapper: Wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrowserRouter>
        <I18nextProvider i18n={i18nInstance}>
          <AuthProvider>{children}</AuthProvider>
        </I18nextProvider>
      </BrowserRouter>
    ), ...rest } = renderOptions;

    return render(ui, { wrapper: Wrapper, ...rest });
  }

  return { render: renderWithAuth };
}

/**
 * Render with default unauthenticated state
 */
export function renderUnauthenticated(
  ui: ReactElement,
  renderOptions: CustomRenderOptions = {}
) {
  return createRenderWithAuth({ user: null, token: null })(ui, renderOptions);
}

/**
 * Render with authenticated user
 */
export function renderAuthenticated(
  ui: ReactElement,
  user: User,
  token: string = 'test-token',
  renderOptions: CustomRenderOptions = {}
) {
  return createRenderWithAuth({ user, token })(ui, renderOptions);
}

/**
 * Render with router only (no auth)
 */
export function renderWithRouter(
  ui: ReactElement,
  renderOptions: CustomRenderOptions = {}
) {
  const { wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <I18nextProvider i18n={i18n}>
        {children}
      </I18nextProvider>
    </BrowserRouter>
  ), ...rest } = renderOptions;

  return render(ui, { wrapper, ...rest });
}

/**
 * Render with all providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options: {
    user?: User | null;
    token?: string | null;
    router?: boolean;
    i18n?: typeof i18n;
  } = {},
  renderOptions: CustomRenderOptions = {}
) {
  const { token = null, router = true, i18n: i18nInstance = i18n } = options;

  // Setup localStorage
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }

  const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
  };

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    let content = (
      <I18nextProvider i18n={i18nInstance}>
        <AuthProvider>{children}</AuthProvider>
      </I18nextProvider>
    );

    if (router) {
      content = <BrowserRouter>{content}</BrowserRouter>;
    }

    return content;
  };

  const { wrapper = Wrapper, ...rest } = renderOptions;

  return render(ui, { wrapper, ...rest });
}
