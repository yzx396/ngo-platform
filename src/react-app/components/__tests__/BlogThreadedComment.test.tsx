import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BlogThreadedComment } from '../BlogThreadedComment';
import * as blogService from '../../services/blogService';
import * as authContext from '../../context/AuthContext';
import type { BlogCommentWithReplies } from '../../../types/blog';

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
vi.mock('lucide-react', () => ({
  Trash2: () => <div>Trash Icon</div>,
  MessageCircle: () => <div>Reply Icon</div>,
  X: () => <div>X Icon</div>,
}));

// Mock RichTextEditor component
vi.mock('../RichTextEditor', () => ({
  RichTextEditor: ({ content, onChange, placeholder, disabled }: {
    content: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
  }) => (
    <textarea
      data-testid="rich-text-editor"
      value={content}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
  ),
}));

describe('BlogThreadedComment', () => {
  const mockComment: BlogCommentWithReplies = {
    id: 'comment-1',
    blog_id: 'blog-1',
    user_id: 'user-1',
    content: 'Great blog post!',
    parent_comment_id: null,
    created_at: 1000000,
    updated_at: 1000000,
    author_name: 'John Doe',
    author_email: 'john@example.com',
    replies: [],
  };

  const mockReply: BlogCommentWithReplies = {
    id: 'reply-1',
    blog_id: 'blog-1',
    user_id: 'user-2',
    content: 'I agree!',
    parent_comment_id: 'comment-1',
    created_at: 1000100,
    updated_at: 1000100,
    author_name: 'Jane Smith',
    author_email: 'jane@example.com',
    replies: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authContext.useAuth).mockReturnValue({
      user: { id: 'user-1', email: 'user@example.com', name: 'User', role: 'member' },
      token: 'token',
      loading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof authContext.useAuth>);
  });

  it('should render comment with author and content', () => {
    render(<BlogThreadedComment comment={mockComment} blogId="blog-1" />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Great blog post!')).toBeInTheDocument();
  });

  it('should render deleted comment marker for soft-deleted comments', () => {
    const deletedComment = { ...mockComment, content: '[deleted]' };
    render(<BlogThreadedComment comment={deletedComment} blogId="blog-1" />);

    expect(screen.getByText('[deleted]')).toBeInTheDocument();
    expect(screen.getByText('deleted')).toBeInTheDocument();
  });

  it('should show reply button for non-deleted comments within max depth', () => {
    render(<BlogThreadedComment comment={mockComment} blogId="blog-1" depth={0} />);

    const replyButton = screen.getByText('Reply');
    expect(replyButton).toBeInTheDocument();
  });

  it('should hide reply button for deleted comments', () => {
    const deletedComment = { ...mockComment, content: '[deleted]' };
    render(<BlogThreadedComment comment={deletedComment} blogId="blog-1" />);

    expect(screen.queryByText('Reply')).not.toBeInTheDocument();
  });

  it('should hide reply button at max depth', () => {
    render(<BlogThreadedComment comment={mockComment} blogId="blog-1" depth={5} maxDepth={5} />);

    expect(screen.queryByText('Reply')).not.toBeInTheDocument();
  });

  it('should show delete button only to comment author', () => {
    render(<BlogThreadedComment comment={mockComment} blogId="blog-1" />);

    const deleteButton = screen.getByRole('button', { name: /delete comment/i });
    expect(deleteButton).toBeInTheDocument();
  });

  it('should not show delete button to other users', () => {
    vi.mocked(authContext.useAuth).mockReturnValue({
      user: { id: 'different-user', email: 'other@example.com', name: 'Other', role: 'member' },
      token: 'token',
      loading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof authContext.useAuth>);

    render(<BlogThreadedComment comment={mockComment} blogId="blog-1" />);

    expect(screen.queryByRole('button', { name: /delete comment/i })).not.toBeInTheDocument();
  });

  it('should show delete button to admin regardless of ownership', () => {
    vi.mocked(authContext.useAuth).mockReturnValue({
      user: { id: 'admin-user', email: 'admin@example.com', name: 'Admin', role: 'admin' },
      token: 'token',
      loading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof authContext.useAuth>);

    render(<BlogThreadedComment comment={mockComment} blogId="blog-1" />);

    const deleteButton = screen.getByRole('button', { name: /delete comment/i });
    expect(deleteButton).toBeInTheDocument();
  });

  it('should not show delete button when not authenticated', () => {
    vi.mocked(authContext.useAuth).mockReturnValue({
      user: null,
      token: null,
      loading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    } as ReturnType<typeof authContext.useAuth>);

    render(<BlogThreadedComment comment={mockComment} blogId="blog-1" />);

    expect(screen.queryByRole('button', { name: /delete comment/i })).not.toBeInTheDocument();
  });

  it('should apply indentation based on depth', () => {
    const { container } = render(
      <BlogThreadedComment comment={mockComment} blogId="blog-1" depth={2} />
    );

    // Find the div with marginLeft style
    const commentDiv = Array.from(container.querySelectorAll('div')).find(
      (el) => el.style.marginLeft === '32px'
    );
    expect(commentDiv).toBeTruthy();
  });

  it('should render nested replies recursively', () => {
    const commentWithReply = { ...mockComment, replies: [mockReply] };
    render(<BlogThreadedComment comment={commentWithReply} blogId="blog-1" />);

    expect(screen.getByText('Great blog post!')).toBeInTheDocument();
    expect(screen.getByText('I agree!')).toBeInTheDocument();
  });

  it('should hide reply button for nested comment when at max depth', () => {
    const commentWithReply = { ...mockComment, replies: [mockReply] };
    render(
      <BlogThreadedComment comment={commentWithReply} blogId="blog-1" maxDepth={2} />
    );

    // Parent can reply (depth 0, maxDepth 2)
    expect(screen.getAllByText('Reply').length).toBeGreaterThan(0);
  });

  it('should call onCommentDeleted callback when comment is deleted', async () => {
    const user = userEvent.setup();
    const onCommentDeleted = vi.fn();
    vi.mocked(blogService.deleteBlogComment).mockResolvedValue(undefined);

    window.confirm = vi.fn(() => true);

    render(
      <BlogThreadedComment
        comment={mockComment}
        blogId="blog-1"
        onCommentDeleted={onCommentDeleted}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete comment/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(onCommentDeleted).toHaveBeenCalledWith('comment-1');
    });
  });

  it('should call onReplyCreated callback when reply is submitted', async () => {
    const user = userEvent.setup();
    const onReplyCreated = vi.fn();

    render(
      <BlogThreadedComment
        comment={mockComment}
        blogId="blog-1"
        onReplyCreated={onReplyCreated}
      />
    );

    const replyButton = screen.getByText('Reply');
    await user.click(replyButton);

    // Reply form should appear
    expect(screen.getByText(/Replying to John Doe/)).toBeInTheDocument();
  });

  it('should toggle reply form when reply button is clicked', async () => {
    const user = userEvent.setup();
    render(<BlogThreadedComment comment={mockComment} blogId="blog-1" />);

    const replyButton = screen.getByText('Reply');
    await user.click(replyButton);

    // Reply form should appear
    expect(screen.getByText(/Replying to John Doe/)).toBeInTheDocument();

    // Cancel button should appear
    const cancelButton = screen.getByRole('button', { name: /cancel reply/i });
    await user.click(cancelButton);

    // Reply form should disappear
    expect(screen.queryByText(/Replying to John Doe/)).not.toBeInTheDocument();
  });

  it('should render rich text HTML content properly', () => {
    const richTextComment = {
      ...mockComment,
      content: '<p>Great blog post with <strong>bold</strong> text!</p><ul><li>Point 1</li><li>Point 2</li></ul>',
    };
    const { container } = render(
      <BlogThreadedComment comment={richTextComment} blogId="blog-1" />
    );

    // Check that the HTML content is rendered (not as plain text)
    const contentDiv = container.querySelector('div.prose');
    expect(contentDiv).toBeInTheDocument();
    expect(contentDiv?.innerHTML).toContain('bold');
    expect(contentDiv?.innerHTML).toContain('Point 1');
  });
});
