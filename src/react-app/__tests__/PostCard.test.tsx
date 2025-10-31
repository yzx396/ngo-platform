import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PostCard } from '../components/PostCard';
import type { Post } from '../../types/post';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValueOrOptions?: unknown, maybeOptions?: Record<string, unknown>) => {
      // Handle both calling conventions:
      // t(key) -> key
      // t(key, { defaultValue: '...', ...options })
      // t(key, defaultValue, options) <- older convention

      let defaultValue: string | undefined;
      let options: Record<string, unknown> | undefined;

      if (typeof defaultValueOrOptions === 'string') {
        // t(key, defaultValue, options)
        defaultValue = defaultValueOrOptions;
        options = maybeOptions;
      } else if (defaultValueOrOptions && typeof defaultValueOrOptions === 'object') {
        // t(key, { defaultValue: '...', ...options })
        const opts = defaultValueOrOptions as Record<string, unknown>;
        defaultValue = opts.defaultValue as string;
        options = opts;
      }

      if (defaultValue) {
        // Handle interpolation like {{count}}, {{name}}, etc.
        let result = defaultValue;
        if (options) {
          Object.entries(options).forEach(([optKey, value]) => {
            if (optKey !== 'defaultValue') {
              result = result.replace(`{{${optKey}}}`, String(value));
            }
          });
        }
        return result;
      }
      return key;
    },
  }),
}));

const mockPost: Post & { author_name?: string } = {
  id: 'post-1',
  user_id: 'user-1',
  content: 'This is a test post',
  post_type: 'general',
  likes_count: 5,
  comments_count: 2,
  created_at: Math.floor(Date.now() / 1000),
  updated_at: Math.floor(Date.now() / 1000),
  author_name: 'John Doe',
};

describe('PostCard Component', () => {
  describe('Rendering', () => {
    it('should render post content', () => {
      render(<PostCard post={mockPost} />);
      expect(screen.getByText('This is a test post')).toBeInTheDocument();
    });

    it('should render author name', () => {
      render(<PostCard post={mockPost} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render post type badge', () => {
      render(<PostCard post={mockPost} />);
      expect(screen.getByText('General')).toBeInTheDocument();
    });

    it('should render engagement counts', () => {
      render(<PostCard post={mockPost} />);
      expect(screen.getByText(/5 likes/)).toBeInTheDocument();
      expect(screen.getByText(/2 comments/)).toBeInTheDocument();
    });

    it('should handle announcement type', () => {
      const announcementPost: typeof mockPost = {
        ...mockPost,
        post_type: 'announcement',
      };
      render(<PostCard post={announcementPost} />);
      expect(screen.getByText('Announcement')).toBeInTheDocument();
    });

    it('should handle discussion type', () => {
      const discussionPost: typeof mockPost = {
        ...mockPost,
        post_type: 'discussion',
      };
      render(<PostCard post={discussionPost} />);
      expect(screen.getByText('Discussion')).toBeInTheDocument();
    });

    it('should handle missing author name', () => {
      const postWithoutAuthor: typeof mockPost = {
        ...mockPost,
        author_name: undefined,
      };
      render(<PostCard post={postWithoutAuthor} />);
      expect(screen.getByText('Anonymous')).toBeInTheDocument();
    });

    it('should handle zero engagement counts', () => {
      const newPost: typeof mockPost = {
        ...mockPost,
        likes_count: 0,
        comments_count: 0,
      };
      render(<PostCard post={newPost} />);
      expect(screen.getByText(/0 likes/)).toBeInTheDocument();
      expect(screen.getByText(/0 comments/)).toBeInTheDocument();
    });

    it('should handle large engagement counts', () => {
      const popularPost: typeof mockPost = {
        ...mockPost,
        likes_count: 1000,
        comments_count: 500,
      };
      render(<PostCard post={popularPost} />);
      expect(screen.getByText(/1000 likes/)).toBeInTheDocument();
      expect(screen.getByText(/500 comments/)).toBeInTheDocument();
    });
  });

  describe('Time Display', () => {
    it('should display "just now" for very recent posts', () => {
      const recentPost: typeof mockPost = {
        ...mockPost,
        created_at: Math.floor(Date.now() / 1000),
      };
      render(<PostCard post={recentPost} />);
      expect(screen.getByText(/just now/)).toBeInTheDocument();
    });

    it('should display time ago for older posts', () => {
      const olderPost: typeof mockPost = {
        ...mockPost,
        created_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      };
      render(<PostCard post={olderPost} />);
      // Should show "1h ago"
      expect(screen.getByText(/ago/)).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should call onViewDetails when view button clicked', () => {
      const onViewDetails = vi.fn();
      render(<PostCard post={mockPost} onViewDetails={onViewDetails} />);
      const viewButton = screen.getByText('View');
      viewButton.click();
      expect(onViewDetails).toHaveBeenCalled();
    });

    it('should not render view button when onViewDetails not provided', () => {
      render(<PostCard post={mockPost} />);
      const viewButton = screen.queryByText('View');
      expect(viewButton).not.toBeInTheDocument();
    });
  });

  describe('Content Handling', () => {
    it('should preserve line breaks in content', () => {
      const multilinePost: typeof mockPost = {
        ...mockPost,
        content: 'Line 1\nLine 2\nLine 3',
      };
      render(<PostCard post={multilinePost} />);
      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    });

    it('should handle long content', () => {
      const longContent = 'a'.repeat(500);
      const longPost: typeof mockPost = {
        ...mockPost,
        content: longContent,
      };
      render(<PostCard post={longPost} />);
      expect(screen.getByText(new RegExp(longContent))).toBeInTheDocument();
    });

    it('should handle special characters in content', () => {
      const specialPost: typeof mockPost = {
        ...mockPost,
        content: 'Check this out! @mention & #hashtag 🎉',
      };
      render(<PostCard post={specialPost} />);
      expect(screen.getByText(/Check this out/)).toBeInTheDocument();
    });
  });
});
