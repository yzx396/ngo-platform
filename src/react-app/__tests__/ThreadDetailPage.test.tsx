import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ThreadDetailPage from '../pages/ThreadDetailPage';
import * as forumServiceModule from '../services/forumService';

// Mock the forum service
vi.mock('../services/forumService', () => ({
  forumService: {
    getThread: vi.fn(),
    getReplies: vi.fn(),
  },
}));

// Mock the AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user_1', name: 'Jane', email: 'jane@example.com' },
    isLoading: false,
    logout: vi.fn(),
  }),
}));

// Mock ReplyForm to avoid rendering issues
vi.mock('../components/ReplyForm', () => ({
  default: () => <div data-testid="reply-form-mock">Reply Form Mock</div>,
}));

const mockThread = {
  id: 'thread_1',
  category_id: 'cat_career',
  title: 'How to negotiate salary?',
  content: 'I got an offer from a top tech company. How should I approach salary negotiation?',
  status: 'open' as const,
  is_pinned: 0,
  view_count: 245,
  reply_count: 12,
  upvote_count: 45,
  downvote_count: 2,
  hot_score: 1500.5,
  author_id: 'user_1',
  author_name: 'Jane',
  author_email: 'jane@example.com',
  created_at: 1700000000,
  updated_at: 1700000000,
  last_activity_at: 1700100000,
};

const mockReplies = [
  {
    id: 'reply_1',
    thread_id: 'thread_1',
    user_id: 'user_2',
    content: 'Great question! Here are some tips...',
    parent_reply_id: null,
    is_solution: 0,
    upvote_count: 12,
    downvote_count: 0,
    author_name: 'John',
    author_email: 'john@example.com',
    created_at: 1700010000,
    updated_at: 1700010000,
  },
  {
    id: 'reply_2',
    thread_id: 'thread_1',
    user_id: 'user_3',
    content: 'I agree with this approach',
    parent_reply_id: 'reply_1',
    is_solution: 0,
    upvote_count: 5,
    downvote_count: 0,
    author_name: 'Alice',
    author_email: 'alice@example.com',
    created_at: 1700020000,
    updated_at: 1700020000,
  },
  {
    id: 'reply_3',
    thread_id: 'thread_1',
    user_id: 'user_1',
    content: 'Thanks for the feedback!',
    parent_reply_id: 'reply_2',
    is_solution: 1,
    upvote_count: 18,
    downvote_count: 0,
    author_name: 'Jane',
    author_email: 'jane@example.com',
    created_at: 1700030000,
    updated_at: 1700030000,
  },
];

const renderWithRouter = () => {
  // Navigate to the thread URL before rendering
  window.history.pushState({}, 'Thread Detail', '/forums/threads/thread_1');

  return render(
    <BrowserRouter>
      <Routes>
        <Route path="/forums/threads/:threadId" element={<ThreadDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
};

describe('ThreadDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render thread title', async () => {
    vi.mocked(forumServiceModule.forumService.getThread).mockResolvedValue(mockThread);
    vi.mocked(forumServiceModule.forumService.getReplies).mockResolvedValue({
      replies: [],
      total: 0,
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('How to negotiate salary?')).toBeInTheDocument();
    });
  });

  it('should display thread content', async () => {
    vi.mocked(forumServiceModule.forumService.getThread).mockResolvedValue(mockThread);
    vi.mocked(forumServiceModule.forumService.getReplies).mockResolvedValue({
      replies: [],
      total: 0,
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/I got an offer from a top tech company/i)).toBeInTheDocument();
    });
  });

  it('should show thread author and creation time', async () => {
    vi.mocked(forumServiceModule.forumService.getThread).mockResolvedValue(mockThread);
    vi.mocked(forumServiceModule.forumService.getReplies).mockResolvedValue({
      replies: [],
      total: 0,
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/jane/i)).toBeInTheDocument();
    });
  });

  it('should display thread engagement metrics', async () => {
    vi.mocked(forumServiceModule.forumService.getThread).mockResolvedValue(mockThread);
    vi.mocked(forumServiceModule.forumService.getReplies).mockResolvedValue({
      replies: [],
      total: 0,
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/245 views/)).toBeInTheDocument(); // view_count
      expect(screen.getByText(/45 upvotes/)).toBeInTheDocument(); // upvote_count
    });
  });

  it('should display thread status badge', async () => {
    const solvedThread = { ...mockThread, status: 'solved' as const };
    vi.mocked(forumServiceModule.forumService.getThread).mockResolvedValue(solvedThread);
    vi.mocked(forumServiceModule.forumService.getReplies).mockResolvedValue({
      replies: [],
      total: 0,
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/solved/i)).toBeInTheDocument();
    });
  });

  it('should display replies', async () => {
    vi.mocked(forumServiceModule.forumService.getThread).mockResolvedValue(mockThread);
    vi.mocked(forumServiceModule.forumService.getReplies).mockResolvedValue({
      replies: mockReplies,
      total: 3,
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/Great question! Here are some tips/i)).toBeInTheDocument();
    });
  });

  it('should show solution indicator on marked replies', async () => {
    vi.mocked(forumServiceModule.forumService.getThread).mockResolvedValue(mockThread);
    vi.mocked(forumServiceModule.forumService.getReplies).mockResolvedValue({
      replies: mockReplies,
      total: 3,
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/thanks for the feedback/i)).toBeInTheDocument();
    });

    // Look for solution badge (checkmark or "Solution" text)
    const solutionBadges = screen.getAllByText(/solution/i);
    expect(solutionBadges.length).toBeGreaterThan(0);
  });

  it('should display reply authors and dates', async () => {
    vi.mocked(forumServiceModule.forumService.getThread).mockResolvedValue(mockThread);
    vi.mocked(forumServiceModule.forumService.getReplies).mockResolvedValue({
      replies: mockReplies,
      total: 3,
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/john/i)).toBeInTheDocument();
      expect(screen.getByText(/alice/i)).toBeInTheDocument();
    });
  });

  it('should show loading state initially', () => {
    vi.mocked(forumServiceModule.forumService.getThread).mockImplementationOnce(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithRouter();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'Failed to load thread';
    vi.mocked(forumServiceModule.forumService.getThread).mockRejectedValueOnce(
      new Error(errorMessage)
    );

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('should display empty state when no replies exist', async () => {
    vi.mocked(forumServiceModule.forumService.getThread).mockResolvedValue(mockThread);
    vi.mocked(forumServiceModule.forumService.getReplies).mockResolvedValue({
      replies: [],
      total: 0,
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/no replies yet/i)).toBeInTheDocument();
    });
  });

  it('should display nested replies with indentation', async () => {
    vi.mocked(forumServiceModule.forumService.getThread).mockResolvedValue(mockThread);
    vi.mocked(forumServiceModule.forumService.getReplies).mockResolvedValue({
      replies: mockReplies,
      total: 3,
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/I agree with this approach/i)).toBeInTheDocument();
    });
  });

  it('should show back link to category', async () => {
    vi.mocked(forumServiceModule.forumService.getThread).mockResolvedValue(mockThread);
    vi.mocked(forumServiceModule.forumService.getReplies).mockResolvedValue({
      replies: [],
      total: 0,
    });

    renderWithRouter();

    await waitFor(() => {
      const backLinks = screen.getAllByText(/back/i);
      expect(backLinks.length).toBeGreaterThan(0);
    });
  });
});
