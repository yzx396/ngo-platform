import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi, afterEach, afterAll } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ForumHomePage from '../pages/ForumHomePage';
import * as forumServiceModule from '../services/forumService';
import * as authContextModule from '../context/AuthContext';
import { UserRole } from '../../types/role';

// Mock the forum service
vi.mock('../services/forumService', () => ({
  forumService: {
    getAllCategories: vi.fn(),
  },
}));

// Mock the auth context
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock useTranslation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => {
      const translations: Record<string, string> = {
        'forums.title': 'Forums',
        'forums.subtitle': 'Connect, learn, and grow with the community',
        'forums.createThread': 'Create Thread',
        'forums.noCategoriesFound': 'No categories available',
        'forums.loadError': 'Failed to load categories',
        'forums.loadingForums': 'Loading forums...',
        'forums.threads': 'threads',
        'forums.noSubcategories': 'No subcategories',
        'points.howToEarn': 'How to Earn Points',
      };
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

// Mock data includes both parents and children
const mockAllCategories = [
  // Parent categories
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
  // Child categories
  {
    id: 'cat_career_job',
    name: 'Job Search & Applications',
    slug: 'job-search',
    description: 'Tips, resume reviews, interview prep',
    parent_id: 'cat_career',
    icon: '💡',
    display_order: 1,
    thread_count: 50,
    created_at: 1700000000,
  },
  {
    id: 'cat_career_transition',
    name: 'Career Transitions',
    slug: 'career-transitions',
    description: 'Changing careers, pivoting industries',
    parent_id: 'cat_career',
    icon: '🎯',
    display_order: 2,
    thread_count: 25,
    created_at: 1700000000,
  },
];

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ForumHomePage', () => {
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

  it('should render forum title and description with i18n', async () => {
    vi.mocked(forumServiceModule.forumService.getAllCategories).mockResolvedValue([]);

    renderWithRouter(<ForumHomePage />);

    await waitFor(() => {
      expect(screen.getByText('Forums')).toBeInTheDocument();
    });
    expect(screen.getByText('Connect, learn, and grow with the community')).toBeInTheDocument();
  });

  it('should display all categories grouped by parent', async () => {
    vi.mocked(forumServiceModule.forumService.getAllCategories).mockResolvedValue(
      mockAllCategories
    );

    renderWithRouter(<ForumHomePage />);

    await waitFor(() => {
      // Parent categories should be shown as section headers
      expect(screen.getByText('Career Development')).toBeInTheDocument();
      expect(screen.getByText('Mentorship')).toBeInTheDocument();
      
      // Child categories should be shown as cards
      expect(screen.getByText('Job Search & Applications')).toBeInTheDocument();
      expect(screen.getByText('Career Transitions')).toBeInTheDocument();
    });
  });

  it('should show category descriptions for child categories', async () => {
    vi.mocked(forumServiceModule.forumService.getAllCategories).mockResolvedValue(
      mockAllCategories
    );

    renderWithRouter(<ForumHomePage />);

    await waitFor(() => {
      expect(screen.getByText('Tips, resume reviews, interview prep')).toBeInTheDocument();
      expect(screen.getByText('Changing careers, pivoting industries')).toBeInTheDocument();
    });
  });

  it('should display thread counts for child categories', async () => {
    vi.mocked(forumServiceModule.forumService.getAllCategories).mockResolvedValue(
      mockAllCategories
    );

    renderWithRouter(<ForumHomePage />);

    await waitFor(() => {
      const threadCounts = screen.getAllByText(/threads/i);
      expect(threadCounts.length).toBeGreaterThan(0);
    });
  });

  it('should show loading state with Loader2 component', () => {
    vi.mocked(forumServiceModule.forumService.getAllCategories).mockImplementationOnce(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithRouter(<ForumHomePage />);

    // Loading state shows Loader2 spinner
    const loader = document.querySelector('.animate-spin');
    expect(loader).toBeInTheDocument();
  });

  it('should handle errors gracefully with styled error message', async () => {
    const errorMessage = 'Failed to load categories';
    vi.mocked(forumServiceModule.forumService.getAllCategories).mockRejectedValue(
      new Error(errorMessage)
    );

    renderWithRouter(<ForumHomePage />);

    await waitFor(() => {
      const errorDiv = screen.getByText(errorMessage);
      expect(errorDiv).toBeInTheDocument();
      // Check for red error styling
      expect(errorDiv.closest('div')).toHaveClass('bg-red-50');
    });
  });

  it('should display category icons for both parent headers and child cards', async () => {
    vi.mocked(forumServiceModule.forumService.getAllCategories).mockResolvedValue(
      mockAllCategories
    );

    renderWithRouter(<ForumHomePage />);

    await waitFor(() => {
      // Parent icons in headers
      expect(screen.getByText('💼')).toBeInTheDocument();
      expect(screen.getByText('🤝')).toBeInTheDocument();
      
      // Child icons in cards
      expect(screen.getByText('💡')).toBeInTheDocument();
      expect(screen.getByText('🎯')).toBeInTheDocument();
    });
  });

  it('should display child categories as clickable cards', async () => {
    vi.mocked(forumServiceModule.forumService.getAllCategories).mockResolvedValue(
      mockAllCategories
    );

    renderWithRouter(<ForumHomePage />);

    await waitFor(() => {
      expect(screen.getByText('Job Search & Applications')).toBeInTheDocument();
    });

    // CategoryCard renders as a Link, so it should be clickable
    const jobSearchCard = screen.getByText('Job Search & Applications').closest('a');
    expect(jobSearchCard).toBeInTheDocument();
    expect(jobSearchCard).toHaveAttribute('href', '/forums/category/cat_career_job');
  });

  it('should display Create Thread button when authenticated', async () => {
    vi.mocked(forumServiceModule.forumService.getAllCategories).mockResolvedValue(
      mockAllCategories
    );

    renderWithRouter(<ForumHomePage />);

    await waitFor(() => {
      expect(screen.getByText('Create Thread')).toBeInTheDocument();
    });
  });

  it('should not display Create Thread button when not authenticated', async () => {
    vi.mocked(authContextModule.useAuth).mockReturnValue({
      isAuthenticated: false,
      user: null,
      logout: vi.fn(),
      login: vi.fn(),
    } as ReturnType<typeof authContextModule.useAuth>);

    vi.mocked(forumServiceModule.forumService.getAllCategories).mockResolvedValue(
      mockAllCategories
    );

    renderWithRouter(<ForumHomePage />);

    await waitFor(() => {
      expect(screen.getByText('Forums')).toBeInTheDocument();
    });
    expect(screen.queryByText('Create Thread')).not.toBeInTheDocument();
  });

  it('should navigate to create thread page when button is clicked', async () => {
    vi.mocked(forumServiceModule.forumService.getAllCategories).mockResolvedValue(
      mockAllCategories
    );

    const user = userEvent.setup();
    renderWithRouter(<ForumHomePage />);

    await waitFor(() => {
      expect(screen.getByText('Create Thread')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create Thread');
    await user.click(createButton);

    // Check that the URL changed to /forums/create
    await waitFor(() => {
      expect(window.location.pathname).toContain('/forums');
    });
  });

  it('should show empty state when no categories', async () => {
    vi.mocked(forumServiceModule.forumService.getAllCategories).mockResolvedValue([]);

    renderWithRouter(<ForumHomePage />);

    await waitFor(() => {
      expect(screen.getByText('No categories available')).toBeInTheDocument();
    });
  });

  it('should use ForumControls component', async () => {
    vi.mocked(forumServiceModule.forumService.getAllCategories).mockResolvedValue(
      mockAllCategories
    );

    renderWithRouter(<ForumHomePage />);

    await waitFor(() => {
      const createButton = screen.getByText('Create Thread');
      expect(createButton).toBeInTheDocument();
      // Check that it's a button element (from ForumControls)
      expect(createButton.closest('button')).toBeInTheDocument();
    });
  });

  it('should group categories correctly with sections for each parent', async () => {
    vi.mocked(forumServiceModule.forumService.getAllCategories).mockResolvedValue(
      mockAllCategories
    );

    renderWithRouter(<ForumHomePage />);

    await waitFor(() => {
      // Both parent category names should appear
      const careerDevHeadings = screen.getAllByText('Career Development');
      expect(careerDevHeadings.length).toBeGreaterThan(0);
      
      const mentorshipHeadings = screen.getAllByText('Mentorship');
      expect(mentorshipHeadings.length).toBeGreaterThan(0);
    });
  });

  it('should handle parent categories with no children', async () => {
    const categoriesWithEmptyParent = [
      {
        id: 'cat_empty',
        name: 'Empty Category',
        slug: 'empty',
        description: 'No children',
        parent_id: null,
        icon: '📦',
        display_order: 1,
        thread_count: 0,
        created_at: 1700000000,
      },
    ];

    vi.mocked(forumServiceModule.forumService.getAllCategories).mockResolvedValue(
      categoriesWithEmptyParent
    );

    renderWithRouter(<ForumHomePage />);

    await waitFor(() => {
      expect(screen.getByText('Empty Category')).toBeInTheDocument();
      expect(screen.getByText('No subcategories')).toBeInTheDocument();
    });
  });

  it('should render How to Earn Points button', async () => {
    vi.mocked(forumServiceModule.forumService.getAllCategories).mockResolvedValue(
      mockAllCategories
    );

    renderWithRouter(<ForumHomePage />);

    await waitFor(() => {
      const button = screen.getByText('How to Earn Points');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'How to Earn Points');
    });
  });

  it('should open points dialog when How to Earn Points button is clicked', async () => {
    vi.mocked(forumServiceModule.forumService.getAllCategories).mockResolvedValue(
      mockAllCategories
    );

    const user = userEvent.setup();
    renderWithRouter(<ForumHomePage />);

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

  it('should close points dialog when close button is clicked', async () => {
    vi.mocked(forumServiceModule.forumService.getAllCategories).mockResolvedValue(
      mockAllCategories
    );

    const user = userEvent.setup();
    renderWithRouter(<ForumHomePage />);

    await waitFor(() => {
      expect(screen.getByText('How to Earn Points')).toBeInTheDocument();
    });

    // Open the dialog
    const openButton = screen.getByRole('button', { name: 'How to Earn Points' });
    await user.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Find and click the close button
    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    await user.click(closeButtons[0]);

    // Dialog should be closed
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
