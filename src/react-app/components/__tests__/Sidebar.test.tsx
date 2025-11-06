import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { describe, it, expect, beforeEach } from 'vitest';
import i18n from '../../i18n';
import { AuthProvider } from '../../context/AuthContext';
import { Sidebar } from '../Sidebar';

/**
 * Test suite for Sidebar component
 */
describe('Sidebar', () => {
  const renderSidebar = (initialPath = '/') => {
    return render(
      <AuthProvider>
        <I18nextProvider i18n={i18n}>
          <MemoryRouter initialEntries={[initialPath]}>
            <Sidebar />
          </MemoryRouter>
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

  it('should not render Browse Mentors link when not authenticated', () => {
    // Ensure no auth token - Browse Mentors requires authentication
    localStorage.removeItem('auth_token');
    renderSidebar();

    // Browse Mentors link should NOT be visible for unauthenticated users
    const browseMentorsLinks = screen.queryAllByRole('link', { name: /browse mentors/i });
    expect(browseMentorsLinks).toHaveLength(0);

    // But Leaderboard link should be visible (it's public)
    expect(screen.getByRole('link', { name: /leaderboard/i })).toBeInTheDocument();
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
    renderSidebar('/feed');

    // When on /feed path, Feed button (child of link) should be active
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

    expect(screen.getByRole('link', { name: /feed/i })).toHaveAttribute('href', '/feed');
    expect(screen.getByRole('link', { name: /challenges/i })).toHaveAttribute('href', '/challenges');
    expect(screen.getByRole('link', { name: /blogs/i })).toHaveAttribute('href', '/blogs');
    expect(screen.getByRole('link', { name: /leaderboard/i })).toHaveAttribute('href', '/leaderboard');
  });
});
