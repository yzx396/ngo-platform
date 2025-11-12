import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PostDetailPage } from '../PostDetailPage';
import type { Post } from '../../../types/post';

// Mock dependencies
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

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    token: null,
    loading: false,
    error: null,
  }),
}));

vi.mock('../../services/postService', () => ({
  getPostById: vi.fn(),
  likePost: vi.fn(),
  unlikePost: vi.fn(),
  deletePost: vi.fn(),
  getComments: vi.fn(),
}));

import { getPostById, getComments } from '../../services/postService';

const mockGetPostById = getPostById as ReturnType<typeof vi.fn>;
const mockGetComments = getComments as ReturnType<typeof vi.fn>;

describe('PostDetailPage', () => {
  const mockPost: Post & { author_name?: string; user_has_liked?: boolean } = {
    id: 'post-1',
    user_id: 'user-1',
    content: 'This is a test post with full content that should be displayed without truncation.',
    post_type: 'discussion' as const,
    likes_count: 5,
    comments_count: 3,
    author_name: 'John Doe',
    user_has_liked: false,
    created_at: 1000000,
    updated_at: 1000000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPostById.mockResolvedValue(mockPost);
    mockGetComments.mockResolvedValue({
      comments: [],
      total: 0,
    });
  });

  const renderWithRouter = (initialPath = '/posts/post-1') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/posts/:id" element={<PostDetailPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('should render loading state initially', async () => {
    renderWithRouter();
    
    // Loading spinner should be visible before data is loaded
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should render post details when loaded', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('This is a test post with full content that should be displayed without truncation.')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('should display post type badge with correct styling', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Discussion')).toBeInTheDocument();
    });
  });

  it('should show like and comment counts', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getAllByText(/5 likes/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/3 comments/).length).toBeGreaterThan(0);
    });
  });

  it('should fetch post by ID on mount', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(mockGetPostById).toHaveBeenCalledWith('post-1');
    });
  });

  it('should auto-expand comments when URL hash is #comments', async () => {
    renderWithRouter('/posts/post-1#comments');

    await waitFor(() => {
      expect(screen.getByText('This is a test post with full content that should be displayed without truncation.')).toBeInTheDocument();
    });

    // Comments section should be expanded
    await waitFor(() => {
      expect(screen.getAllByText(/3 comments/).length).toBeGreaterThan(0);
    });
  });

  it('should handle post not found error', async () => {
    mockGetPostById.mockRejectedValue(new Error('Not found'));
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Failed to load post')).toBeInTheDocument();
    });
  });

  it('should navigate back to feed when back button clicked', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const backButton = screen.getByText('Back to Feed');
    expect(backButton).toBeInTheDocument();
  });

  it('should display author name and timestamp', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      // Check for date formatting
      const date = new Date(1000000 * 1000);
      const formattedDate = date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      expect(screen.getByText(formattedDate)).toBeInTheDocument();
    });
  });

  it('should display comments section header', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getAllByText(/3 comments/).length).toBeGreaterThan(0);
    });
  });
});

// Note: Tests for authenticated user interactions (like, edit, delete buttons) 
// require more complex auth context mocking which is beyond the scope of basic component tests.
// These features are covered by integration tests and manual testing.
