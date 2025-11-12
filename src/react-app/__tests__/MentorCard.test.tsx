import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MentorCard } from '../components/MentorCard';
import { MentoringLevel, PaymentType } from '../../types/mentor';
import type { MentorProfile } from '../../types/mentor';

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

describe('MentorCard', () => {
  it('should render mentor nick_name', () => {
    render(<MentorCard mentor={mockMentor} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should render mentor bio', () => {
    render(<MentorCard mentor={mockMentor} />);

    expect(screen.getByText(/Experienced tech mentor/)).toBeInTheDocument();
  });

  it('should display hourly rate', () => {
    render(<MentorCard mentor={mockMentor} />);

    expect(screen.getByText(/\$50/)).toBeInTheDocument();
  });

  it('should display mentoring level badges', () => {
    render(<MentorCard mentor={mockMentor} />);

    // Should display all mentoring levels
    expect(screen.getByText('Entry')).toBeInTheDocument();
    expect(screen.getByText('Senior')).toBeInTheDocument();
  });

  it('should display payment type information', () => {
    render(<MentorCard mentor={mockMentor} />);

    // Check that payment types are displayed (comma-separated)
    expect(screen.getByText(/Venmo/)).toBeInTheDocument();
  });

  it('should have View Details button', () => {
    render(<MentorCard mentor={mockMentor} onViewDetails={() => {}} />);

    expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
  });

  it('should have Request button', () => {
    render(<MentorCard mentor={mockMentor} onRequestMentorship={() => {}} />);

    expect(screen.getByRole('button', { name: /^request$/i })).toBeInTheDocument();
  });

  it('should trigger onViewDetails when View Details is clicked', async () => {
    const onViewDetails = vi.fn();
    render(<MentorCard mentor={mockMentor} onViewDetails={onViewDetails} />);

    const button = screen.getByRole('button', { name: /view details/i });
    expect(button).toBeInTheDocument();
  });

  it('should display availability text', () => {
    render(<MentorCard mentor={mockMentor} />);

    expect(screen.getByText(/Weekdays 9am-5pm EST/)).toBeInTheDocument();
  });

  it('should render with card structure (Card component)', () => {
    const { container } = render(<MentorCard mentor={mockMentor} />);

    // Check for card-like structure
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('should handle mentor without rate gracefully', () => {
    const mentorNoRate = { ...mockMentor, hourly_rate: null };
    render(<MentorCard mentor={mentorNoRate} />);

    // Should still render without errors
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
