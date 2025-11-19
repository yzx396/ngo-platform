import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ReplyForm from '../components/ReplyForm';
import * as forumService from '../services/forumService';

// Mock the forum service
vi.mock('../services/forumService');

// Mock RichTextEditor component
vi.mock('../components/RichTextEditor', () => ({
  RichTextEditor: ({ content, onChange, placeholder, disabled, minHeight }: {
    content: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    minHeight?: string;
  }) => (
    <textarea
      data-testid="rich-text-editor"
      value={content}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{ minHeight }}
    />
  ),
}));

// Mock useAuth hook
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user_1', name: 'Current User', email: 'user@example.com' },
    isLoading: false,
    logout: vi.fn(),
  }),
}));

// Mock useTranslation hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => {
      const translations: Record<string, string> = {
        'forums.loginRequired': 'You must be logged in to reply',
        'forums.emptyReplyError': 'Reply content cannot be empty',
        'forums.replyToComment': 'Reply to this comment...',
        'forums.writeReply': 'Write your reply...',
        'forums.posting': 'Posting...',
        'forums.postReply': 'Post Reply',
        'forums.signInToReply': 'Please',
        'common.signIn': 'sign in',
        'forums.toReply': 'to reply',
        'common.cancel': 'Cancel',
        'errors.unexpectedError': 'An unexpected error occurred',
      };
      return translations[key] || defaultValue || key;
    },
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

describe('ReplyForm Component', () => {
  const mockOnReplyCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render reply form', () => {
    render(
      <ReplyForm
        threadId="thread_123"
        onReplyCreated={mockOnReplyCreated}
      />
    );

    expect(screen.getByPlaceholderText(/write your reply/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /post reply/i })).toBeInTheDocument();
  });

  it('should submit a new reply', async () => {
    const user = userEvent.setup();
    const mockReply = {
      id: 'reply_new',
      thread_id: 'thread_123',
      user_id: 'user_1',
      author_name: 'Current User',
      author_email: 'user@example.com',
      content: 'My reply',
      parent_reply_id: null,
      is_solution: false,
      upvote_count: 0,
      downvote_count: 0,
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
    };

    vi.mocked(forumService.forumService.createReply).mockResolvedValue(mockReply);

    render(
      <ReplyForm
        threadId="thread_123"
        onReplyCreated={mockOnReplyCreated}
      />
    );

    const textarea = screen.getByPlaceholderText(/write your reply/i);
    await user.type(textarea, 'My reply');

    const submitButton = screen.getByRole('button', { name: /post reply/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(forumService.forumService.createReply).toHaveBeenCalledWith(
        'thread_123',
        { content: 'My reply' }
      );
      expect(mockOnReplyCreated).toHaveBeenCalledWith(mockReply);
    });
  });

  it('should disable submit button when content is empty', () => {
    render(
      <ReplyForm
        threadId="thread_123"
        onReplyCreated={mockOnReplyCreated}
      />
    );

    const submitButton = screen.getByRole('button', { name: /post reply/i });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when content is entered', async () => {
    const user = userEvent.setup();

    render(
      <ReplyForm
        threadId="thread_123"
        onReplyCreated={mockOnReplyCreated}
      />
    );

    const textarea = screen.getByPlaceholderText(/write your reply/i);
    await user.type(textarea, 'My reply');

    const submitButton = screen.getByRole('button', { name: /post reply/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('should show loading state while submitting', async () => {
    const user = userEvent.setup();

    vi.mocked(forumService.forumService.createReply).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(
      <ReplyForm
        threadId="thread_123"
        onReplyCreated={mockOnReplyCreated}
      />
    );

    const textarea = screen.getByPlaceholderText(/write your reply/i);
    await user.type(textarea, 'My reply');

    const submitButton = screen.getByRole('button', { name: /post reply/i });
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
  });

  it('should clear form after successful submit', async () => {
    const user = userEvent.setup();

    const mockReply = {
      id: 'reply_new',
      thread_id: 'thread_123',
      user_id: 'user_1',
      author_name: 'Current User',
      author_email: 'user@example.com',
      content: 'My reply',
      parent_reply_id: null,
      is_solution: false,
      upvote_count: 0,
      downvote_count: 0,
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
    };

    vi.mocked(forumService.forumService.createReply).mockResolvedValue(mockReply);

    render(
      <ReplyForm
        threadId="thread_123"
        onReplyCreated={mockOnReplyCreated}
      />
    );

    const textarea = screen.getByPlaceholderText(/write your reply/i) as HTMLTextAreaElement;
    await user.type(textarea, 'My reply');

    const submitButton = screen.getByRole('button', { name: /post reply/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(textarea.value).toBe('');
    });
  });

  it('should handle errors gracefully', async () => {
    const user = userEvent.setup();

    vi.mocked(forumService.forumService.createReply).mockRejectedValue(
      new Error('Network error')
    );

    render(
      <ReplyForm
        threadId="thread_123"
        onReplyCreated={mockOnReplyCreated}
      />
    );

    const textarea = screen.getByPlaceholderText(/write your reply/i);
    await user.type(textarea, 'My reply');

    const submitButton = screen.getByRole('button', { name: /post reply/i });
    await user.click(submitButton);

    await waitFor(() => {
      // Error should be displayed in a red error box
      const errorBox = screen.getByText('Network error');
      expect(errorBox).toBeInTheDocument();
    });
  });

  it('should support nested replies with parent_reply_id', async () => {
    const user = userEvent.setup();
    const mockReply = {
      id: 'reply_nested',
      thread_id: 'thread_123',
      user_id: 'user_1',
      author_name: 'Current User',
      author_email: 'user@example.com',
      content: 'Reply to a reply',
      parent_reply_id: 'reply_1',
      is_solution: false,
      upvote_count: 0,
      downvote_count: 0,
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
    };

    vi.mocked(forumService.forumService.createReply).mockResolvedValue(mockReply);

    render(
      <ReplyForm
        threadId="thread_123"
        parentReplyId="reply_1"
        onReplyCreated={mockOnReplyCreated}
      />
    );

    const textarea = screen.getByPlaceholderText(/reply to this comment/i);
    await user.type(textarea, 'Reply to a reply');

    const submitButton = screen.getByRole('button', { name: /post reply/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(forumService.forumService.createReply).toHaveBeenCalledWith(
        'thread_123',
        { content: 'Reply to a reply', parent_reply_id: 'reply_1' }
      );
    });
  });

  it('should show cancel button when onCancel is provided', () => {
    const mockOnCancel = vi.fn();

    render(
      <ReplyForm
        threadId="thread_123"
        onReplyCreated={mockOnReplyCreated}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnCancel = vi.fn();

    render(
      <ReplyForm
        threadId="thread_123"
        onReplyCreated={mockOnReplyCreated}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });
});
