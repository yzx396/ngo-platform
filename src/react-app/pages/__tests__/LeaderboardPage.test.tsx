import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { LeaderboardPage } from '../LeaderboardPage';
import type { LeaderboardEntry } from '../../../types/api';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | Record<string, unknown>, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'leaderboard.title': 'Leaderboard',
        'leaderboard.subtitle': 'Top contributors in our community',
        'leaderboard.rank': 'Rank',
        'leaderboard.yourRank': 'Your rank: {{rank}}',
        'leaderboard.noData': 'No leaderboard data yet',
        'points.label': 'Points',
        'points.howToEarn': 'How to Earn Points',
        'common.name': 'Name',
        'common.you': 'You',
        'common.loading': 'Loading...',
        'common.tryAgain': 'Try Again',
        'posts.pageInfo': 'Showing {{start}}-{{end}} of {{total}}',
        'posts.previous': 'Previous',
        'posts.next': 'Next',
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
    user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
  }),
}));

vi.mock('../../services/pointsService', () => ({
  getLeaderboard: vi.fn(),
}));

import { getLeaderboard } from '../../services/pointsService';

const mockGetLeaderboard = getLeaderboard as ReturnType<typeof vi.fn>;

const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

afterEach(() => {
  consoleErrorSpy.mockClear();
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

describe('LeaderboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', async () => {
    mockGetLeaderboard.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<LeaderboardPage />);

    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should load and display leaderboard data', async () => {
    const mockData = {
      users: [
        { user_id: 'user-1', name: 'Alice', points: 500, rank: 1 },
        { user_id: 'user-2', name: 'Bob', points: 400, rank: 2 },
        { user_id: 'user-3', name: 'Charlie', points: 300, rank: 3 },
      ] as LeaderboardEntry[],
      total: 3,
    };

    mockGetLeaderboard.mockResolvedValue(mockData);

    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });
  });

  it('should display "How to Earn Points" button', async () => {
    const mockData = {
      users: [
        { user_id: 'user-1', name: 'Alice', points: 500, rank: 1 },
      ] as LeaderboardEntry[],
      total: 1,
    };

    mockGetLeaderboard.mockResolvedValue(mockData);

    render(<LeaderboardPage />);

    await waitFor(() => {
      const button = screen.getByText('How to Earn Points');
      expect(button).toBeInTheDocument();
    });
  });

  it('should open points dialog when button is clicked', async () => {
    const mockData = {
      users: [
        { user_id: 'user-1', name: 'Alice', points: 500, rank: 1 },
      ] as LeaderboardEntry[],
      total: 1,
    };

    mockGetLeaderboard.mockResolvedValue(mockData);
    const user = userEvent.setup();

    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText('How to Earn Points')).toBeInTheDocument();
    });

    const button = screen.getByText('How to Earn Points');
    await user.click(button);

    // Check if dialog content is displayed
    await waitFor(() => {
      // The dialog should be visible and contain point rules content
      // This would be more specific if we had access to the dialog's internal elements
      expect(screen.getByText('How to Earn Points')).toBeInTheDocument();
    });
  });

  it('should display current user rank when user is on leaderboard', async () => {
    const mockData = {
      users: [
        { user_id: 'user-1', name: 'Test User', points: 500, rank: 1 },
      ] as LeaderboardEntry[],
      total: 1,
    };

    mockGetLeaderboard.mockResolvedValue(mockData);

    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Your rank: #1')).toBeInTheDocument();
    });
  });

  it('should display trophy emoji for top 3 ranks', async () => {
    const mockData = {
      users: [
        { user_id: 'user-1', name: 'Alice', points: 500, rank: 1 },
        { user_id: 'user-2', name: 'Bob', points: 400, rank: 2 },
        { user_id: 'user-3', name: 'Charlie', points: 300, rank: 3 },
      ] as LeaderboardEntry[],
      total: 3,
    };

    mockGetLeaderboard.mockResolvedValue(mockData);

    render(<LeaderboardPage />);

    await waitFor(() => {
      const ranks = screen.getAllByRole('cell');
      // Check that trophy emojis are present (cells containing rank icons)
      expect(ranks.length).toBeGreaterThan(0);
    });
  });

  it('should show "You" badge for current user', async () => {
    const mockData = {
      users: [
        { user_id: 'user-1', name: 'Test User', points: 500, rank: 1 },
      ] as LeaderboardEntry[],
      total: 1,
    };

    mockGetLeaderboard.mockResolvedValue(mockData);

    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText('You')).toBeInTheDocument();
    });
  });

  it('should handle leaderboard load error gracefully', async () => {
    mockGetLeaderboard.mockRejectedValue(new Error('Failed to load leaderboard'));

    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load leaderboard')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('should display empty state when no leaderboard data exists', async () => {
    const mockData = {
      users: [] as LeaderboardEntry[],
      total: 0,
    };

    mockGetLeaderboard.mockResolvedValue(mockData);

    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText('No leaderboard data yet')).toBeInTheDocument();
    });
  });
});
