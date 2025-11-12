import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { BlogsPage } from '../BlogsPage';
import type { BlogWithLikeStatus } from '../../../types/blog';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | Record<string, unknown>, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'blogs.title': 'Blogs',
        'blogs.subtitle': 'Read and share blogs from the community',
        'blogs.loadError': 'Failed to load blogs',
        'blogs.noBlogsFound': 'No blogs found',
        'blogs.createFirst': 'Create the first blog',
        'points.howToEarn': 'How to Earn Points',
        'points.earnPoints': 'Earn Points',
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

vi.mock('../../services/blogService', () => ({
  getBlogs: vi.fn(),
  likeBlog: vi.fn(),
  unlikeBlog: vi.fn(),
}));

import { getBlogs } from '../../services/blogService';

const mockGetBlogs = getBlogs as ReturnType<typeof vi.fn>;

// Helper to render BlogsPage with Router
const renderBlogsPage = () => {
  return render(
    <MemoryRouter>
      <BlogsPage />
    </MemoryRouter>
  );
};

describe('BlogsPage - How to Earn Points', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock for getBlogs
    const mockBlog: BlogWithLikeStatus = {
      id: 'blog-1',
      user_id: 'user-2',
      title: 'Test Blog',
      content: 'Test content',
      excerpt: 'Test excerpt',
      is_featured: false,
      requires_auth: false,
      created_at: Date.now() / 1000,
      updated_at: Date.now() / 1000,
      likes_count: 0,
      comments_count: 0,
      liked_by_user: false,
    };

    mockGetBlogs.mockResolvedValue({
      blogs: [mockBlog],
      total: 1,
    });
  });

  it('should render Blogs page title', async () => {
    renderBlogsPage();

    await waitFor(() => {
      expect(screen.getByText('Blogs')).toBeInTheDocument();
    });
  });

  it('should render How to Earn Points button', async () => {
    renderBlogsPage();

    await waitFor(() => {
      const button = screen.getByText('How to Earn Points');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'How to Earn Points');
    });
  });

  it('should open points dialog when How to Earn Points button is clicked', async () => {
    const user = userEvent.setup();
    renderBlogsPage();

    await waitFor(() => {
      expect(screen.getByText('How to Earn Points')).toBeInTheDocument();
    });

    // Verify dialog is not open initially
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const button = screen.getByRole('button', { name: 'How to Earn Points' });
    await user.click(button);

    // Dialog should be visible after click
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('should not render dismissible banner', async () => {
    renderBlogsPage();

    await waitFor(() => {
      expect(screen.getByText('Blogs')).toBeInTheDocument();
    });

    // Banner should not exist
    expect(screen.queryByText('Earn Points')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Dismiss')).not.toBeInTheDocument();
  });
});
