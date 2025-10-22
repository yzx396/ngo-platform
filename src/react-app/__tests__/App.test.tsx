import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<App />);
      expect(document.body).toBeTruthy();
    });

    it('should render the home page with main heading', () => {
      render(<App />);
      expect(
        screen.getByRole('heading', { name: /Welcome to Lead Forward Platform/i })
      ).toBeInTheDocument();
    });

    it('should render the navbar with brand logo', () => {
      render(<App />);
      expect(screen.getByText('Lead Forward')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should have navigation links', () => {
      render(<App />);
      // Check for Lead Forward branding link (Home)
      expect(screen.getByText('Lead Forward')).toBeInTheDocument();
      // Find the first occurrence of Browse Mentors button in navbar
      const browseMentorsButtons = screen.getAllByRole('button', { name: /Browse Mentors/i });
      expect(browseMentorsButtons.length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /My Matches/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /My Profile/i })).toBeInTheDocument();
    });

    it('should display main action buttons on home page', () => {
      render(<App />);
      // Check for Browse Mentors button (which replaces "Start Browsing")
      const browseMentorsButtons = screen.getAllByRole('button', { name: /Browse Mentors/i });
      expect(browseMentorsButtons.length).toBeGreaterThan(0);
      // Check for Become a Mentor button (which replaces "Set Up Profile")
      const becomeMentorButtons = screen.getAllByRole('button', { name: /Become a Mentor/i });
      expect(becomeMentorButtons.length).toBeGreaterThan(0);
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
    it('should display key features on home page', () => {
      render(<App />);
      // Check for features section heading
      expect(screen.getByRole('heading', { name: /Key Features/i })).toBeInTheDocument();
      // Check that at least one feature is displayed
      const features = screen.getAllByText(/Connect with experienced professionals/i);
      expect(features.length).toBeGreaterThan(0);
    });

    it('should have auth button in navbar', () => {
      render(<App />);
      // When not authenticated, should show "Sign In" button
      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    });
  });
});
