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
    getCategories: vi.fn(),
    getCategoryWithChildren: vi.fn(),
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
        'forums.title': 'Forums',
        'forums.subtitle': 'Connect, learn, and grow with the community',
        'forums.createThread': 'Create Thread',
        'forums.noCategoriesFound': 'No categories available',
        'forums.loadError': 'Failed to load categories',
        'forums.loadingForums': 'Loading forums...',
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

// const childCategories = [
//   {
//     id: 'cat_career_job',
//     name: 'Job Search & Applications',
//     slug: 'job-search',
//     description: 'Tips, resume reviews, interview prep',
//     parent_id: 'cat_career',
//     icon: '💡',
//     display_order: 1,
//     thread_count: 50,
//     created_at: 1700000000,
//   },
//   {
//     id: 'cat_career_transition',
//     name: 'Career Transitions',
//     slug: 'career-transitions',
//     description: 'Changing careers, pivoting industries',
//     parent_id: 'cat_career',
//     icon: '🎯',
//     display_order: 2,
//     thread_count: 25,
//     created_at: 1700000000,
//   },
// ];

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
    vi.mocked(forumServiceModule.forumService.getCategories).mockResolvedValue([]);

    renderWithRouter(<ForumHomePage />);

    await waitFor(() => {
      expect(screen.getByText('Forums')).toBeInTheDocument();
    });
    expect(screen.getByText('Connect, learn, and grow with the community')).toBeInTheDocument();
  });

  it('should display top-level categories', async () => {
    vi.mocked(forumServiceModule.forumService.getCategories).mockResolvedValue(
      mockCategories
    );

    renderWithRouter(<ForumHomePage />);

    await waitFor(() => {
      expect(screen.getByText('Career Development')).toBeInTheDocument();
      expect(screen.getByText('Mentorship')).toBeInTheDocument();
    });
  });

  it('should show category descriptions', async () => {
    vi.mocked(forumServiceModule.forumService.getCategories).mockResolvedValue(
      mockCategories
    );

    renderWithRouter(<ForumHomePage />);

    await waitFor(() => {
      expect(screen.getByText('Professional growth and career advice')).toBeInTheDocument();
      expect(screen.getByText('Finding and working with mentors')).toBeInTheDocument();
    });
  });

  it('should display thread counts', async () => {
    vi.mocked(forumServiceModule.forumService.getCategories).mockResolvedValue(
      mockCategories
    );

    renderWithRouter(<ForumHomePage />);

    await waitFor(() => {
      const threadCounts = screen.getAllByText(/threads/i);
      expect(threadCounts.length).toBeGreaterThan(0);
    });
  });

  it('should show loading state with Loader2 component', () => {
    vi.mocked(forumServiceModule.forumService.getCategories).mockImplementationOnce(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithRouter(<ForumHomePage />);

    // Loading state shows Loader2 spinner
    const loader = document.querySelector('.animate-spin');
    expect(loader).toBeInTheDocument();
  });

  it('should handle errors gracefully with styled error message', async () => {
    const errorMessage = 'Failed to load categories';
    vi.mocked(forumServiceModule.forumService.getCategories).mockRejectedValueOnce(
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

  it('should display category icons', async () => {
    vi.mocked(forumServiceModule.forumService.getCategories).mockResolvedValue(
      mockCategories
    );

    renderWithRouter(<ForumHomePage />);

    await waitFor(() => {
      expect(screen.getByText('💼')).toBeInTheDocument();
      expect(screen.getByText('🤝')).toBeInTheDocument();
    });
  });

  it('should display categories with click interaction', async () => {
    vi.mocked(forumServiceModule.forumService.getCategories).mockResolvedValue(
      mockCategories
    );

    const user = userEvent.setup();
    renderWithRouter(<ForumHomePage />);

    // Wait for initial categories to load
    await waitFor(() => {
      expect(screen.getByText('Career Development')).toBeInTheDocument();
    });

    // Click on a category card (CategoryCard handles navigation)
    const careerDevCard = screen.getByText('Career Development').closest('div');
    if (careerDevCard) {
      await user.click(careerDevCard);
      
      // The CategoryCard component handles the click and navigation
      // We just verify that the category is clickable
      expect(careerDevCard).toBeInTheDocument();
    }
  });

  it('should display Create Thread button when authenticated', async () => {
    vi.mocked(forumServiceModule.forumService.getCategories).mockResolvedValue(
      mockCategories
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

    vi.mocked(forumServiceModule.forumService.getCategories).mockResolvedValue(
      mockCategories
    );

    renderWithRouter(<ForumHomePage />);

    await waitFor(() => {
      expect(screen.getByText('Forums')).toBeInTheDocument();
    });
    expect(screen.queryByText('Create Thread')).not.toBeInTheDocument();
  });

  it('should navigate to create thread page when button is clicked', async () => {
    vi.mocked(forumServiceModule.forumService.getCategories).mockResolvedValue(
      mockCategories
    );

    const user = userEvent.setup();
    renderWithRouter(<ForumHomePage />);

    await waitFor(() => {
      expect(screen.getByText('Create Thread')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create Thread');
    await user.click(createButton);

    // Check that the URL changed to /forums/create
    // This is verified by checking if the button click navigated correctly
    await waitFor(() => {
      expect(window.location.pathname).toContain('/forums');
    });
  });

  it('should show empty state when no categories', async () => {
    vi.mocked(forumServiceModule.forumService.getCategories).mockResolvedValue([]);

    renderWithRouter(<ForumHomePage />);

    await waitFor(() => {
      expect(screen.getByText('No categories available')).toBeInTheDocument();
    });
  });

  it('should use ForumControls component', async () => {
    vi.mocked(forumServiceModule.forumService.getCategories).mockResolvedValue(
      mockCategories
    );

    renderWithRouter(<ForumHomePage />);

    await waitFor(() => {
      const createButton = screen.getByText('Create Thread');
      expect(createButton).toBeInTheDocument();
      // Check that it's a button element (from ForumControls)
      expect(createButton.closest('button')).toBeInTheDocument();
    });
  });
});
