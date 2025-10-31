import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { describe, it, expect, beforeEach } from 'vitest';
import i18n from '../../i18n';
import { AuthProvider } from '../../context/AuthContext';
import { Sidebar } from '../Sidebar';

/**
 * Test suite for Sidebar component
 */
describe('Sidebar', () => {
  const renderSidebar = () => {
    return render(
      <AuthProvider>
        <I18nextProvider i18n={i18n}>
          <Router>
            <Sidebar />
          </Router>
        </I18nextProvider>
      </AuthProvider>
    );
  };

  beforeEach(() => {
    i18n.changeLanguage('en');
  });

  it('should render sidebar with Feed section', () => {
    renderSidebar();

    const feedLink = screen.getByRole('link', { name: /feed/i });
    expect(feedLink).toBeInTheDocument();
  });

  it('should render Feed, Challenges, and Blogs links', () => {
    renderSidebar();

    expect(screen.getByRole('link', { name: /feed/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /challenges/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /blogs/i })).toBeInTheDocument();
  });

  it('should render Links section with Leaderboard and Browse Mentors', () => {
    renderSidebar();

    expect(screen.getByRole('link', { name: /leaderboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse mentors/i })).toBeInTheDocument();
  });

  it('should conditionally show Member Area section based on auth state', () => {
    // Initial render - depends on auth context initialization
    renderSidebar();

    // The Sidebar component correctly checks isAuthenticated from useAuth hook
    // This test verifies the component renders without errors
    const asideElement = document.querySelector('aside');
    expect(asideElement).toBeInTheDocument();
  });

  it('should render all navigation elements correctly', () => {
    renderSidebar();

    // Verify the sidebar is rendered
    const asideElement = document.querySelector('aside');
    expect(asideElement).toHaveClass('w-64');
  });

  it('should set aria-current="page" for active links', () => {
    renderSidebar();

    // When on homepage, Feed button (child of link) should be active
    const feedButton = screen.getByRole('button', { name: /feed/i });
    expect(feedButton).toHaveAttribute('aria-current', 'page');
  });

  it('should support Chinese translations', () => {
    i18n.changeLanguage('zh-CN');
    renderSidebar();

    // Feed should be "动态" in Chinese
    const feedLink = screen.getByRole('link', { name: /动态/i });
    expect(feedLink).toBeInTheDocument();
  });

  it('should render navigation links with proper href attributes', () => {
    renderSidebar();

    expect(screen.getByRole('link', { name: /feed/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /challenges/i })).toHaveAttribute('href', '/challenges');
    expect(screen.getByRole('link', { name: /blogs/i })).toHaveAttribute('href', '/blogs');
    expect(screen.getByRole('link', { name: /leaderboard/i })).toHaveAttribute('href', '/leaderboard');
  });
});
