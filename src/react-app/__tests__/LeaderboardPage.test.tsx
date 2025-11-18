import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { LeaderboardPage } from '../pages/LeaderboardPage';
import * as pointsService from '../services/pointsService';
import { AuthProvider } from '../context/AuthContext';

// Mock the pointsService
vi.mock('../services/pointsService');

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const mockLeaderboardData: Record<string, unknown> = {
  users: [
    { user_id: 'user1', name: 'Alice', points: 1500, rank: 1 },
    { user_id: 'user2', name: 'Bob', points: 1200, rank: 2 },
    { user_id: 'user3', name: 'Charlie', points: 1000, rank: 3 },
    { user_id: 'user4', name: 'David', points: 900, rank: 4 },
    { user_id: 'user5', name: 'Eve', points: 800, rank: 5 },
  ],
  total: 5,
  limit: 50,
  offset: 0,
} as Record<string, unknown>;

describe('LeaderboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch for AuthProvider
    global.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }))
    );
    const mock = pointsService.getLeaderboard as unknown as ReturnType<typeof vi.fn>;
    mock.mockResolvedValue(mockLeaderboardData);
  });

  it('should render leaderboard title', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <LeaderboardPage />
        </AuthProvider>
      </I18nextProvider>
    );

    await waitFor(() => {
      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toBeInTheDocument();
      expect(title.textContent).toContain('Leaderboard');
    });
  });

  it('should display loading state initially', () => {
    const mock = pointsService.getLeaderboard as unknown as ReturnType<typeof vi.fn>;
    mock.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <LeaderboardPage />
        </AuthProvider>
      </I18nextProvider>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should render users in leaderboard', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <LeaderboardPage />
        </AuthProvider>
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });
  });

  it('should display points for each user', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <LeaderboardPage />
        </AuthProvider>
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/1,500/)).toBeInTheDocument();
      expect(screen.getByText(/1,200/)).toBeInTheDocument();
    });
  });

  it('should display rank medals for top 3', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <LeaderboardPage />
        </AuthProvider>
      </I18nextProvider>
    );

    await waitFor(() => {
      // Check for the gold, silver, and bronze medal emojis for top 3 positions
      const goldMedal = screen.queryByText('🥇');
      const silverMedal = screen.queryByText('🥈');
      const bronzeMedal = screen.queryByText('🥉');
      expect([goldMedal, silverMedal, bronzeMedal].filter(Boolean).length).toBeGreaterThanOrEqual(3);
    });
  });

  it('should display rank numbers for positions > 3', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <LeaderboardPage />
        </AuthProvider>
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('#4')).toBeInTheDocument();
      expect(screen.getByText('#5')).toBeInTheDocument();
    });
  });

  it('should call getLeaderboard with correct parameters', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <LeaderboardPage />
        </AuthProvider>
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(pointsService.getLeaderboard).toHaveBeenCalledWith(50, 0);
    });
  });

  it('should handle empty leaderboard', async () => {
    const mock = pointsService.getLeaderboard as unknown as ReturnType<typeof vi.fn>;
    mock.mockResolvedValue({
      users: [],
      total: 0,
      limit: 50,
      offset: 0,
    });

    render(
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <LeaderboardPage />
        </AuthProvider>
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/no leaderboard data/i)).toBeInTheDocument();
    });
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Failed to fetch');
    const mock = pointsService.getLeaderboard as unknown as ReturnType<typeof vi.fn>;
    mock.mockRejectedValue(error);

    render(
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <LeaderboardPage />
        </AuthProvider>
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  it('should not show pagination when total less than limit', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <LeaderboardPage />
        </AuthProvider>
      </I18nextProvider>
    );

    await waitFor(() => {
      // When total (5) < limit (50), pagination should not be displayed
      const buttons = screen.queryAllByRole('button', { name: /next|previous/i });
      expect(buttons.length).toBe(0);
    });
  });

  it('should show pagination info when has pagination', async () => {
    // Mock with more users to trigger pagination
    const mock = pointsService.getLeaderboard as unknown as ReturnType<typeof vi.fn>;
    mock.mockResolvedValue({
      users: Array.from({ length: 50 }, (_, i) => ({
        user_id: `user${i}`,
        name: `User ${i}`,
        points: 1000 - i * 10,
        rank: i + 1,
      })),
      total: 100,
      limit: 50,
      offset: 0,
    });

    render(
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <LeaderboardPage />
        </AuthProvider>
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Showing 1-50 of 100/)).toBeInTheDocument();
    });
  });

  it('should be accessible with semantic table structure', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <LeaderboardPage />
        </AuthProvider>
      </I18nextProvider>
    );

    await waitFor(() => {
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      const headerCells = screen.getAllByRole('columnheader');
      expect(headerCells.length).toBeGreaterThan(0);
    });
  });
});
