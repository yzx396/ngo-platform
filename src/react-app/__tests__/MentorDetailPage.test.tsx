import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Route, Routes, MemoryRouter } from 'react-router-dom';
import { MentorDetailPage } from '../pages/MentorDetailPage';
import { AuthProvider } from '../context/AuthContext';
import * as mentorService from '../services/mentorService';
import type { MentorProfile } from '../../types/mentor';
import { MentoringLevel, PaymentType, ExpertiseDomain, ExpertiseTopic } from '../../types/mentor';

// Mock the mentor service
vi.mock('../services/mentorService');

const mockMentor: MentorProfile = {
  id: '1',
  user_id: 'user-123',
  nick_name: 'codetolead',
  bio: 'Practical career mentoring for engineers at the...',
  mentoring_levels: MentoringLevel.Entry | MentoringLevel.Senior | MentoringLevel.Staff | MentoringLevel.Management,
  hourly_rate: 200,
  payment_types: PaymentType.Venmo | PaymentType.Paypal | PaymentType.Zelle,
  availability: 'Mon/Tue/Thu/Sat: 8pm-10pm PST, flexible',
  expertise_domains: ExpertiseDomain.TechnicalDevelopment | ExpertiseDomain.CareerDevelopment,
  expertise_topics_preset: ExpertiseTopic.CareerTransition | ExpertiseTopic.Leadership,
  expertise_topics_custom: ['Startup Strategy', 'Product Marketing'],
  allow_reviews: true,
  allow_recording: true,
  created_at: 1704067200,
  updated_at: 1704067200
};

describe('MentorDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display mentor full information', async () => {
    vi.mocked(mentorService.getMentorProfile).mockResolvedValue(mockMentor);

    render(
      <MemoryRouter initialEntries={['/mentors/1']}>
        <AuthProvider>
          <Routes>
            <Route path="/mentors/:id" element={<MentorDetailPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Check that mentor details are displayed
    expect(screen.getByText('codetolead')).toBeInTheDocument();
    expect(screen.getByText(/practical career mentoring/i)).toBeInTheDocument();
    expect(screen.getByText('$200/hr')).toBeInTheDocument();
  });

  it('should display all mentoring levels', async () => {
    vi.mocked(mentorService.getMentorProfile).mockResolvedValue(mockMentor);

    render(
      <MemoryRouter initialEntries={['/mentors/1']}>
        <AuthProvider>
          <Routes>
            <Route path="/mentors/:id" element={<MentorDetailPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('Entry')).toBeInTheDocument();
    expect(screen.getByText('Senior')).toBeInTheDocument();
    expect(screen.getByText('Staff')).toBeInTheDocument();
    expect(screen.getByText('Management')).toBeInTheDocument();
  });

  it('should display payment types', async () => {
    vi.mocked(mentorService.getMentorProfile).mockResolvedValue(mockMentor);

    render(
      <MemoryRouter initialEntries={['/mentors/1']}>
        <AuthProvider>
          <Routes>
            <Route path="/mentors/:id" element={<MentorDetailPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/venmo/i)).toBeInTheDocument();
    expect(screen.getByText(/paypal/i)).toBeInTheDocument();
    expect(screen.getByText(/zelle/i)).toBeInTheDocument();
  });

  it('should have Request Mentorship button', async () => {
    vi.mocked(mentorService.getMentorProfile).mockResolvedValue(mockMentor);

    render(
      <MemoryRouter initialEntries={['/mentors/1']}>
        <AuthProvider>
          <Routes>
            <Route path="/mentors/:id" element={<MentorDetailPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /request mentorship/i })).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    vi.mocked(mentorService.getMentorProfile).mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/mentors/1']}>
        <AuthProvider>
          <Routes>
            <Route path="/mentors/:id" element={<MentorDetailPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should show error if mentor not found', async () => {
    vi.mocked(mentorService.getMentorProfile).mockRejectedValue(new Error('Not found'));

    render(
      <MemoryRouter initialEntries={['/mentors/1']}>
        <AuthProvider>
          <Routes>
            <Route path="/mentors/:id" element={<MentorDetailPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('should display expertise domains', async () => {
    vi.mocked(mentorService.getMentorProfile).mockResolvedValue(mockMentor);

    render(
      <MemoryRouter initialEntries={['/mentors/1']}>
        <AuthProvider>
          <Routes>
            <Route path="/mentors/:id" element={<MentorDetailPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Check for expertise domain translations
    expect(screen.getByText(/Technical Development/i)).toBeInTheDocument();
    expect(screen.getByText(/Career Development/i)).toBeInTheDocument();
  });

  it('should display expertise topics (preset and custom)', async () => {
    vi.mocked(mentorService.getMentorProfile).mockResolvedValue(mockMentor);

    render(
      <MemoryRouter initialEntries={['/mentors/1']}>
        <AuthProvider>
          <Routes>
            <Route path="/mentors/:id" element={<MentorDetailPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Check for preset topic translations
    expect(screen.getByText(/Career Transition/i)).toBeInTheDocument();
    expect(screen.getByText(/Leadership/i)).toBeInTheDocument();

    // Check for custom topics
    expect(screen.getByText('Startup Strategy')).toBeInTheDocument();
    expect(screen.getByText('Product Marketing')).toBeInTheDocument();
  });
});
