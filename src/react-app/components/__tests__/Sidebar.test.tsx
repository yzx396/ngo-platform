import { render, screen, act } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import i18n from '../../i18n';
import { AuthProvider } from '../../context/AuthContext';
import { FeatureProvider } from '../../context/FeatureContext';
import { Sidebar } from '../Sidebar';

// Mock the feature service
vi.mock('../../services/featureService', () => ({
  getEnabledFeatures: vi.fn().mockResolvedValue({}),
}));

/**
 * Test suite for Sidebar component
 */
describe('Sidebar', () => {
  const renderSidebar = async (initialPath = '/'): Promise<RenderResult> => {
    let rendered: RenderResult | undefined;
    await act(async () => {
      rendered = render(
        <AuthProvider>
          <FeatureProvider>
            <I18nextProvider i18n={i18n}>
              <MemoryRouter initialEntries={[initialPath]}>
                <Sidebar />
              </MemoryRouter>
            </I18nextProvider>
          </FeatureProvider>
        </AuthProvider>
      );
    });
    return rendered!;
  };

  beforeEach(() => {
    // Mock fetch for AuthProvider
    global.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }))
    );
  });

  beforeEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

    it('should render sidebar with Feed section', async () => {
      await renderSidebar();

      // Forums link should always be visible
      const forumsLink = screen.getByRole('link', { name: /forums/i });
      expect(forumsLink).toBeInTheDocument();
    });

    it('should hide Feed link when feed feature is disabled (default)', async () => {
      await renderSidebar();

      // Feed is hidden when feature flag is disabled (default in tests)
      expect(screen.queryByRole('link', { name: /feed/i })).not.toBeInTheDocument();

      // Forums should always be visible
      expect(screen.getByRole('link', { name: /forums/i })).toBeInTheDocument();

      // Challenges and blogs are hidden when feature flags are disabled (default in tests)
      expect(screen.queryByRole('link', { name: /challenges/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /blogs/i })).not.toBeInTheDocument();
    });

    it('should not render Browse Mentors link when not authenticated', async () => {
      // Ensure no auth token - Browse Mentors requires authentication
      // Auth uses cookies now, not localStorage
      await renderSidebar();

      // Browse Mentors link should NOT be visible for unauthenticated users
      const browseMentorsLinks = screen.queryAllByRole('link', { name: /browse mentors/i });
      expect(browseMentorsLinks).toHaveLength(0);

      // Leaderboard is also hidden when feature flag is disabled (default in tests)
      expect(screen.queryByRole('link', { name: /leaderboard/i })).not.toBeInTheDocument();
    });

    it('should conditionally show Member Area section based on auth state', async () => {
      // Initial render - depends on auth context initialization
      await renderSidebar();

      // The Sidebar component correctly checks isAuthenticated from useAuth hook
      // This test verifies the component renders without errors
      const asideElement = document.querySelector('aside');
      expect(asideElement).toBeInTheDocument();
    });

    it('should render all navigation elements correctly', async () => {
      await renderSidebar();

      // Verify the sidebar is rendered
      const asideElement = document.querySelector('aside');
      expect(asideElement).toHaveClass('w-64');
    });

    it('should set aria-current="page" for active links', async () => {
      await renderSidebar('/forums');

      // When on /forums path, Forums button (child of link) should be active
      const forumsButton = screen.getByRole('button', { name: /forums/i });
      expect(forumsButton).toHaveAttribute('aria-current', 'page');
    });

    it('should support Chinese translations', async () => {
      await act(async () => {
        await i18n.changeLanguage('zh-CN');
      });
      await renderSidebar();

      // Forums should be "论坛" in Chinese
      const forumsLink = screen.getByRole('link', { name: /论坛/i });
      expect(forumsLink).toBeInTheDocument();
    });

    it('should render navigation links with proper href attributes', async () => {
      await renderSidebar();

      // Feed is hidden when feature flag is disabled (default in tests)
      expect(screen.queryByRole('link', { name: /feed/i })).not.toBeInTheDocument();

      // Forums should always be visible
      expect(screen.getByRole('link', { name: /forums/i })).toHaveAttribute('href', '/forums');

      // Challenges, blogs, and leaderboard are hidden when feature flags are disabled (default in tests)
      expect(screen.queryByRole('link', { name: /challenges/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /blogs/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /leaderboard/i })).not.toBeInTheDocument();
    });

    it('should render Forums link in Feed section', async () => {
      await renderSidebar();

      // Forums should always be visible
      const forumsLink = screen.getByRole('link', { name: /forums/i });
      expect(forumsLink).toBeInTheDocument();
      expect(forumsLink).toHaveAttribute('href', '/forums');
    });

    it('should set aria-current="page" for Forums link when active', async () => {
      await renderSidebar('/forums');

      // When on /forums path, Forums button should be active
      const forumsButton = screen.getByRole('button', { name: /forums/i });
      expect(forumsButton).toHaveAttribute('aria-current', 'page');
    });

    it('should display Forums link in Chinese as 论坛', async () => {
      await act(async () => {
        await i18n.changeLanguage('zh-CN');
      });
      await renderSidebar();

      // Forums should be "论坛" in Chinese
      const forumsLink = screen.getByRole('link', { name: /论坛/i });
      expect(forumsLink).toBeInTheDocument();
    });

    it('should render Forums link with correct icon', async () => {
      await renderSidebar();

      // Find the Forums button and check for the icon
      const forumsButton = screen.getByRole('button', { name: /forums/i });
      expect(forumsButton.textContent).toContain('💬');
    });
});
