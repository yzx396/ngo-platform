import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { RequestMentorshipDialog } from '../components/RequestMentorshipDialog';
import * as matchService from '../services/matchService';
import * as apiClient from '../services/apiClient';

// Mock dependencies
vi.mock('../services/matchService');
vi.mock('../services/apiClient');

const mockMentor = {
  id: '1',
  user_id: 'mentor-1',
  nick_name: 'Test Mentor',
  bio: 'A test bio',
  mentoring_levels: 1,
  hourly_rate: 50,
  payment_types: 1,
  availability: 'Weekdays',
  allow_reviews: true,
  allow_recording: true,
  created_at: 1000,
  updated_at: 1000,
};

describe('RequestMentorshipDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <RequestMentorshipDialog
        mentor={mockMentor}
        isOpen={false}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Dialog should not be visible
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  it('should render form fields when dialog is open', () => {
    render(
      <RequestMentorshipDialog
        mentor={mockMentor}
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText(/Request Mentorship/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Personal Introduction/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Preferred Mentoring Time/i)).toBeInTheDocument();
  });

  it('should show validation error for introduction when empty', async () => {
    const user = userEvent.setup();
    render(
      <RequestMentorshipDialog
        mentor={mockMentor}
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Try to submit empty form
    const submitButton = screen.getByText('Send Request');
    await user.click(submitButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for preferred_time when empty', async () => {
    const user = userEvent.setup();
    render(
      <RequestMentorshipDialog
        mentor={mockMentor}
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    const introductionInput = screen.getByLabelText(/Personal Introduction/i);
    await user.type(introductionInput, 'This is a test introduction');

    // Try to submit without preferred_time
    const submitButton = screen.getByText('Send Request');
    await user.click(submitButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
    });
  });

  it('should successfully submit form with valid data', async () => {
    const user = userEvent.setup();
    vi.mocked(matchService.createMatch).mockResolvedValue({
      id: 'match-1',
      mentor_id: mockMentor.user_id,
      mentee_id: 'mentee-1',
      status: 'pending',
      introduction: 'This is my introduction',
      preferred_time: 'Weekends',
      created_at: 1000,
      updated_at: 1000,
    });
    vi.mocked(apiClient.showSuccessToast).mockImplementation(() => {});

    render(
      <RequestMentorshipDialog
        mentor={mockMentor}
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Fill in the form
    const introductionInput = screen.getByLabelText(/Personal Introduction/i) as HTMLTextAreaElement;
    const preferredTimeInput = screen.getByLabelText(/Preferred Mentoring Time/i) as HTMLInputElement;

    await user.type(introductionInput, 'This is my introduction');
    await user.type(preferredTimeInput, 'Weekends');

    // Submit the form
    const submitButton = screen.getByText('Send Request');
    await user.click(submitButton);

    // Should call createMatch with correct data
    await waitFor(() => {
      expect(matchService.createMatch).toHaveBeenCalledWith({
        mentor_id: mockMentor.user_id,
        introduction: 'This is my introduction',
        preferred_time: 'Weekends',
      });
    });

    // Should call onSuccess callback
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    // Should close dialog
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should close dialog when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <RequestMentorshipDialog
        mentor={mockMentor}
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup();
    const mockError = new Error('API Error');
    vi.mocked(matchService.createMatch).mockRejectedValue(mockError);
    vi.mocked(apiClient.handleApiError).mockImplementation(() => {});

    render(
      <RequestMentorshipDialog
        mentor={mockMentor}
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    // Fill in and submit form
    const introductionInput = screen.getByLabelText(/Personal Introduction/i);
    const preferredTimeInput = screen.getByLabelText(/Preferred Mentoring Time/i);

    await user.type(introductionInput, 'This is my introduction');
    await user.type(preferredTimeInput, 'Weekends');

    const submitButton = screen.getByText('Send Request');
    await user.click(submitButton);

    // Should call handleApiError
    await waitFor(() => {
      expect(apiClient.handleApiError).toHaveBeenCalledWith(mockError);
    });

    // Should not close dialog or call onSuccess
    expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
});
