import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<App />);
      expect(document.body).toBeTruthy();
    });

    it('should render the home page with main heading', async () => {
      render(<App />);
      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /Community Feed/i })
        ).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should render the navbar with brand logo', () => {
      render(<App />);
      expect(screen.getByAltText('Lead Forward')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should have navigation links', () => {
      render(<App />);
      // Check for Lead Forward branding logo (Home)
      expect(screen.getByAltText('Lead Forward')).toBeInTheDocument();
      // Find the first occurrence of Browse Mentors button in navbar
      const browseMentorsButtons = screen.getAllByRole('button', { name: /Browse Mentors/i });
      expect(browseMentorsButtons.length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /My Matches/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /My Profile/i })).toBeInTheDocument();
    });

    it('should display main action buttons on home page', async () => {
      render(<App />);
      // Wait for HomePage to load
      await waitFor(() => {
        // Check for Browse Mentors link (appears in navbar and sidebar)
        const browseMentorsLinks = screen.getAllByRole('link', { name: /Browse Mentors/i });
        expect(browseMentorsLinks.length).toBeGreaterThan(0);
        // Check for Feed link in sidebar
        const feedLinks = screen.getAllByRole('link', { name: /Feed/i });
        expect(feedLinks.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      render(<App />);
      const buttons = screen.getAllByRole('button');

      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach((button) => {
        expect(button).toHaveAccessibleName();
      });
    });

    it('should have accessible navigation links', () => {
      render(<App />);
      const links = screen.getAllByRole('link');

      expect(links.length).toBeGreaterThan(0);
      links.forEach((link) => {
        expect(link).toHaveAttribute('href');
      });
    });

    it('should use semantic HTML structure', () => {
      const { container } = render(<App />);

      // Check for nav element
      expect(container.querySelector('nav')).toBeTruthy();
      // Check for main content
      expect(container.querySelector('a')).toBeTruthy();
      expect(container.querySelector('button')).toBeTruthy();
    });
  });

  describe('Page Content', () => {
    it('should display community features on home page', async () => {
      render(<App />);
      // Wait for FeedPage to load and check for Community Feed heading
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Community Feed/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should have auth button in navbar', () => {
      render(<App />);
      // When not authenticated, should show "Sign In" button
      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    });
  });
});
