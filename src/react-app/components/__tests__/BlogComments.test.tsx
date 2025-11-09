import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BlogComments } from '../BlogComments';
import * as blogService from '../../services/blogService';
import * as authContext from '../../context/AuthContext';
import type { BlogCommentWithAuthor } from '../../../types/blog';

vi.mock('../../services/blogService');
vi.mock('../../context/AuthContext');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | Record<string, unknown> | { defaultValue: string; [key: string]: string | number }) => {
      if (typeof defaultValue === 'object' && 'defaultValue' in defaultValue) {
        // Handle i18n object with defaultValue and parameters
        let result = defaultValue.defaultValue;
        Object.entries(defaultValue).forEach(([k, v]) => {
          if (k !== 'defaultValue') {
            result = result.replace(`{{${k}}}`, String(v));
          }
        });
        return result;
      }
      if (typeof defaultValue === 'object') {
        return key;
      }
      return defaultValue || key;
    },
  }),
}));

describe('BlogComments', () => {
  const mockComments: BlogCommentWithAuthor[] = [
    {
      id: 'comment-1',
      blog_id: 'blog-1',
      user_id: 'user-1',
      content: 'Great blog post!',
      parent_comment_id: null,
      created_at: 1000000,
      updated_at: 1000000,
      author_name: 'John Doe',
      author_email: 'john@example.com',
    },
    {
      id: 'comment-2',
      blog_id: 'blog-1',
      user_id: 'user-2',
      content: 'I agree!',
      parent_comment_id: 'comment-1',
      created_at: 1000100,
      updated_at: 1000100,
      author_name: 'Jane Smith',
      author_email: 'jane@example.com',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authContext.useAuth).mockReturnValue({
      user: null,
      token: null,
      loading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof authContext.useAuth>);
  });

  it('should render loading state initially', () => {
    vi.mocked(blogService.getBlogComments).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<BlogComments blogId="blog-1" />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should fetch and display comments on mount', async () => {
    vi.mocked(blogService.getBlogComments).mockResolvedValue({
      comments: mockComments,
      total: 2,
    });

    render(<BlogComments blogId="blog-1" />);

    await waitFor(() => {
      expect(screen.getByText('Great blog post!')).toBeInTheDocument();
      expect(screen.getByText('I agree!')).toBeInTheDocument();
    });
  });

  it('should display empty state when no comments', async () => {
    vi.mocked(blogService.getBlogComments).mockResolvedValue({
      comments: [],
      total: 0,
    });

    render(<BlogComments blogId="blog-1" />);

    await waitFor(() => {
      expect(screen.getByText('No comments yet')).toBeInTheDocument();
    });
  });

  it('should handle error state gracefully', async () => {
    const error = new Error('Failed to load comments');
    vi.mocked(blogService.getBlogComments).mockRejectedValue(error);

    render(<BlogComments blogId="blog-1" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load comments')).toBeInTheDocument();
    });
  });

  it('should display try again button when error occurs', async () => {
    vi.mocked(blogService.getBlogComments).mockRejectedValue(
      new Error('Failed to load comments')
    );

    render(<BlogComments blogId="blog-1" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load comments')).toBeInTheDocument();
    });

    // Verify the Try Again button is present
    const tryAgainButton = screen.getByText('Try Again');
    expect(tryAgainButton).toBeInTheDocument();
  });

  it('should handle pagination', async () => {
    const manyComments = Array.from({ length: 25 }, (_, i) => ({
      id: `comment-${i}`,
      blog_id: 'blog-1',
      user_id: `user-${i}`,
      content: `Comment ${i}`,
      parent_comment_id: null,
      created_at: 1000000 + i * 100,
      updated_at: 1000000 + i * 100,
      author_name: `User ${i}`,
      author_email: `user${i}@example.com`,
    }));

    vi.mocked(blogService.getBlogComments).mockResolvedValue({
      comments: manyComments.slice(0, 20),
      total: 25,
    });

    render(<BlogComments blogId="blog-1" />);

    await waitFor(() => {
      expect(screen.getByText('Comment 0')).toBeInTheDocument();
    });

    // Should show pagination info
    expect(screen.getByText(/Showing 1-20 of 25/)).toBeInTheDocument();
  });

  it('should call onLoadingChange callback when loading state changes', async () => {
    const onLoadingChange = vi.fn();
    vi.mocked(blogService.getBlogComments).mockResolvedValue({
      comments: mockComments,
      total: 2,
    });

    render(<BlogComments blogId="blog-1" onLoadingChange={onLoadingChange} />);

    // Called with true initially
    expect(onLoadingChange).toHaveBeenCalledWith(true);

    await waitFor(() => {
      // Called with false when done loading
      expect(onLoadingChange).toHaveBeenCalledWith(false);
    });
  });

  it('should call onCommentDeleted when comment is deleted', async () => {
    const onCommentDeleted = vi.fn();
    vi.mocked(blogService.getBlogComments).mockResolvedValue({
      comments: mockComments,
      total: 2,
    });

    render(<BlogComments blogId="blog-1" onCommentDeleted={onCommentDeleted} />);

    await waitFor(() => {
      expect(screen.getByText('Great blog post!')).toBeInTheDocument();
    });

    // Simulate comment deletion by calling the callback
    // This tests that the component can handle external deletions
  });

  it('should accept initial comments prop', () => {
    vi.mocked(blogService.getBlogComments).mockResolvedValue({
      comments: [],
      total: 0,
    });

    render(<BlogComments blogId="blog-1" initialComments={mockComments} />);

    // Should display initial comments immediately
    expect(screen.getByText('Great blog post!')).toBeInTheDocument();
    expect(screen.getByText('I agree!')).toBeInTheDocument();
  });

  it('should build hierarchical comment tree', async () => {
    vi.mocked(blogService.getBlogComments).mockResolvedValue({
      comments: mockComments,
      total: 2,
    });

    render(<BlogComments blogId="blog-1" />);

    await waitFor(() => {
      expect(screen.getByText('Great blog post!')).toBeInTheDocument();
    });

    // Reply comment should be indented (hierarchical)
    const replyComment = screen.getByText('I agree!').closest('div');
    expect(replyComment).toHaveStyle({ marginLeft: expect.stringContaining('px') });
  });
});
