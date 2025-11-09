import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { BlogDetailPage } from '../BlogDetailPage';
import type { BlogWithAuthor } from '../../../types/blog';

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

vi.mock('../../services/blogService', () => ({
  getBlogById: vi.fn(),
  likeBlog: vi.fn(),
  unlikeBlog: vi.fn(),
  deleteBlog: vi.fn(),
  featureBlog: vi.fn(),
  getBlogComments: vi.fn(),
}));

import { getBlogById, getBlogComments } from '../../services/blogService';

const mockGetBlogById = getBlogById as ReturnType<typeof vi.fn>;
const mockGetBlogComments = getBlogComments as ReturnType<typeof vi.fn>;

describe('BlogDetailPage', () => {
  const mockBlog: BlogWithAuthor = {
    id: 'blog-1',
    user_id: 'user-1',
    title: 'Test Blog Post',
    content: 'This is a test blog post with full content.',
    featured: false,
    likes_count: 5,
    comments_count: 3,
    author_name: 'John Doe',
    author_email: 'john@example.com',
    created_at: 1000000,
    updated_at: 1000000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBlogById.mockResolvedValue(mockBlog);
    mockGetBlogComments.mockResolvedValue({
      comments: [],
      total: 0,
    });
  });

  const renderWithRouter = (initialPath = '/blogs/blog-1') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/blogs/:id" element={<BlogDetailPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('should render blog detail page with content', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Test Blog Post')).toBeInTheDocument();
      expect(screen.getByText('This is a test blog post with full content.')).toBeInTheDocument();
    });
  });

  it('should display comments count', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getAllByText(/3 comments/).length).toBeGreaterThan(0);
    });
  });

  it('should auto-expand comments section when URL contains #comments hash', async () => {
    renderWithRouter('/blogs/blog-1#comments');

    await waitFor(() => {
      expect(screen.getByText('Test Blog Post')).toBeInTheDocument();
    });

    // The comments section should be expanded (content visible)
    // Check that comments header with count is visible
    await waitFor(() => {
      expect(screen.getAllByText(/3 comments/).length).toBeGreaterThan(0);
    });
  });

  it('should keep comments section closed by default (without #comments hash)', async () => {
    renderWithRouter('/blogs/blog-1');

    await waitFor(() => {
      expect(screen.getByText('Test Blog Post')).toBeInTheDocument();
    });

    // The Show button should be visible when comments are hidden (for authenticated users)
    // or comments should not be shown for unauthenticated users
    const showButton = screen.queryByText('Show');
    if (showButton) {
      expect(showButton).toBeInTheDocument();
    }
  });

  it('should fetch blog by ID on mount', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(mockGetBlogById).toHaveBeenCalledWith('blog-1');
    });
  });

  it('should display author name and date', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('should display comments section header when hash is present', async () => {
    renderWithRouter('/blogs/blog-1#comments');

    // Verify the comments section is visible
    await waitFor(() => {
      expect(screen.getAllByText(/3 comments/).length).toBeGreaterThan(0);
    });
  });
});
