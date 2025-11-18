import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import App from '../App';

// Mock the feature service - default to no features enabled
vi.mock('../services/featureService', () => ({
  getEnabledFeatures: vi.fn().mockResolvedValue({}),
}));

// Mock the forum service
vi.mock('../services/forumService', () => ({
  forumService: {
    getCategories: vi.fn().mockResolvedValue([
      { id: 'cat-1', name: 'General Discussion', description: 'General discussion' },
      { id: 'cat-2', name: 'Announcements', description: 'Announcements' },
    ]),
    getAllCategories: vi.fn().mockResolvedValue([
      { id: 'cat-1', name: 'General Discussion', description: 'General discussion', parent_id: null },
      { id: 'cat-2', name: 'Announcements', description: 'Announcements', parent_id: null },
    ]),
  },
}));

describe('App', () => {
  beforeEach(() => {
    // Mock fetch to return 401 for auth endpoint (unauthenticated)
    global.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }))
    );
  });
  describe('Rendering', () => {
    it('should render without crashing', async () => {
      await act(async () => {
        render(<App />);
      });
      expect(document.body).toBeTruthy();
    });

    it('should render the home page with main heading', async () => {
      await act(async () => {
        render(<App />);
      });
      await waitFor(() => {
        // Home redirects to /forums which shows ForumHomePage
        // Check for Forums heading
        expect(
          screen.getByRole('heading', { name: /Forums|Lead Forward/i, level: 1 })
        ).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should render the navbar with brand logo', async () => {
      await act(async () => {
        render(<App />);
      });
      expect(screen.getByAltText('Lead Forward')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should have navigation links', async () => {
      await act(async () => {
        render(<App />);
      });
      // Check for Lead Forward branding logo (Home - clicking logo goes to home)
      expect(screen.getByAltText('Lead Forward')).toBeInTheDocument();
      // Check for navigation links in navbar: Events
      // (Home is represented by the logo, not a button)
      // Note: Leaderboard is hidden when feature flag is disabled (default in tests)
      const eventsButtons = screen.getAllByRole('button', { name: /Events/i });
      expect(eventsButtons.length).toBeGreaterThan(0);
    });

    it('should display public navigation links on home page', async () => {
      await act(async () => {
        render(<App />);
      });
      // Wait for HomePage to load
      await waitFor(() => {
        // Feed link is hidden when feature flag is disabled (default in tests)
        const feedLinks = screen.queryAllByRole('link', { name: /Feed/i });
        expect(feedLinks.length).toBe(0);
        // Note: Leaderboard is also hidden when feature flag is disabled (default in tests)
        const leaderboardLinks = screen.queryAllByRole('link', { name: /Leaderboard/i });
        expect(leaderboardLinks.length).toBe(0);
        // Forums should always be visible
        const forumsLinks = screen.getAllByRole('link', { name: /Forums/i });
        expect(forumsLinks.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button labels', async () => {
      await act(async () => {
        render(<App />);
      });
      const buttons = screen.getAllByRole('button');

      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach((button) => {
        expect(button).toHaveAccessibleName();
      });
    });

    it('should have accessible navigation links', async () => {
      await act(async () => {
        render(<App />);
      });
      const links = screen.getAllByRole('link');

      expect(links.length).toBeGreaterThan(0);
      links.forEach((link) => {
        expect(link).toHaveAttribute('href');
      });
    });

    it('should use semantic HTML structure', async () => {
      await act(async () => {
        render(<App />);
      });

      // Check for nav element
      expect(document.body.querySelector('nav')).toBeTruthy();
      // Check for main content
      expect(document.body.querySelector('a')).toBeTruthy();
      expect(document.body.querySelector('button')).toBeTruthy();
    });
  });

  describe('Page Content', () => {
    it('should display community features on home page', async () => {
      await act(async () => {
        render(<App />);
      });
      // Wait for home page to load - home redirects to /feed which shows FeedPage
      await waitFor(() => {
        // Check for navigation links that indicate we're on the app
        const navElements = screen.getAllByRole('link');
        expect(navElements.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });

    it('should have auth button in navbar', async () => {
      await act(async () => {
        render(<App />);
      });
      // When not authenticated, should show "Sign In" button
      // Get all Sign In buttons and ensure at least one exists (could be in navbar, sidebar, etc)
      const signInButtons = screen.getAllByRole('button', { name: /Sign In/i });
      expect(signInButtons.length).toBeGreaterThan(0);
    });
  });
});
