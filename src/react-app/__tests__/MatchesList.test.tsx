import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MatchesList } from '../pages/MatchesList';
import { AuthProvider } from '../context/AuthContext';
import * as matchService from '../services/matchService';
import type { User } from '../../types/user';
import type { Match } from '../../types/match';

// Mock the services
vi.mock('../services/matchService');

const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  created_at: 1000,
  updated_at: 2000,
};


// Helper to render component with AuthProvider
function renderWithAuth(user: User | null = null) {
  // Mock fetch for auth - no localStorage needed (auth uses cookies)
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
  });

  describe('Auto-detect Role and Fetch Matches', () => {
    it('should NOT render View As toggle buttons', async () => {
      vi.mocked(matchService.getMatches).mockResolvedValue([]);

      renderWithAuth(mockUser);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Toggle buttons should NOT exist
      expect(screen.queryByText('View As')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /as mentee/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /as mentor/i })).not.toBeInTheDocument();
    });

    it('should fetch both mentor and mentee matches on mount', async () => {
      vi.mocked(matchService.getMatches).mockResolvedValue([]);

      renderWithAuth(mockUser);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Both role-specific match fetches should be called
      expect(matchService.getMatches).toHaveBeenCalledWith({ role: 'mentor' });
      expect(matchService.getMatches).toHaveBeenCalledWith({ role: 'mentee' });
      expect(matchService.getMatches).toHaveBeenCalledTimes(2);
    });

    it('should display only mentee section when user has mentee matches only', async () => {
      const menteeMatches: Match[] = [
        {
          id: 'match-1',
          mentor_id: 'mentor-1',
          mentee_id: 'user-123',
          mentor_name: 'John Mentor',
          status: 'pending',
          introduction: 'I would like mentorship',
          preferred_time: 'Weekends',
          created_at: 1000,
          updated_at: 2000,
        },
      ];

      vi.mocked(matchService.getMatches).mockImplementation(async ({ role }) => {
        if (role === 'mentee') return menteeMatches;
        if (role === 'mentor') return [];
        return [];
      });

      renderWithAuth(mockUser);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Mentee section should be visible
      await waitFor(() => {
        // Look for the section header specifically
        const sectionHeaders = screen.getAllByRole('heading');
        const hasMentorsSection = sectionHeaders.some(h => h.textContent === 'Your Mentors');
        expect(hasMentorsSection).toBe(true);
        expect(screen.getByText(/John Mentor/i)).toBeInTheDocument();
      });

      // Mentor section should NOT be visible
      const allHeaderText = screen.queryAllByRole('heading').map(h => h.textContent);
      expect(allHeaderText).not.toContain('Your Mentees');
    });

    it('should display only mentor section when user has mentor matches only', async () => {
      const mentorMatches: Match[] = [
        {
          id: 'match-1',
          mentor_id: 'user-123',
          mentee_id: 'mentee-1',
          mentee_name: 'Jane Mentee',
          status: 'pending',
          introduction: 'I would like mentorship',
          preferred_time: 'Weekends',
          created_at: 1000,
          updated_at: 2000,
        },
      ];

      vi.mocked(matchService.getMatches).mockImplementation(async ({ role }) => {
        if (role === 'mentor') return mentorMatches;
        if (role === 'mentee') return [];
        return [];
      });

      renderWithAuth(mockUser);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Mentor section should be visible
      await waitFor(() => {
        // Look for the section header specifically
        const sectionHeaders = screen.getAllByRole('heading');
        const hasMenteesSection = sectionHeaders.some(h => h.textContent === 'Your Mentees');
        expect(hasMenteesSection).toBe(true);
        expect(screen.getByText(/Jane Mentee/i)).toBeInTheDocument();
      });

      // Mentee section should NOT be visible
      const allHeaderText = screen.queryAllByRole('heading').map(h => h.textContent);
      expect(allHeaderText).not.toContain('Your Mentors');
    });

    it('should display both sections when user has both mentor and mentee matches (split view)', async () => {
      const mentorMatches: Match[] = [
        {
          id: 'match-mentor-1',
          mentor_id: 'user-123',
          mentee_id: 'mentee-1',
          mentee_name: 'Jane Mentee',
          status: 'pending',
          introduction: 'I would like mentorship',
          preferred_time: 'Weekends',
          created_at: 1000,
          updated_at: 2000,
        },
      ];

      const menteeMatches: Match[] = [
        {
          id: 'match-mentee-1',
          mentor_id: 'mentor-1',
          mentee_id: 'user-123',
          mentor_name: 'John Mentor',
          status: 'pending',
          introduction: 'Looking for guidance',
          preferred_time: 'Weekdays',
          created_at: 1000,
          updated_at: 2000,
        },
      ];

      vi.mocked(matchService.getMatches).mockImplementation(async ({ role }) => {
        if (role === 'mentor') return mentorMatches;
        if (role === 'mentee') return menteeMatches;
        return [];
      });

      renderWithAuth(mockUser);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Both sections should be visible
      await waitFor(() => {
        const sectionHeaders = screen.getAllByRole('heading');
        const headerTexts = sectionHeaders.map(h => h.textContent);
        expect(headerTexts).toContain('Your Mentees');
        expect(headerTexts).toContain('Your Mentors');
      });

      // Both matches should be displayed
      expect(screen.getByText(/Jane Mentee/i)).toBeInTheDocument();
      expect(screen.getByText(/John Mentor/i)).toBeInTheDocument();
    });

    it('should display empty state when user has no matches at all', async () => {
      vi.mocked(matchService.getMatches).mockResolvedValue([]);

      renderWithAuth(mockUser);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Empty state should be shown
      await waitFor(() => {
        expect(screen.getByText(/No matches/i)).toBeInTheDocument();
        expect(screen.getByText(/You don't have any matches yet/i)).toBeInTheDocument();
      });

      // No section headers should be visible (check that only h1 exists for "My Matches" title)
      const allHeaders = screen.queryAllByRole('heading');
      const headerTexts = allHeaders.map(h => h.textContent);
      expect(headerTexts).not.toContain('Your Mentees');
      expect(headerTexts).not.toContain('Your Mentors');
    });
  });

  describe('Sidebar Filters', () => {
    it('should have status filter options', async () => {
      vi.mocked(matchService.getMatches).mockResolvedValue([]);

      renderWithAuth(mockUser);

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
      vi.mocked(matchService.getMatches).mockResolvedValue([]);

      renderWithAuth(mockUser);

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
          mentor_id: 'user-123',
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

      vi.mocked(matchService.getMatches).mockImplementation(async ({ role }) => {
        if (role === 'mentor') return pendingMatches;
        return [];
      });

      renderWithAuth(mockUser);

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

    it('should display email addresses for active matches (mentor view)', async () => {
      const activeMatches: Match[] = [
        {
          id: 'match-active',
          mentor_id: 'user-123',
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

      vi.mocked(matchService.getMatches).mockImplementation(async ({ role }) => {
        if (role === 'mentor') return activeMatches;
        return [];
      });

      renderWithAuth(mockUser);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Wait for matches to be displayed
      await waitFor(() => {
        expect(screen.getByText(/Bob Mentee/i)).toBeInTheDocument();
      });

      // Since user is viewing as mentor, should see mentee email
      await waitFor(() => {
        expect(screen.getByText('mentee2@example.com')).toBeInTheDocument();
      });

      // Mentor email should not be visible when viewing as mentor
      expect(screen.queryByText('mentor@example.com')).not.toBeInTheDocument();
    });

    it('should display email addresses for active matches (mentee view)', async () => {
      const activeMatches: Match[] = [
        {
          id: 'match-active',
          mentor_id: 'mentor-1',
          mentee_id: 'user-123',
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

      vi.mocked(matchService.getMatches).mockImplementation(async ({ role }) => {
        if (role === 'mentee') return activeMatches;
        return [];
      });

      renderWithAuth(mockUser);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Wait for matches to be displayed
      await waitFor(() => {
        expect(screen.getByText(/John Mentor/i)).toBeInTheDocument();
      });

      // Since user is viewing as mentee, should see mentor email
      await waitFor(() => {
        expect(screen.getByText('mentor@example.com')).toBeInTheDocument();
      });

      // Mentee email should not be visible when viewing as mentee
      expect(screen.queryByText('mentee2@example.com')).not.toBeInTheDocument();
    });

    it('should display LinkedIn URL for active matches when mentor has one', async () => {
      const activeMatchesWithLinkedIn: Match[] = [
        {
          id: 'match-linkedin',
          mentor_id: 'mentor-1',
          mentee_id: 'user-123',
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

      vi.mocked(matchService.getMatches).mockImplementation(async ({ role }) => {
        if (role === 'mentee') return activeMatchesWithLinkedIn;
        return [];
      });

      renderWithAuth(mockUser);

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
          mentor_id: 'user-123',
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

      vi.mocked(matchService.getMatches).mockImplementation(async ({ role }) => {
        if (role === 'mentor') return pendingMatches;
        return [];
      });

      renderWithAuth(mockUser);

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
