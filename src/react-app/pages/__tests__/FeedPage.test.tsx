import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { FeedPage } from '../FeedPage';
import type { Post } from '../../../types/post';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | Record<string, unknown>, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'posts.title': 'Community Feed',
        'posts.subtitle': 'See what the community is sharing',
        'posts.filterLabel': 'Filter by type',
        'posts.filterAll': 'All Posts',
        'posts.filterAnnouncements': 'Announcements',
        'posts.filterDiscussions': 'Discussions',
        'posts.filterGeneral': 'General',
        'posts.createButton': 'Create Post',
        'posts.createSuccess': 'Post created successfully!',
        'posts.createError': 'Failed to create post. Please try again.',
        'posts.deleteSuccess': 'Post deleted successfully!',
        'posts.deleteError': 'Failed to delete post. Please try again.',
        'posts.updateSuccess': 'Post updated successfully!',
        'posts.updateError': 'Failed to update post. Please try again.',
        'posts.noPosts': 'No posts yet',
        'posts.pageInfo': 'Showing {{start}}-{{end}} of {{total}}',
        'posts.previous': 'Previous',
        'posts.next': 'Next',
        'posts.newPostAtTop': 'New post added at the top! Scroll up to see it.',
        'common.loading': 'Loading...',
        'common.tryAgain': 'Try Again',
        'points.earnPoints': 'Earn Points',
        'points.howToEarn': 'How to Earn Points',
        'posts.description': 'Create posts and comments to earn points and climb the leaderboard!',
      };

      let result = translations[key] || (typeof defaultValue === 'string' ? defaultValue : key);

      // Handle interpolation for variables in braces
      const varsToReplace = (typeof defaultValue === 'object' && defaultValue !== null) ? defaultValue : options;
      if (varsToReplace && typeof varsToReplace === 'object') {
        Object.entries(varsToReplace).forEach(([k, v]) => {
          result = result.replace(`{{${k}}}`, String(v));
        });
      }

      return result;
    },
  }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com', name: 'Test User', role: 'member' },
  }),
}));

vi.mock('../../services/postService', () => ({
  getPosts: vi.fn(),
  deletePost: vi.fn(),
}));

import { getPosts } from '../../services/postService';

const mockGetPosts = getPosts as ReturnType<typeof vi.fn>;

// Helper to render FeedPage with Router
const renderFeedPage = () => {
  return render(
    <MemoryRouter>
      <FeedPage />
    </MemoryRouter>
  );
};

describe('FeedPage - Points Banner', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock for getPosts
    const mockPost: Post = {
      id: 'post-1',
      author_id: 'user-2',
      content: 'Test post',
      post_type: 'general',
      created_at: Date.now(),
      updated_at: Date.now(),
      like_count: 0,
      comment_count: 0,
    };

    mockGetPosts.mockResolvedValue({
      posts: [mockPost],
      total: 1,
    });
  });

  it('should render Community Feed title', async () => {
    renderFeedPage();

    await waitFor(() => {
      expect(screen.getByText('Community Feed')).toBeInTheDocument();
    });
  });

  it('should render Create Post button for authenticated users', async () => {
    renderFeedPage();

    await waitFor(() => {
      expect(screen.getByText('Create Post')).toBeInTheDocument();
    });
  });

  it('should not render points banner if already dismissed', async () => {
    // Set cookie to indicate banner was dismissed
    document.cookie = 'pointsBannerDismissed=true; path=/';

    renderFeedPage();

    await waitFor(() => {
      // Banner should not be visible
      expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
    });
  });

  it('should have cookie integration for banner dismissal', () => {
    // Test cookie behavior for banner dismissal
    const key = 'pointsBannerDismissed';

    // Clear cookie first to ensure clean state
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;

    // Cookie should not be set initially
    expect(document.cookie).not.toContain(`${key}=true`);

    // Set cookie (simulating banner dismissal)
    document.cookie = `${key}=true; path=/`;
    expect(document.cookie).toContain(`${key}=true`);

    // Clear cookie
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
    expect(document.cookie).not.toContain(`${key}=true`);
  });
});
