import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { MyBlogsPage } from '../MyBlogsPage';
import type { BlogWithLikeStatus } from '../../../types/blog';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'myBlogs.title': 'My Blogs',
        'myBlogs.subtitle': 'Manage your blog posts',
        'blogs.filterLabel': 'Filter',
        'blogs.allBlogs': 'All Blogs',
        'blogs.featuredBlogs': 'Featured Blogs',
        'blogs.create': 'Create Blog',
        'blogs.noBlogsFound': 'No blogs found',
        'blogs.createFirst': 'Create your first blog',
        'blogs.loadError': 'Failed to load blogs',
        'blogs.like': 'Like',
        'blogs.unlike': 'Unlike',
        'blogs.featured': 'Featured',
        'blogs.readMore': 'Read More',
      };

      return translations[key] || (typeof defaultValue === 'string' ? defaultValue : key);
    },
  }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { userId: 'user-1', email: 'test@example.com', name: 'Test User' },
  }),
}));

vi.mock('../../services/blogService', () => ({
  getMyBlogs: vi.fn(),
  likeBlog: vi.fn(),
  unlikeBlog: vi.fn(),
}));

import { getMyBlogs } from '../../services/blogService';

const mockGetMyBlogs = getMyBlogs as ReturnType<typeof vi.fn>;

describe('MyBlogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render page title and subtitle', async () => {
    mockGetMyBlogs.mockResolvedValue({
      blogs: [],
      total: 0,
      limit: 100,
      offset: 0,
    });

    render(
      <BrowserRouter>
        <MyBlogsPage />
      </BrowserRouter>
    );

    expect(screen.getByText('My Blogs')).toBeInTheDocument();
    expect(screen.getByText('Manage your blog posts')).toBeInTheDocument();

    // Wait for async fetch to complete to avoid act() warning
    await waitFor(() => {
      expect(mockGetMyBlogs).toHaveBeenCalled();
    });
  });

  it('should call getMyBlogs service on mount', async () => {
    mockGetMyBlogs.mockResolvedValue({
      blogs: [],
      total: 0,
      limit: 100,
      offset: 0,
    });

    render(
      <BrowserRouter>
        <MyBlogsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockGetMyBlogs).toHaveBeenCalledWith(100, 0, undefined);
    });
  });

  it('should display user\'s blogs when loaded', async () => {
    const mockBlogs: BlogWithLikeStatus[] = [
      {
        id: 'blog-1',
        user_id: 'user-1',
        title: 'My First Blog',
        content: 'This is my first blog post content',
        featured: false,
        likes_count: 5,
        comments_count: 2,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
        author_name: 'Test User',
        author_email: 'test@example.com',
        liked_by_user: false,
      },
      {
        id: 'blog-2',
        user_id: 'user-1',
        title: 'My Second Blog',
        content: 'This is my second blog post content',
        featured: true,
        likes_count: 10,
        comments_count: 5,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
        author_name: 'Test User',
        author_email: 'test@example.com',
        liked_by_user: true,
      },
    ];

    mockGetMyBlogs.mockResolvedValue({
      blogs: mockBlogs,
      total: 2,
      limit: 100,
      offset: 0,
    });

    render(
      <BrowserRouter>
        <MyBlogsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('My First Blog')).toBeInTheDocument();
      expect(screen.getByText('My Second Blog')).toBeInTheDocument();
    });
  });

  it('should display empty state when no blogs exist', async () => {
    mockGetMyBlogs.mockResolvedValue({
      blogs: [],
      total: 0,
      limit: 100,
      offset: 0,
    });

    render(
      <BrowserRouter>
        <MyBlogsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No blogs found')).toBeInTheDocument();
      expect(screen.getByText(/Create your first blog/i)).toBeInTheDocument();
    });
  });

  it('should filter blogs by featured status', async () => {
    const mockBlogs: BlogWithLikeStatus[] = [
      {
        id: 'blog-1',
        user_id: 'user-1',
        title: 'Featured Blog',
        content: 'This is a featured blog',
        featured: true,
        likes_count: 10,
        comments_count: 5,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
        author_name: 'Test User',
        author_email: 'test@example.com',
        liked_by_user: false,
      },
    ];

    mockGetMyBlogs.mockResolvedValue({
      blogs: mockBlogs,
      total: 1,
      limit: 100,
      offset: 0,
    });

    render(
      <BrowserRouter>
        <MyBlogsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockGetMyBlogs).toHaveBeenCalled();
    });
  });

  it('should display error message when loading fails', async () => {
    mockGetMyBlogs.mockRejectedValue(new Error('Failed to load blogs'));

    render(
      <BrowserRouter>
        <MyBlogsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load blogs')).toBeInTheDocument();
    });
  });
});
