import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ChallengesPage } from '../pages/ChallengesPage';
import * as challengeServiceModule from '../services/challengeService';
import * as authContextModule from '../context/AuthContext';
import type { Challenge } from '../../types/challenge';

vi.mock('../services/challengeService');
vi.mock('../context/AuthContext');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: { language: 'en' },
  }),
}));

const mockChallenge: Challenge = {
  id: 'chal_123',
  title: 'Learn React',
  description: 'Master React fundamentals',
  requirements: 'Build a React app',
  created_by_user_id: 'user_admin',
  point_reward: 100,
  deadline: Date.now() + 86400000,
  status: 'active',
  created_at: Date.now(),
  updated_at: Date.now(),
  participant_count: 5,
  creator_name: 'Admin',
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <MemoryRouter initialEntries={['/challenges']}>
      <Routes>
        <Route path="/challenges" element={component} />
        <Route path="/challenges/:id" element={<div>Challenge Detail</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('ChallengesPage', () => {
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
    it('should display loading spinner when loading', () => {
      vi.mocked(challengeServiceModule.getChallenges).mockImplementation(
        () => new Promise(() => {})
      );

      renderWithRouter(<ChallengesPage />);

      // Loader2 renders as SVG with animate-spin class
      const spinner = document.querySelector('[class*="animate-spin"]');
      expect(spinner).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('should display error message when API fails', async () => {
      const error = new Error('Failed to load challenges');
      vi.mocked(challengeServiceModule.getChallenges).mockRejectedValue(error);

      renderWithRouter(<ChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load challenges/i)).toBeInTheDocument();
      });
    });
  });

  describe('Tab Filtering', () => {
    it('should load active challenges by default', async () => {
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([mockChallenge]);

      renderWithRouter(<ChallengesPage />);

      await waitFor(() => {
        expect(challengeServiceModule.getChallenges).toHaveBeenCalledWith('active');
        expect(screen.getByText('Learn React')).toBeInTheDocument();
      });
    });

    it('should display challenges when loaded', async () => {
      // Default tab is 'active', so only return active challenges
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([
        mockChallenge,
      ]);

      renderWithRouter(<ChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText('Learn React')).toBeInTheDocument();
      });
    });
  });

  describe('Challenge Display', () => {
    it('should render challenge cards when data loads', async () => {
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([mockChallenge]);

      renderWithRouter(<ChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText('Learn React')).toBeInTheDocument();
      });
    });

    it('should display empty state for active challenges', async () => {
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([]);

      renderWithRouter(<ChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText(/No active challenges/i)).toBeInTheDocument();
      });
    });

  });

  describe('Admin Features', () => {
    beforeEach(() => {
      // Setup admin role for admin feature tests
      vi.mocked(authContextModule.useAuth).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'user_123', email: 'admin@example.com', name: 'Admin', role: 'admin', points: 0 },
        role: 'admin',
        logout: vi.fn(),
        login: vi.fn(),
        getUser: vi.fn(),
      });
    });

    it('should load challenges for admin users', async () => {
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([mockChallenge]);

      renderWithRouter(<ChallengesPage />);

      await waitFor(() => {
        expect(challengeServiceModule.getChallenges).toHaveBeenCalled();
        expect(screen.getByText('Learn React')).toBeInTheDocument();
      });
    });

    it('should load challenges for member users', async () => {
      // Reset to member role for this test
      vi.mocked(authContextModule.useAuth).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 'user_123', email: 'test@example.com', name: 'User', role: 'member', points: 0 },
        role: 'member',
        logout: vi.fn(),
        login: vi.fn(),
        getUser: vi.fn(),
      });
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([mockChallenge]);

      renderWithRouter(<ChallengesPage />);

      await waitFor(() => {
        expect(challengeServiceModule.getChallenges).toHaveBeenCalled();
        expect(screen.getByText('Learn React')).toBeInTheDocument();
      });
    });

    it('should display create button in empty state for admin', async () => {
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([]);

      renderWithRouter(<ChallengesPage />);

      // Wait for empty state to appear
      await waitFor(() => {
        expect(screen.getByText(/No active challenges/i)).toBeInTheDocument();
      });

      // Verify the create button is visible
      await waitFor(() => {
        expect(screen.getByText(/Create the first challenge/i)).toBeInTheDocument();
      });
    });
  });

  describe('Header', () => {
    it('should display page title and subtitle', async () => {
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([]);

      renderWithRouter(<ChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText('Challenges')).toBeInTheDocument();
        expect(
          screen.getByText(/Complete challenges to earn points/i)
        ).toBeInTheDocument();
      });
    });
  });
});
