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
    mentor_name: 'John Mentor',
    status: 'pending',
    introduction: 'I would like mentorship',
    preferred_time: 'Weekends',
    created_at: 1000,
    updated_at: 2000,
  },
  {
    id: 'match-2',
    mentor_id: 'mentor-1',
    mentee_id: 'mentee-2',
    mentor_name: 'John Mentor',
    mentor_email: 'mentor@example.com',
    mentee_email: 'mentee2@example.com',
    status: 'active',
    introduction: 'Looking forward to learning',
    preferred_time: 'Weekdays',
    created_at: 1000,
    updated_at: 2000,
  },
  {
    id: 'match-3',
    mentor_id: 'mentor-1',
    mentee_id: 'mentee-3',
    mentor_name: 'John Mentor',
    mentor_email: 'mentor@example.com',
    mentee_email: 'mentee3@example.com',
    mentor_linkedin_url: 'https://www.linkedin.com/in/johnmentor',
    status: 'completed',
    introduction: 'Thank you for mentorship',
    preferred_time: 'Anytime',
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

      // Verify the service was last called with mentor role
      // Note: getMatches is called twice - first with default 'mentee', then with 'mentor' after status is determined
      expect(matchService.getMatches).toHaveBeenLastCalledWith({ role: 'mentor' });
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

  describe('Contact Information Display', () => {
    it('should NOT display email addresses for pending matches', async () => {
      const pendingMatches: Match[] = [
        {
          id: 'match-pending',
          mentor_id: 'mentor-1',
          mentee_id: 'mentee-1',
          mentor_name: 'John Mentor',
          mentee_name: 'Jane Mentee',
          status: 'pending',
          introduction: 'Looking for mentorship',
          preferred_time: 'Weekends',
          created_at: 1000,
          updated_at: 2000,
        },
      ];

      vi.mocked(mentorService.getMentorProfileByUserId).mockResolvedValue(mockMentorProfile);
      vi.mocked(matchService.getMatches).mockResolvedValue(pendingMatches);

      renderWithAuth(mockUser, 'test-token');

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Wait for matches to be displayed
      await waitFor(() => {
        expect(screen.getByText(/Jane Mentee/i)).toBeInTheDocument();
      });

      // Email addresses should NOT be visible
      expect(screen.queryByText('mentor@example.com')).not.toBeInTheDocument();
      expect(screen.queryByText('mentee@example.com')).not.toBeInTheDocument();
    });

    it('should display email addresses for active matches', async () => {
      const activeMatches: Match[] = [
        {
          id: 'match-active',
          mentor_id: 'mentor-1',
          mentee_id: 'mentee-2',
          mentor_name: 'John Mentor',
          mentee_name: 'Bob Mentee',
          mentor_email: 'mentor@example.com',
          mentee_email: 'mentee2@example.com',
          status: 'active',
          introduction: 'Looking forward to learning',
          preferred_time: 'Weekdays',
          created_at: 1000,
          updated_at: 2000,
        },
      ];

      vi.mocked(mentorService.getMentorProfileByUserId).mockResolvedValue(mockMentorProfile);
      vi.mocked(matchService.getMatches).mockResolvedValue(activeMatches);

      renderWithAuth(mockUser, 'test-token');

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Wait for matches to be displayed and role to be set to mentor
      await waitFor(() => {
        expect(screen.getByText(/Bob Mentee/i)).toBeInTheDocument();
      });

      // Since user is a mentor, should see mentee email
      await waitFor(() => {
        expect(screen.getByText('mentee2@example.com')).toBeInTheDocument();
      });
      
      // Mentor email should not be visible when viewing as mentor
      expect(screen.queryByText('mentor@example.com')).not.toBeInTheDocument();
    });

    it('should display email addresses for completed matches', async () => {
      const completedMatches: Match[] = [
        {
          id: 'match-completed',
          mentor_id: 'mentor-1',
          mentee_id: 'mentee-3',
          mentor_name: 'John Mentor',
          mentee_name: 'Alice Mentee',
          mentor_email: 'mentor@example.com',
          mentee_email: 'mentee3@example.com',
          status: 'completed',
          introduction: 'Thank you for mentorship',
          preferred_time: 'Anytime',
          created_at: 1000,
          updated_at: 2000,
        },
      ];

      vi.mocked(mentorService.getMentorProfileByUserId).mockResolvedValue(mockMentorProfile);
      vi.mocked(matchService.getMatches).mockResolvedValue(completedMatches);

      renderWithAuth(mockUser, 'test-token');

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Wait for matches to be displayed and role to be set to mentor
      await waitFor(() => {
        expect(screen.getByText(/Alice Mentee/i)).toBeInTheDocument();
      });

      // Since user is a mentor, should see mentee email
      await waitFor(() => {
        expect(screen.getByText('mentee3@example.com')).toBeInTheDocument();
      });
      
      // Mentor email should not be visible when viewing as mentor
      expect(screen.queryByText('mentor@example.com')).not.toBeInTheDocument();
    });

    it('should display LinkedIn URL for active matches when mentor has one', async () => {
      const activeMatchesWithLinkedIn: Match[] = [
        {
          id: 'match-linkedin',
          mentor_id: 'mentor-1',
          mentee_id: 'mentee-2',
          mentor_name: 'John Mentor',
          mentee_name: 'Bob Mentee',
          mentor_email: 'mentor@example.com',
          mentee_email: 'mentee2@example.com',
          mentor_linkedin_url: 'https://www.linkedin.com/in/johnmentor',
          status: 'active',
          introduction: 'Looking forward to learning',
          preferred_time: 'Weekdays',
          created_at: 1000,
          updated_at: 2000,
        },
      ];

      // Don't mock mentor profile so user defaults to mentee role
      vi.mocked(mentorService.getMentorProfileByUserId).mockResolvedValue(null);
      vi.mocked(matchService.getMatches).mockResolvedValue(activeMatchesWithLinkedIn);

      renderWithAuth(mockUser, 'test-token');

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Wait for matches to be displayed (viewing as mentee)
      await waitFor(() => {
        expect(screen.getByText(/John Mentor/i)).toBeInTheDocument();
      });

      // LinkedIn URL should be visible as a link (when viewing as mentee)
      await waitFor(() => {
        const linkedInLink = screen.getByRole('link', { name: /linkedin profile/i });
        expect(linkedInLink).toBeInTheDocument();
        expect(linkedInLink).toHaveAttribute('href', 'https://www.linkedin.com/in/johnmentor');
        expect(linkedInLink).toHaveAttribute('target', '_blank');
        expect(linkedInLink).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });

    it('should NOT display LinkedIn URL for pending matches', async () => {
      const pendingMatches: Match[] = [
        {
          id: 'match-pending-no-linkedin',
          mentor_id: 'mentor-1',
          mentee_id: 'mentee-1',
          mentor_name: 'John Mentor',
          mentee_name: 'Jane Mentee',
          status: 'pending',
          introduction: 'Looking for mentorship',
          preferred_time: 'Weekends',
          created_at: 1000,
          updated_at: 2000,
        },
      ];

      vi.mocked(mentorService.getMentorProfileByUserId).mockResolvedValue(mockMentorProfile);
      vi.mocked(matchService.getMatches).mockResolvedValue(pendingMatches);

      renderWithAuth(mockUser, 'test-token');

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Wait for matches to be displayed
      await waitFor(() => {
        expect(screen.getByText(/Jane Mentee/i)).toBeInTheDocument();
      });

      // LinkedIn link should NOT be visible
      expect(screen.queryByRole('link', { name: /linkedin profile/i })).not.toBeInTheDocument();
    });
  });
});
