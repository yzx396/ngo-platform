import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MatchesList } from '../pages/MatchesList';
import { AuthProvider } from '../context/AuthContext';
import * as matchService from '../services/matchService';
import * as mentorService from '../services/mentorService';
import type { User } from '../../types/user';
import type { Match } from '../../types/match';
import type { MentorProfile } from '../../types/mentor';
import { MentoringLevel, PaymentType } from '../../types/mentor';

// Mock the services
vi.mock('../services/matchService');
vi.mock('../services/mentorService');

const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  created_at: 1000,
  updated_at: 2000,
};

const mockMentorProfile: MentorProfile = {
  id: 'mentor-1',
  user_id: 'user-123',
  nick_name: 'TestMentor',
  bio: 'Test bio',
  mentoring_levels: MentoringLevel.Entry | MentoringLevel.Senior,
  hourly_rate: 100,
  payment_types: PaymentType.Venmo | PaymentType.PayPal,
  availability: 'Mon-Fri 9am-5pm',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockMatches: Match[] = [
  {
    id: 'match-1',
    mentor_id: 'mentor-1',
    mentee_id: 'mentee-1',
    status: 'pending',
    created_at: 1000,
    updated_at: 2000,
  },
  {
    id: 'match-2',
    mentor_id: 'mentor-1',
    mentee_id: 'mentee-2',
    status: 'active',
    created_at: 1000,
    updated_at: 2000,
  },
];

// Helper to render component with AuthProvider
function renderWithAuth(user: User | null = null, token: string | null = null) {
  // Mock localStorage
  if (token) {
    localStorage.setItem('auth_token', token);
  }

  // Mock fetch for auth
  global.fetch = vi.fn((url: string | URL | Request) => {
    const urlString = typeof url === 'string' ? url : url.toString();
    if (urlString.includes('/api/v1/auth/me')) {
      if (user) {
        return Promise.resolve(new Response(JSON.stringify(user)));
      }
      return Promise.resolve(new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 }));
    }
    return Promise.reject(new Error('Not found'));
  });

  return render(
    <BrowserRouter>
      <AuthProvider>
        <MatchesList />
      </AuthProvider>
    </BrowserRouter>
  );
}

describe('MatchesList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Role Selection Based on Mentor Status', () => {
    it('should default to "As Mentee" when user is not a mentor', async () => {
      // Mock: User does not have a mentor profile
      vi.mocked(mentorService.getMentorProfileByUserId).mockResolvedValue(null);
      vi.mocked(matchService.getMatches).mockResolvedValue([]);

      renderWithAuth(mockUser, 'test-token');

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Check that "As Mentee" button is active (highlighted)
      const menteeButton = screen.getByRole('button', { name: /as mentee/i });
      expect(menteeButton).toHaveClass('bg-primary');
      expect(menteeButton).toHaveClass('text-primary-foreground');

      // Verify the service was called with mentee role
      expect(matchService.getMatches).toHaveBeenCalledWith({ role: 'mentee' });
    });

    it('should default to "As Mentor" when user has a mentor profile', async () => {
      // Mock: User has a mentor profile
      vi.mocked(mentorService.getMentorProfileByUserId).mockResolvedValue(mockMentorProfile);
      vi.mocked(matchService.getMatches).mockResolvedValue(mockMatches);

      renderWithAuth(mockUser, 'test-token');

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Wait for the role to be set to mentor
      await waitFor(() => {
        const mentorButton = screen.getByRole('button', { name: /as mentor/i });
        expect(mentorButton).toHaveClass('bg-primary');
        expect(mentorButton).toHaveClass('text-primary-foreground');
      });

      // Verify getMentorProfileByUserId was called
      expect(mentorService.getMentorProfileByUserId).toHaveBeenCalledWith('user-123');

      // Verify the service was called with mentor role
      expect(matchService.getMatches).toHaveBeenCalledWith({ role: 'mentor' });
    });

    it('should handle error when checking mentor status gracefully', async () => {
      // Mock: Error when checking mentor profile
      vi.mocked(mentorService.getMentorProfileByUserId).mockRejectedValue(new Error('API error'));
      vi.mocked(matchService.getMatches).mockResolvedValue([]);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderWithAuth(mockUser, 'test-token');

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Should default to mentee when error occurs
      const menteeButton = screen.getByRole('button', { name: /as mentee/i });
      expect(menteeButton).toHaveClass('bg-primary');

      // Error should be logged
      expect(consoleSpy).toHaveBeenCalledWith('Failed to check mentor status:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should not check mentor status if user is not available', async () => {
      vi.mocked(matchService.getMatches).mockResolvedValue([]);

      renderWithAuth(null, null); // No authenticated user

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // getMentorProfileByUserId should not have been called
      expect(mentorService.getMentorProfileByUserId).not.toHaveBeenCalled();
    });
  });

  describe('Matches Display', () => {
    it('should display matches for mentor', async () => {
      vi.mocked(mentorService.getMentorProfileByUserId).mockResolvedValue(mockMentorProfile);
      vi.mocked(matchService.getMatches).mockResolvedValue(mockMatches);

      renderWithAuth(mockUser, 'test-token');

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Wait for the role to be set to mentor and matches to be displayed
      await waitFor(() => {
        expect(screen.getByText(/Mentee mentee-1/i)).toBeInTheDocument();
        expect(screen.getByText(/Mentee mentee-2/i)).toBeInTheDocument();
      });
    });

    it('should show empty state when no matches found', async () => {
      vi.mocked(mentorService.getMentorProfileByUserId).mockResolvedValue(null);
      vi.mocked(matchService.getMatches).mockResolvedValue([]);

      renderWithAuth(mockUser, 'test-token');

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      expect(screen.getByText(/No matches/i)).toBeInTheDocument();
      expect(screen.getByText(/You don't have any matches yet/i)).toBeInTheDocument();
    });
  });

  describe('Page Header', () => {
    it('should show correct header for mentee view', async () => {
      vi.mocked(mentorService.getMentorProfileByUserId).mockResolvedValue(null);
      vi.mocked(matchService.getMatches).mockResolvedValue([]);

      renderWithAuth(mockUser, 'test-token');

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      expect(screen.getByText('My Matches')).toBeInTheDocument();
      expect(screen.getByText(/your mentorship requests/i)).toBeInTheDocument();
    });

    it('should show correct header for mentor view', async () => {
      vi.mocked(mentorService.getMentorProfileByUserId).mockResolvedValue(mockMentorProfile);
      vi.mocked(matchService.getMatches).mockResolvedValue([]);

      renderWithAuth(mockUser, 'test-token');

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Wait for the role to be set to mentor and header to update
      await waitFor(() => {
        expect(screen.getByText(/mentorship requests from mentees/i)).toBeInTheDocument();
      });

      expect(screen.getByText('My Matches')).toBeInTheDocument();
    });
  });

  describe('Sidebar Filters', () => {
    it('should have view as role selector', async () => {
      vi.mocked(mentorService.getMentorProfileByUserId).mockResolvedValue(null);
      vi.mocked(matchService.getMatches).mockResolvedValue([]);

      renderWithAuth(mockUser, 'test-token');

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      expect(screen.getByText('View As')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /as mentee/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /as mentor/i })).toBeInTheDocument();
    });

    it('should have status filter options', async () => {
      vi.mocked(mentorService.getMentorProfileByUserId).mockResolvedValue(null);
      vi.mocked(matchService.getMatches).mockResolvedValue([]);

      renderWithAuth(mockUser, 'test-token');

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      expect(screen.getByText('Filter by Status')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /pending/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /active/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /completed/i })).toBeInTheDocument();
    });

    it('should have refresh button', async () => {
      vi.mocked(mentorService.getMentorProfileByUserId).mockResolvedValue(null);
      vi.mocked(matchService.getMatches).mockResolvedValue([]);

      renderWithAuth(mockUser, 'test-token');

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
  });
});
