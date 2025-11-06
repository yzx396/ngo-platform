import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MentorBrowse } from '../pages/MentorBrowse';
import { AuthProvider } from '../context/AuthContext';
import * as mentorService from '../services/mentorService';
import * as matchService from '../services/matchService';
import type { MentorProfile } from '../../types/mentor';
import { MentoringLevel, PaymentType } from '../../types/mentor';
import type { User } from '../../types/user';

// Mock ResizeObserver for jsdom
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock the mentor service
vi.mock('../services/mentorService');

// Mock react-router-dom useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock API client
vi.mock('../services/apiClient', () => ({
  handleApiError: vi.fn(),
}));

// Mock match service
vi.mock('../services/matchService', () => ({
  createMatch: vi.fn(),
  getMatches: vi.fn(),
}));

const mockMentor: MentorProfile = {
  id: 'mentor-1',
  user_id: 'user-1',
  nick_name: 'John Doe',
  bio: 'Experienced tech mentor with 10+ years in software development.',
  mentoring_levels: MentoringLevel.Entry | MentoringLevel.Senior,
  availability: 'Weekdays 9am-5pm EST',
  hourly_rate: 50,
  payment_types: PaymentType.Venmo | PaymentType.Paypal,
  allow_reviews: true,
  allow_recording: true,
  created_at: Date.now(),
  updated_at: Date.now(),
};

describe('MentorBrowse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(mentorService.searchMentors).mockResolvedValue({
      mentors: [mockMentor],
      total: 1,
    });
    // Mock getMatches to return empty array by default
    vi.mocked(matchService.getMatches).mockResolvedValue([]);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should render mentor cards', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <MentorBrowse />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('should have View Details button', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <MentorBrowse />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
    });
  });

  it('should have Request Mentorship button', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <MentorBrowse />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /request mentorship/i })).toBeInTheDocument();
    });
  });

  // Note: Unauthenticated user tests removed - route is now protected with ProtectedRoute
  // Unauthenticated users are redirected to /login before the component renders

  describe('when user is authenticated', () => {
    it('should navigate to mentor detail page when clicking View Details', async () => {
      // Mock authenticated user by setting token in localStorage
      const mockUser: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      localStorage.setItem('auth_token', 'mock-token');
      
      // Mock fetch to return user data
      global.fetch = vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify(mockUser)))
      );

      render(
        <MemoryRouter>
          <AuthProvider>
            <MentorBrowse />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
      });

      const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
      fireEvent.click(viewDetailsButton);

      // Should navigate to mentor detail page
      expect(mockNavigate).toHaveBeenCalledWith('/mentors/mentor-1');
    });

    it('should proceed with mentorship request when clicking Request Mentorship', async () => {
      // Mock authenticated user by setting token in localStorage
      const mockUser: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      localStorage.setItem('auth_token', 'mock-token');
      
      // Mock fetch to return user data
      global.fetch = vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify(mockUser)))
      );

      render(
        <MemoryRouter>
          <AuthProvider>
            <MentorBrowse />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /request mentorship/i })).toBeInTheDocument();
      });

      const requestMentorshipButton = screen.getByRole('button', { name: /request mentorship/i });
      fireEvent.click(requestMentorshipButton);

      // Should not redirect to login
      expect(mockNavigate).not.toHaveBeenCalledWith('/login', expect.any(Object));
    });
  });
});