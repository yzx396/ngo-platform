import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { BlogCard } from '../BlogCard';
import * as authContext from '../../context/AuthContext';
import type { BlogWithLikeStatus } from '../../../types/blog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | Record<string, unknown> | { defaultValue: string; [key: string]: string | number }) => {
      if (typeof defaultValue === 'object' && 'defaultValue' in defaultValue) {
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

vi.mock('../../context/AuthContext');

vi.mock('../BlogComments', () => ({
  BlogComments: ({ blogId, compactMode, limit }: { blogId: string; compactMode?: boolean; limit?: number }) => (
    <div data-testid="blog-comments" data-blogid={blogId} data-compact={String(compactMode)} data-limit={limit}>
      Mock Comments
    </div>
  ),
}));

vi.mock('../CommentForm', () => ({
  CommentForm: ({ blogId, onCommentCreated }: { blogId: string; onCommentCreated?: () => void }) => (
    <div data-testid="comment-form" data-blogid={blogId}>
      Mock Comment Form
      <button onClick={() => onCommentCreated?.()}>Add Comment</button>
    </div>
  ),
}));

describe('BlogCard', () => {
  const mockBlog: BlogWithLikeStatus = {
    id: 'blog-1',
    title: 'Test Blog Post',
    content: 'This is a test blog post content.',
    author_name: 'John Doe',
    author_id: 'user-1',
    user_id: 'user-1',
    created_at: 1000000,
    updated_at: 1000000,
    likes_count: 5,
    comments_count: 3,
    liked_by_user: false,
    featured: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authContext.useAuth).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com', name: 'Test User', role: 'member' },
      token: 'test-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      getUser: vi.fn(),
    } as ReturnType<typeof authContext.useAuth>);
  });

  it('should render blog card with title and content preview', () => {
    render(
      <BrowserRouter>
        <BlogCard blog={mockBlog} />
      </BrowserRouter>
    );

    expect(screen.getByText('Test Blog Post')).toBeInTheDocument();
    expect(screen.getByText('This is a test blog post content.')).toBeInTheDocument();
  });

  it('should display likes and comments counts', () => {
    render(
      <BrowserRouter>
        <BlogCard blog={mockBlog} />
      </BrowserRouter>
    );

    expect(screen.getByText('5 likes')).toBeInTheDocument();
    expect(screen.getByText('3 comments')).toBeInTheDocument();
  });

  it('should render comments button and expand/collapse comments section', () => {
    render(
      <BrowserRouter>
        <BlogCard blog={mockBlog} />
      </BrowserRouter>
    );

    const commentButton = screen.getByText('Comment').closest('button');
    expect(commentButton).toBeInTheDocument();

    // Comments should not be visible initially
    expect(screen.queryByTestId('blog-comments')).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(commentButton!);

    // Comments should now be visible
    expect(screen.getByTestId('blog-comments')).toBeInTheDocument();
    expect(screen.getByTestId('comment-form')).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(commentButton!);

    // Comments should be hidden
    expect(screen.queryByTestId('blog-comments')).not.toBeInTheDocument();
  });

  it('should render Read More link with correct href', () => {
    render(
      <BrowserRouter>
        <BlogCard blog={mockBlog} />
      </BrowserRouter>
    );

    const readMoreLink = screen.getByText(/Read More/);
    expect(readMoreLink).toBeInTheDocument();
    expect(readMoreLink.closest('a')).toHaveAttribute('href', '/blogs/blog-1');
  });

  it('should truncate long content in preview', () => {
    const longBlog = {
      ...mockBlog,
      content: 'a'.repeat(300),
    };

    render(
      <BrowserRouter>
        <BlogCard blog={longBlog} />
      </BrowserRouter>
    );

    const contentText = screen.getByText(/^a+\.\.\.$/);
    expect(contentText).toBeInTheDocument();
  });

  it('should display author name and date', () => {
    render(
      <BrowserRouter>
        <BlogCard blog={mockBlog} />
      </BrowserRouter>
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should call onLike when like button is clicked', () => {
    const onLike = vi.fn();
    render(
      <BrowserRouter>
        <BlogCard blog={mockBlog} onLike={onLike} />
      </BrowserRouter>
    );

    const likeButton = screen.getByTitle('Like');
    likeButton.click();
    expect(onLike).toHaveBeenCalledWith('blog-1');
  });

  it('should display featured badge when blog is featured', () => {
    const featuredBlog = {
      ...mockBlog,
      featured: true,
    };

    render(
      <BrowserRouter>
        <BlogCard blog={featuredBlog} />
      </BrowserRouter>
    );

    expect(screen.getByText('blogs.featured')).toBeInTheDocument();
  });

  it('should pass correct props to BlogComments component', () => {
    render(
      <BrowserRouter>
        <BlogCard blog={mockBlog} />
      </BrowserRouter>
    );

    const commentButton = screen.getByText('Comment').closest('button');
    fireEvent.click(commentButton!);

    const blogComments = screen.getByTestId('blog-comments');
    expect(blogComments).toHaveAttribute('data-blogid', 'blog-1');
    expect(blogComments).toHaveAttribute('data-compact', 'true');
    expect(blogComments).toHaveAttribute('data-limit', '10');
  });

  it('should pass correct props to CommentForm component', () => {
    render(
      <BrowserRouter>
        <BlogCard blog={mockBlog} />
      </BrowserRouter>
    );

    const commentButton = screen.getByText('Comment').closest('button');
    fireEvent.click(commentButton!);

    const commentForm = screen.getByTestId('comment-form');
    expect(commentForm).toHaveAttribute('data-blogid', 'blog-1');
  });

  it('should increment comment count when comment is created', () => {
    render(
      <BrowserRouter>
        <BlogCard blog={mockBlog} />
      </BrowserRouter>
    );

    // Initially shows 3 comments
    const initialCommentCount = screen.getByText('3 comments');
    expect(initialCommentCount).toBeInTheDocument();

    // Open comments section
    const commentButton = screen.getByText('Comment').closest('button');
    fireEvent.click(commentButton!);

    // Click add comment button
    const addCommentButton = screen.getByText('Add Comment');
    fireEvent.click(addCommentButton);

    // Should now show 4 comments
    expect(screen.getByText('4 comments')).toBeInTheDocument();
  });

  it('should show view all comments link when more than 10 comments', () => {
    const blogWithManyComments = {
      ...mockBlog,
      comments_count: 15,
    };

    render(
      <BrowserRouter>
        <BlogCard blog={blogWithManyComments} />
      </BrowserRouter>
    );

    const commentButton = screen.getByText('Comment').closest('button');
    fireEvent.click(commentButton!);

    const viewAllLink = screen.getByText('View all comments →').closest('a');
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink).toHaveAttribute('href', '/blogs/blog-1#comments');
  });

  it('should not show view all comments link when 10 or fewer comments', () => {
    render(
      <BrowserRouter>
        <BlogCard blog={mockBlog} />
      </BrowserRouter>
    );

    const commentButton = screen.getByText('Comment').closest('button');
    fireEvent.click(commentButton!);

    const viewAllLink = screen.queryByText('View all comments →');
    expect(viewAllLink).not.toBeInTheDocument();
  });
});
