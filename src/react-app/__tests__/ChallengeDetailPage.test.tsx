import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ChallengeDetailPage } from '../pages/ChallengeDetailPage';
import * as challengeServiceModule from '../services/challengeService';
import * as authContextModule from '../context/AuthContext';
import { SubmissionStatus } from '../../types/challenge';
import type { ChallengeWithStatus } from '../../types/challenge';

vi.mock('../services/challengeService');
vi.mock('../context/AuthContext');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: { language: 'en' },
  }),
}));

const mockChallenge: ChallengeWithStatus = {
  id: 'chal_123',
  title: 'Learn React',
  description: 'Master React basics',
  requirements: 'Build a React component',
  created_by_user_id: 'user_admin',
  point_reward: 100,
  deadline: Date.now() + 86400000,
  status: 'active',
  created_at: Date.now(),
  updated_at: Date.now(),
  participant_count: 5,
  creator_name: 'Admin',
  user_has_joined: false,
  user_submission: null,
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <MemoryRouter initialEntries={['/challenges/chal_123']}>
      <Routes>
        <Route path="/challenges/:id" element={component} />
        <Route path="/challenges" element={<div>Challenges List</div>} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('ChallengeDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authContextModule.useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'user_123', email: 'test@example.com', name: 'User', role: 'member', points: 0 },
      role: 'member',
      logout: vi.fn(),
      login: vi.fn(),
      getUser: vi.fn(),
    });
  });

  describe('Loading State', () => {
    it('should display loading spinner while fetching', () => {
      vi.mocked(challengeServiceModule.getChallengeById).mockImplementation(
        () => new Promise(() => {})
      );

      renderWithRouter(<ChallengeDetailPage />);

      // Loader2 renders as SVG with animate-spin class
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when challenge not found', async () => {
      const error = new Error('Challenge not found');
      vi.mocked(challengeServiceModule.getChallengeById).mockRejectedValue(error);

      renderWithRouter(<ChallengeDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load challenge/i)).toBeInTheDocument();
      });
    });

    it('should show back button on error', async () => {
      const error = new Error('Failed to load');
      vi.mocked(challengeServiceModule.getChallengeById).mockRejectedValue(error);

      renderWithRouter(<ChallengeDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/Back/i)).toBeInTheDocument();
      });
    });
  });

  describe('Challenge Details', () => {
    it('should display challenge title and description', async () => {
      vi.mocked(challengeServiceModule.getChallengeById).mockResolvedValue(mockChallenge);

      renderWithRouter(<ChallengeDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Learn React')).toBeInTheDocument();
        expect(screen.getByText('Master React basics')).toBeInTheDocument();
      });
    });

    it('should display challenge details (points, participants, deadline)', async () => {
      vi.mocked(challengeServiceModule.getChallengeById).mockResolvedValue(mockChallenge);

      renderWithRouter(<ChallengeDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/100 points/i)).toBeInTheDocument();
        expect(screen.getByText(/5 participants/i)).toBeInTheDocument();
      });
    });

    it('should display requirements', async () => {
      vi.mocked(challengeServiceModule.getChallengeById).mockResolvedValue(mockChallenge);

      renderWithRouter(<ChallengeDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Build a React component')).toBeInTheDocument();
      });
    });
  });

  describe('User Actions - Not Joined', () => {
    it('should show join button when user has not joined', async () => {
      vi.mocked(challengeServiceModule.getChallengeById).mockResolvedValue(mockChallenge);

      renderWithRouter(<ChallengeDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/Join Challenge/i)).toBeInTheDocument();
      });
    });

    it('should call joinChallenge and reload when join button clicked', async () => {
      vi.mocked(challengeServiceModule.getChallengeById)
        .mockResolvedValueOnce(mockChallenge)
        .mockResolvedValueOnce({ ...mockChallenge, user_has_joined: true });
      vi.mocked(challengeServiceModule.joinChallenge).mockResolvedValue(undefined);

      renderWithRouter(<ChallengeDetailPage />);

      const joinButton = await screen.findByRole('button', { name: /Join Challenge/i }, { timeout: 3000 });
      fireEvent.click(joinButton);

      await waitFor(() => {
        expect(challengeServiceModule.joinChallenge).toHaveBeenCalledWith('chal_123');
      }, { timeout: 3000 });
    });
  });

  describe('Submission - Joined But Not Submitted', () => {
    it('should show submission form when user has joined', async () => {
      const joinedChallenge = { ...mockChallenge, user_has_joined: true };
      vi.mocked(challengeServiceModule.getChallengeById).mockResolvedValue(joinedChallenge);

      renderWithRouter(<ChallengeDetailPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Submission Details/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Proof URL/i)).toBeInTheDocument();
      });
    });

    it('should submit challenge with text and optional URL', async () => {
      const joinedChallenge = { ...mockChallenge, user_has_joined: true };
      vi.mocked(challengeServiceModule.getChallengeById)
        .mockResolvedValueOnce(joinedChallenge)
        .mockResolvedValueOnce({
          ...joinedChallenge,
          user_submission: { id: 'sub_123', status: SubmissionStatus.Pending },
        } as any);
      vi.mocked(challengeServiceModule.submitChallenge).mockResolvedValue({} as any);

      const user = userEvent.setup();
      renderWithRouter(<ChallengeDetailPage />);

      // Wait for textarea to appear
      const textArea = await screen.findByLabelText(/Submission Details/i, {}, { timeout: 3000 });

      // Type in the fields using userEvent to properly update state
      await user.type(textArea, 'I built a React component');

      const urlInput = screen.getByLabelText(/Proof URL/i);
      await user.type(urlInput, 'https://example.com/proof');

      // Find and click the submit button
      const submitButton = screen.getByRole('button', { name: /Submit Completion/i });

      // Wait for button to be enabled
      await waitFor(() => {
        expect(submitButton).toBeEnabled();
      }, { timeout: 2000 });

      await user.click(submitButton);

      await waitFor(() => {
        expect(challengeServiceModule.submitChallenge).toHaveBeenCalledWith('chal_123', {
          submission_text: 'I built a React component',
          submission_url: 'https://example.com/proof',
        });
      }, { timeout: 3000 });
    });

    it('should disable submit button when text is empty', async () => {
      const joinedChallenge = { ...mockChallenge, user_has_joined: true };
      vi.mocked(challengeServiceModule.getChallengeById).mockResolvedValue(joinedChallenge);

      renderWithRouter(<ChallengeDetailPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Submission Details/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByText(/Submit Completion/i) as HTMLButtonElement;
      expect(submitButton.disabled).toBe(true);
    });
  });

  describe('Submission Statuses', () => {
    it('should show pending message when submission is pending', async () => {
      const pendingChallenge: ChallengeWithStatus = {
        ...mockChallenge,
        user_has_joined: true,
        user_submission: {
          id: 'sub_123',
          user_id: 'user_123',
          challenge_id: 'chal_123',
          submission_text: 'My submission',
          submission_url: null,
          status: SubmissionStatus.Pending,
          submitted_at: Date.now(),
          reviewed_at: null,
          reviewed_by_user_id: null,
          feedback: null,
        },
      };
      vi.mocked(challengeServiceModule.getChallengeById).mockResolvedValue(pendingChallenge);

      renderWithRouter(<ChallengeDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/Submission Pending Review/i)).toBeInTheDocument();
      });
    });

    it('should show approved message with points earned', async () => {
      const approvedChallenge: ChallengeWithStatus = {
        ...mockChallenge,
        user_has_joined: true,
        user_submission: {
          id: 'sub_123',
          user_id: 'user_123',
          challenge_id: 'chal_123',
          submission_text: 'My submission',
          submission_url: null,
          status: SubmissionStatus.Approved,
          submitted_at: Date.now(),
          reviewed_at: Date.now(),
          reviewed_by_user_id: 'admin_123',
          feedback: null,
        },
      };
      vi.mocked(challengeServiceModule.getChallengeById).mockResolvedValue(approvedChallenge);

      renderWithRouter(<ChallengeDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/Challenge Completed/i)).toBeInTheDocument();
        expect(screen.getByText(/earned 100 points/i)).toBeInTheDocument();
      });
    });

    it('should show rejected message with feedback', async () => {
      const rejectedChallenge: ChallengeWithStatus = {
        ...mockChallenge,
        user_has_joined: true,
        user_submission: {
          id: 'sub_123',
          user_id: 'user_123',
          challenge_id: 'chal_123',
          submission_text: 'My submission',
          submission_url: null,
          status: SubmissionStatus.Rejected,
          submitted_at: Date.now(),
          reviewed_at: Date.now(),
          reviewed_by_user_id: 'admin_123',
          feedback: 'Please provide more details',
        },
      };
      vi.mocked(challengeServiceModule.getChallengeById).mockResolvedValue(rejectedChallenge);

      renderWithRouter(<ChallengeDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/Submission Rejected/i)).toBeInTheDocument();
        expect(screen.getByText(/Please provide more details/i)).toBeInTheDocument();
      });
    });
  });

  describe('Authentication', () => {
    it('should show login prompt for unauthenticated users', async () => {
      vi.mocked(authContextModule.useAuth).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        role: undefined,
        logout: vi.fn(),
        login: vi.fn(),
        getUser: vi.fn(),
      });
      vi.mocked(challengeServiceModule.getChallengeById).mockResolvedValue(mockChallenge);

      renderWithRouter(<ChallengeDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/login/i)).toBeInTheDocument();
      });
    });

    it('should not show user actions for unauthenticated users', async () => {
      vi.mocked(authContextModule.useAuth).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        role: undefined,
        logout: vi.fn(),
        login: vi.fn(),
        getUser: vi.fn(),
      });
      vi.mocked(challengeServiceModule.getChallengeById).mockResolvedValue(mockChallenge);

      renderWithRouter(<ChallengeDetailPage />);

      await waitFor(() => {
        expect(screen.queryByText(/Join Challenge/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate back to challenges on back button click', async () => {
      const user = userEvent.setup();
      vi.mocked(challengeServiceModule.getChallengeById).mockResolvedValue(mockChallenge);

      const { container } = renderWithRouter(<ChallengeDetailPage />);

      await waitFor(() => {
        expect(screen.getAllByText(/Back/i).length).toBeGreaterThan(0);
      });

      const backButtons = screen.getAllByText(/Back/i);
      await user.click(backButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Challenges List')).toBeInTheDocument();
      });
    });
  });
});
