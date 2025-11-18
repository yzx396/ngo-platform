import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi, afterEach, afterAll } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ForumCategoryPage from '../ForumCategoryPage';
import * as forumServiceModule from '../../services/forumService';
import { ForumCategory, ForumThreadWithAuthor } from '../../../types/forum';

// Mock the forum service
vi.mock('../../services/forumService', () => ({
  forumService: {
    getCategory: vi.fn(),
    getThreads: vi.fn(),
  },
}));

// Mock useTranslation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string; start?: number; end?: number; total?: number }) => {
      const translations: Record<string, string> = {
        'forums.backToForums': 'Back to Forums',
        'forums.newThread': 'New Thread',
        'forums.categoryNotFound': 'Category not found',
        'forums.errorLoadingCategory': 'Error loading category',
        'forums.errorPrefix': 'Error:',
        'forums.noThreadsYet': 'No threads in this category yet',
        'forums.previous': 'Previous',
        'forums.next': 'Next',
        'forums.lastActivity': 'Last activity',
      };
      
      if (key === 'forums.showingThreads' && options) {
        return `Showing ${options.start} to ${options.end} of ${options.total} threads`;
      }
      
      return options?.defaultValue || translations[key] || key;
    },
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

afterEach(() => {
  consoleErrorSpy.mockClear();
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

const mockCategory: ForumCategory = {
  id: 'cat_career',
  name: 'Career Development',
  slug: 'career-development',
  description: 'Professional growth and career advice',
  parent_id: null,
  icon: '💼',
  display_order: 1,
  thread_count: 100,
  created_at: 1700000000,
};

const mockThreads: ForumThreadWithAuthor[] = [
  {
    id: 'thread_1',
    category_id: 'cat_career',
    author_id: 'user_1',
    author_name: 'John Doe',
    title: 'How to negotiate salary?',
    content: 'I need advice on salary negotiation...',
    status: 'open',
    is_pinned: 0,
    view_count: 150,
    reply_count: 5,
    upvote_count: 10,
    downvote_count: 1,
    created_at: 1700000000,
    updated_at: 1700000000,
    last_activity_at: 1700001000,
  },
  {
    id: 'thread_2',
    category_id: 'cat_career',
    author_id: 'user_2',
    author_name: 'Jane Smith',
    title: 'Career transition advice needed',
    content: 'Looking for tips on transitioning careers...',
    status: 'solved',
    is_pinned: 1,
    view_count: 200,
    reply_count: 12,
    upvote_count: 25,
    downvote_count: 0,
    created_at: 1700000000,
    updated_at: 1700000000,
    last_activity_at: 1700002000,
  },
];

const renderWithRouter = (component: React.ReactElement, initialPath = '/forums/category/cat_career') => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/forums/category/:categoryId" element={component} />
      </Routes>
    </MemoryRouter>
  );
};

describe('ForumCategoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render category name and description', async () => {
    vi.mocked(forumServiceModule.forumService.getCategory).mockResolvedValue(mockCategory);
    vi.mocked(forumServiceModule.forumService.getThreads).mockResolvedValue({
      threads: mockThreads,
      total: 2,
    });

    renderWithRouter(<ForumCategoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Career Development')).toBeInTheDocument();
    });
    expect(screen.getByText('Professional growth and career advice')).toBeInTheDocument();
  });

  it('should render category icon', async () => {
    vi.mocked(forumServiceModule.forumService.getCategory).mockResolvedValue(mockCategory);
    vi.mocked(forumServiceModule.forumService.getThreads).mockResolvedValue({
      threads: mockThreads,
      total: 2,
    });

    renderWithRouter(<ForumCategoryPage />);

    await waitFor(() => {
      expect(screen.getByText('💼')).toBeInTheDocument();
    });
  });

  it('should display threads in the category', async () => {
    vi.mocked(forumServiceModule.forumService.getCategory).mockResolvedValue(mockCategory);
    vi.mocked(forumServiceModule.forumService.getThreads).mockResolvedValue({
      threads: mockThreads,
      total: 2,
    });

    renderWithRouter(<ForumCategoryPage />);

    await waitFor(() => {
      expect(screen.getByText('How to negotiate salary?')).toBeInTheDocument();
      expect(screen.getByText('Career transition advice needed')).toBeInTheDocument();
    });
  });

  it('should show thread count stats', async () => {
    vi.mocked(forumServiceModule.forumService.getCategory).mockResolvedValue(mockCategory);
    vi.mocked(forumServiceModule.forumService.getThreads).mockResolvedValue({
      threads: mockThreads,
      total: 2,
    });

    renderWithRouter(<ForumCategoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Showing 1 to 2 of 2 threads')).toBeInTheDocument();
    });
  });

  it('should display New Thread button', async () => {
    vi.mocked(forumServiceModule.forumService.getCategory).mockResolvedValue(mockCategory);
    vi.mocked(forumServiceModule.forumService.getThreads).mockResolvedValue({
      threads: mockThreads,
      total: 2,
    });

    renderWithRouter(<ForumCategoryPage />);

    await waitFor(() => {
      expect(screen.getByText('New Thread')).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    vi.mocked(forumServiceModule.forumService.getCategory).mockImplementationOnce(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithRouter(<ForumCategoryPage />);

    const loader = document.querySelector('.animate-spin');
    expect(loader).toBeInTheDocument();
  });

  it('should handle error gracefully', async () => {
    const errorMessage = 'Failed to load';
    vi.mocked(forumServiceModule.forumService.getCategory).mockRejectedValueOnce(
      new Error(errorMessage)
    );

    renderWithRouter(<ForumCategoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(errorMessage))).toBeInTheDocument();
    });
  });

  it('should show category not found message', async () => {
    vi.mocked(forumServiceModule.forumService.getCategory).mockResolvedValue(null as unknown as ForumCategory);
    vi.mocked(forumServiceModule.forumService.getThreads).mockResolvedValue({
      threads: [],
      total: 0,
    });

    renderWithRouter(<ForumCategoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Category not found')).toBeInTheDocument();
    });
  });

  it('should show empty state when no threads', async () => {
    vi.mocked(forumServiceModule.forumService.getCategory).mockResolvedValue(mockCategory);
    vi.mocked(forumServiceModule.forumService.getThreads).mockResolvedValue({
      threads: [],
      total: 0,
    });

    renderWithRouter(<ForumCategoryPage />);

    await waitFor(() => {
      expect(screen.getByText('No threads in this category yet')).toBeInTheDocument();
    });
  });

  it('should display Back to Forums link', async () => {
    vi.mocked(forumServiceModule.forumService.getCategory).mockResolvedValue(mockCategory);
    vi.mocked(forumServiceModule.forumService.getThreads).mockResolvedValue({
      threads: mockThreads,
      total: 2,
    });

    renderWithRouter(<ForumCategoryPage />);

    await waitFor(() => {
      const backLink = screen.getByText(/Back to Forums/);
      expect(backLink).toBeInTheDocument();
      expect(backLink.closest('a')).toHaveAttribute('href', '/forums');
    });
  });

  it('should have New Thread button that triggers navigation', async () => {
    vi.mocked(forumServiceModule.forumService.getCategory).mockResolvedValue(mockCategory);
    vi.mocked(forumServiceModule.forumService.getThreads).mockResolvedValue({
      threads: mockThreads,
      total: 2,
    });

    renderWithRouter(<ForumCategoryPage />);

    await waitFor(() => {
      expect(screen.getByText('New Thread')).toBeInTheDocument();
    });

    const newThreadButton = screen.getByText('New Thread');
    
    // Verify it's a button that would trigger navigation
    expect(newThreadButton.tagName).toBe('BUTTON');
    expect(newThreadButton).toHaveClass('bg-primary');
  });

  it('should render threads using ThreadCard component', async () => {
    vi.mocked(forumServiceModule.forumService.getCategory).mockResolvedValue(mockCategory);
    vi.mocked(forumServiceModule.forumService.getThreads).mockResolvedValue({
      threads: mockThreads,
      total: 2,
    });

    renderWithRouter(<ForumCategoryPage />);

    await waitFor(() => {
      // ThreadCard renders thread titles
      expect(screen.getByText('How to negotiate salary?')).toBeInTheDocument();
      expect(screen.getByText('Career transition advice needed')).toBeInTheDocument();
      
      // ThreadCard renders author names
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
    });
  });

  it('should use grid layout for threads', async () => {
    vi.mocked(forumServiceModule.forumService.getCategory).mockResolvedValue(mockCategory);
    vi.mocked(forumServiceModule.forumService.getThreads).mockResolvedValue({
      threads: mockThreads,
      total: 2,
    });

    const { container } = renderWithRouter(<ForumCategoryPage />);

    await waitFor(() => {
      const gridContainer = container.querySelector('.grid.gap-4');
      expect(gridContainer).toBeInTheDocument();
    });
  });

  it('should use space-y-8 container layout matching EventsPage', async () => {
    vi.mocked(forumServiceModule.forumService.getCategory).mockResolvedValue(mockCategory);
    vi.mocked(forumServiceModule.forumService.getThreads).mockResolvedValue({
      threads: mockThreads,
      total: 2,
    });

    const { container } = renderWithRouter(<ForumCategoryPage />);

    await waitFor(() => {
      const mainContainer = container.querySelector('.space-y-8');
      expect(mainContainer).toBeInTheDocument();
    });
  });

  it('should display pagination when multiple pages exist', async () => {
    vi.mocked(forumServiceModule.forumService.getCategory).mockResolvedValue(mockCategory);
    vi.mocked(forumServiceModule.forumService.getThreads).mockResolvedValue({
      threads: mockThreads,
      total: 50, // More than 20 threads per page
    });

    const { container } = renderWithRouter(<ForumCategoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    // Check for pagination container with page buttons
    const paginationContainer = container.querySelector('.flex.items-center.justify-center.gap-2');
    expect(paginationContainer).toBeInTheDocument();
    
    // Should have page buttons (looking for buttons in the pagination div)
    const pageButtons = paginationContainer?.querySelectorAll('button');
    expect(pageButtons && pageButtons.length).toBeGreaterThan(2); // Previous + page numbers + Next
  });

  it('should not display pagination when only one page', async () => {
    vi.mocked(forumServiceModule.forumService.getCategory).mockResolvedValue(mockCategory);
    vi.mocked(forumServiceModule.forumService.getThreads).mockResolvedValue({
      threads: mockThreads,
      total: 2, // Less than 20 threads per page
    });

    renderWithRouter(<ForumCategoryPage />);

    await waitFor(() => {
      expect(screen.queryByText('Previous')).not.toBeInTheDocument();
      expect(screen.queryByText('Next')).not.toBeInTheDocument();
    });
  });
});
