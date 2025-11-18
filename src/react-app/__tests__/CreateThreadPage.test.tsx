import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi, afterEach, afterAll } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CreateThreadPage from '../pages/CreateThreadPage';
import * as forumServiceModule from '../services/forumService';
import * as authContextModule from '../context/AuthContext';
import { UserRole } from '../../types/role';

// Mock the forum service
vi.mock('../services/forumService', () => ({
  forumService: {
    getCategories: vi.fn(),
    createThread: vi.fn(),
  },
}));

// Mock the auth context
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock useTranslation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'forums.backToForums': 'Back to Forums',
        'forums.createNewThread': 'Create New Thread',
        'forums.createDescription': 'Share your question or topic with the community',
        'forums.categoryLabel': 'Category',
        'forums.categoryPlaceholder': 'Select a category...',
        'forums.categoryRequired': 'Please select a category',
        'forums.titleLabel': 'Thread Title',
        'forums.titlePlaceholder': 'e.g., How to negotiate salary?',
        'forums.titleRequired': 'Title is required',
        'forums.contentLabel': 'Thread Content',
        'forums.contentPlaceholder': 'Provide details and context for your question or discussion...',
        'forums.contentRequired': 'Content is required',
        'forums.characters': 'characters',
        'forums.creating': 'Creating...',
        'forums.createThread': 'Create Thread',
        'forums.noCategoriesFound': 'No categories available',
        'forums.loadError': 'Failed to load categories',
        'common.cancel': 'Cancel',
      };
      return translations[key] || key;
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

const mockCategories = [
  {
    id: 'cat_career',
    name: 'Career Development',
    slug: 'career-development',
    description: 'Professional growth and career advice',
    parent_id: null,
    icon: '💼',
    display_order: 1,
    thread_count: 100,
    created_at: 1700000000,
  },
  {
    id: 'cat_mentorship',
    name: 'Mentorship',
    slug: 'mentorship',
    description: 'Finding and working with mentors',
    parent_id: null,
    icon: '🤝',
    display_order: 2,
    thread_count: 50,
    created_at: 1700000000,
  },
];

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('CreateThreadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to authenticated user
    vi.mocked(authContextModule.useAuth).mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.Member,
        points: 0,
      },
      logout: vi.fn(),
      login: vi.fn(),
    } as ReturnType<typeof authContextModule.useAuth>);
  });

  it('should render back button with ArrowLeft icon', async () => {
    vi.mocked(forumServiceModule.forumService.getCategories).mockResolvedValue(
      mockCategories
    );

    renderWithRouter(<CreateThreadPage />);

    await waitFor(() => {
      const backButton = screen.getByText('Back to Forums');
      expect(backButton).toBeInTheDocument();
      // Check that it's a button with ghost variant
      expect(backButton.closest('button')).toBeInTheDocument();
    });
  });

  it('should render title and description with i18n', async () => {
    vi.mocked(forumServiceModule.forumService.getCategories).mockResolvedValue(
      mockCategories
    );

    renderWithRouter(<CreateThreadPage />);

    await waitFor(() => {
      expect(screen.getByText('Create New Thread')).toBeInTheDocument();
      expect(screen.getByText('Share your question or topic with the community')).toBeInTheDocument();
    });
  });

  it('should wrap form in Card component', async () => {
    vi.mocked(forumServiceModule.forumService.getCategories).mockResolvedValue(
      mockCategories
    );

    renderWithRouter(<CreateThreadPage />);

    await waitFor(() => {
      const form = screen.getByRole('combobox').closest('form');
      expect(form).toBeInTheDocument();
      // Check that form is inside a card by finding the card wrapper
      const cardWrapper = form?.closest('[class*="bg-card"]');
      expect(cardWrapper).toBeInTheDocument();
    });
  });

  it('should display category dropdown when no categoryId in URL', async () => {
    vi.mocked(forumServiceModule.forumService.getCategories).mockResolvedValue(
      mockCategories
    );

    renderWithRouter(<CreateThreadPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    });
  });

  it('should load and display all categories in dropdown', async () => {
    vi.mocked(forumServiceModule.forumService.getCategories).mockResolvedValue(
      mockCategories
    );

    renderWithRouter(<CreateThreadPage />);

    await waitFor(() => {
      expect(screen.getByText('Career Development')).toBeInTheDocument();
      expect(screen.getByText('Mentorship')).toBeInTheDocument();
    });
  });

  it('should disable submit button when category not selected', async () => {
    vi.mocked(forumServiceModule.forumService.getCategories).mockResolvedValue(
      mockCategories
    );

    const user = userEvent.setup();
    renderWithRouter(<CreateThreadPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/thread title/i)).toBeInTheDocument();
    });

    // Fill in title and content but not category
    await user.type(screen.getByPlaceholderText(/how to negotiate salary/i), 'Test Thread');
    await user.type(
      screen.getByPlaceholderText(/provide details and context/i),
      'This is a test thread'
    );

    // Submit button should be disabled without category
    const submitButton = screen.getByRole('button', { name: /create thread/i });
    expect(submitButton).toBeDisabled();

    // Should not call createThread
    expect(forumServiceModule.forumService.createThread).not.toHaveBeenCalled();
  });

  it('should successfully create thread with selected category', async () => {
    vi.mocked(forumServiceModule.forumService.getCategories).mockResolvedValue(
      mockCategories
    );
    vi.mocked(forumServiceModule.forumService.createThread).mockResolvedValue({
      id: 'thread_123',
      title: 'Test Thread',
      content: 'This is a test thread',
      author: {
        id: 'user_123',
        name: 'Test User',
        email: 'test@example.com',
      },
      category_id: 'cat_career',
      created_at: 1700000000,
      updated_at: 1700000000,
      vote_count: 0,
      is_pinned: false,
      reply_count: 0,
    } as ReturnType<typeof forumServiceModule.forumService.createThread>);

    const user = userEvent.setup();
    renderWithRouter(<CreateThreadPage />);

    // Wait for categories to load
    await waitFor(() => {
      expect(screen.getByText('Career Development')).toBeInTheDocument();
    });

    // Select category
    const categorySelect = screen.getByRole('combobox');
    await user.selectOptions(categorySelect, 'cat_career');

    // Fill in title
    const titleInput = screen.getByPlaceholderText(/how to negotiate salary/i);
    await user.click(titleInput);
    await user.keyboard('Test');

    // Fill in content
    const contentInput = screen.getByPlaceholderText(/provide details and context/i);
    await user.click(contentInput);
    await user.keyboard('Content');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create thread/i });
    await user.click(submitButton);

    // Check that createThread was called
    await waitFor(() => {
      expect(forumServiceModule.forumService.createThread).toHaveBeenCalledWith(
        expect.objectContaining({
          category_id: 'cat_career',
        })
      );
    });
  });

  it('should show loading state with Loader2 while fetching categories', () => {
    vi.mocked(forumServiceModule.forumService.getCategories).mockImplementationOnce(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithRouter(<CreateThreadPage />);

    // Loading state shows Loader2 spinner
    const loader = document.querySelector('.animate-spin');
    expect(loader).toBeInTheDocument();
  });

  it('should handle category loading errors gracefully with styled error', async () => {
    const errorMessage = 'Failed to load categories';
    vi.mocked(forumServiceModule.forumService.getCategories).mockRejectedValueOnce(
      new Error(errorMessage)
    );

    renderWithRouter(<CreateThreadPage />);

    await waitFor(
      () => {
        const errorDiv = screen.getByText(errorMessage);
        expect(errorDiv).toBeInTheDocument();
        // Check for red error styling
        expect(errorDiv.closest('div')).toHaveClass('bg-red-50');
      },
      { timeout: 3000 }
    );
  });

  it('should disable submit button when title is empty', async () => {
    vi.mocked(forumServiceModule.forumService.getCategories).mockResolvedValue(
      mockCategories
    );

    const user = userEvent.setup();
    renderWithRouter(<CreateThreadPage />);

    await waitFor(() => {
      expect(screen.getByText('Career Development')).toBeInTheDocument();
    });

    // Select category and content only, don't fill title
    const categorySelect = screen.getByRole('combobox');
    await user.selectOptions(categorySelect, 'cat_career');

    await user.type(
      screen.getByPlaceholderText(/provide details and context/i),
      'Content'
    );

    // Submit button should be disabled without title
    const submitButton = screen.getByRole('button', { name: /create thread/i });
    expect(submitButton).toBeDisabled();
  });

  it('should disable submit button when content is empty', async () => {
    vi.mocked(forumServiceModule.forumService.getCategories).mockResolvedValue(
      mockCategories
    );

    const user = userEvent.setup();
    renderWithRouter(<CreateThreadPage />);

    await waitFor(() => {
      expect(screen.getByText('Career Development')).toBeInTheDocument();
    });

    // Select category and title only, don't fill content
    const categorySelect = screen.getByRole('combobox');
    await user.selectOptions(categorySelect, 'cat_career');

    await user.type(screen.getByPlaceholderText(/how to negotiate salary/i), 'Title');

    // Submit button should be disabled without content
    const submitButton = screen.getByRole('button', { name: /create thread/i });
    expect(submitButton).toBeDisabled();
  });

  it('should navigate to category page after successful creation', async () => {
    vi.mocked(forumServiceModule.forumService.getCategories).mockResolvedValue(
      mockCategories
    );
    vi.mocked(forumServiceModule.forumService.createThread).mockResolvedValue({
      id: 'thread_123',
      title: 'Test Thread',
      content: 'Content',
      category_id: 'cat_career',
      author: { id: 'user_123', name: 'Test User', email: 'test@example.com' },
      created_at: 1700000000,
      updated_at: 1700000000,
      vote_count: 0,
      is_pinned: false,
      reply_count: 0,
    } as ReturnType<typeof forumServiceModule.forumService.createThread>);

    const user = userEvent.setup();
    renderWithRouter(<CreateThreadPage />);

    await waitFor(() => {
      expect(screen.getByText('Career Development')).toBeInTheDocument();
    });

    const categorySelect = screen.getByRole('combobox');
    await user.selectOptions(categorySelect, 'cat_career');

    await user.type(screen.getByPlaceholderText(/how to negotiate salary/i), 'Title');
    await user.type(screen.getByPlaceholderText(/provide details and context/i), 'Content');

    const submitButton = screen.getByRole('button', { name: /create thread/i });
    await user.click(submitButton);

    // Should navigate to category page
    await waitFor(() => {
      expect(window.location.pathname).toContain('/forums/category/cat_career');
    });
  });

  it('should navigate to forums home when canceling', async () => {
    vi.mocked(forumServiceModule.forumService.getCategories).mockResolvedValue(
      mockCategories
    );

    const user = userEvent.setup();
    renderWithRouter(<CreateThreadPage />);

    await waitFor(() => {
      expect(screen.getByText('Career Development')).toBeInTheDocument();
    });

    // Click cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Should navigate to /forums
    await waitFor(() => {
      expect(window.location.pathname).toBe('/forums');
    });
  });

  it('should show character count for title', async () => {
    vi.mocked(forumServiceModule.forumService.getCategories).mockResolvedValue(
      mockCategories
    );

    renderWithRouter(<CreateThreadPage />);

    await waitFor(() => {
      expect(screen.getByText('Career Development')).toBeInTheDocument();
    });

    // Check that character count display exists (it shows "0/255 characters" initially)
    expect(screen.getByText(/\/255.*characters/)).toBeInTheDocument();
  });

  it('should show character count for content', async () => {
    vi.mocked(forumServiceModule.forumService.getCategories).mockResolvedValue(
      mockCategories
    );

    renderWithRouter(<CreateThreadPage />);

    await waitFor(() => {
      expect(screen.getByText('Career Development')).toBeInTheDocument();
    });

    // Check that character count display exists (shows "0 characters" initially)
    const characterCounts = screen.getAllByText(/characters/);
    expect(characterCounts.length).toBeGreaterThan(0);
  });
});
