import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { RequestMentorshipDialog } from '../components/RequestMentorshipDialog';
import * as matchService from '../services/matchService';
import * as apiClient from '../services/apiClient';
import * as cvService from '../services/cvService';

// Mock dependencies
vi.mock('../services/matchService');
vi.mock('../services/apiClient');
vi.mock('../services/cvService');

// Mock useAuth hook to provide a test user
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
    },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

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
    // Mock showSuccessToast and handleApiError
    vi.mocked(apiClient.showSuccessToast).mockImplementation(() => {});
    vi.mocked(apiClient.handleApiError).mockImplementation(() => {});
  });

  it('should not render when isOpen is false', () => {
    vi.mocked(cvService.getCVMetadata).mockResolvedValue(null);
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

  it('should render form fields when dialog is open', async () => {
    vi.mocked(cvService.getCVMetadata).mockResolvedValue(null);
    render(
      
        <RequestMentorshipDialog
          mentor={mockMentor}
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      
    );

    await waitFor(() => {
      expect(screen.getByText(/Request Mentorship/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/Personal Introduction/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Preferred Mentoring Time/i)).toBeInTheDocument();
    expect(screen.getByText(/Request Mentorship/i)).toBeInTheDocument();
  });

  it('should show validation error for introduction when empty', async () => {
    const user = userEvent.setup();
    vi.mocked(cvService.getCVMetadata).mockResolvedValue(null);
    
    render(
      
        <RequestMentorshipDialog
          mentor={mockMentor}
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      
    );

    await waitFor(() => {
      expect(screen.getByText(/Request Mentorship/i)).toBeInTheDocument();
    });

    // First, add a valid CV file to enable submit button
    await waitFor(() => {
      expect(document.getElementById("cv_file")).toBeInTheDocument();
    });
    const file = new File(['dummy content'], 'resume.pdf', { type: 'application/pdf' });
    const fileInput = document.getElementById("cv_file") as HTMLInputElement;
    await user.upload(fileInput, file);

    // Try to submit empty form (without introduction)
    const submitButton = screen.getByText('Send Request');
    await user.click(submitButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for preferred_time when empty', async () => {
    const user = userEvent.setup();
    vi.mocked(cvService.getCVMetadata).mockResolvedValue(null);
    
    render(
      
        <RequestMentorshipDialog
          mentor={mockMentor}
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      
    );

    await waitFor(() => {
      expect(screen.getByText(/Request Mentorship/i)).toBeInTheDocument();
    });

    // First, add a valid CV file to enable submit button
    await waitFor(() => {
      expect(document.getElementById("cv_file")).toBeInTheDocument();
    });
    const file = new File(['dummy content'], 'resume.pdf', { type: 'application/pdf' });
    const fileInput = document.getElementById("cv_file") as HTMLInputElement;
    await user.upload(fileInput, file);

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

  it('should show error when CV is not provided', async () => {
    const user = userEvent.setup();
    vi.mocked(cvService.getCVMetadata).mockResolvedValue(null);
    
    render(
      
        <RequestMentorshipDialog
          mentor={mockMentor}
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      
    );

    await waitFor(() => {
      expect(screen.getByText(/CV is required/i)).toBeInTheDocument();
    });

    // Fill in other fields but no CV
    const introductionInput = screen.getByLabelText(/Personal Introduction/i);
    const preferredTimeInput = screen.getByLabelText(/Preferred Mentoring Time/i);

    await user.type(introductionInput, 'This is my introduction');
    await user.type(preferredTimeInput, 'Weekends');

    // Submit button should be disabled
    const submitButton = screen.getByText('Send Request');
    expect(submitButton).toBeDisabled();
  });

  it('should upload new CV file before submitting match request', async () => {
    const user = userEvent.setup();
    vi.mocked(cvService.getCVMetadata).mockResolvedValue(null);
    vi.mocked(cvService.uploadCV).mockResolvedValue({
      success: true,
      filename: 'test-cv.pdf',
      originalFilename: 'my-resume.pdf',
      uploadedAt: Date.now(),
      message: 'CV uploaded successfully',
    });
    vi.mocked(matchService.createMatch).mockResolvedValue({
      id: 'match-1',
      mentor_id: 'mentor-1',
      mentee_id: 'user-1',
      status: 'pending',
      introduction: 'Test introduction',
      preferred_time: 'Weekends',
      cv_included: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
    });

    render(
      
        <RequestMentorshipDialog
          mentor={mockMentor}
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      
    );

    await waitFor(() => {
      expect(screen.getByText(/Request Mentorship/i)).toBeInTheDocument();
    });

    // Upload CV file
    const file = new File(['dummy content'], 'resume.pdf', { type: 'application/pdf' });
    const fileInput = document.getElementById("cv_file") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for file to be selected
    await waitFor(() => {
      expect(screen.getByText(/resume.pdf/i)).toBeInTheDocument();
    });

    // Fill in other fields
    const introInput = screen.getByLabelText(/Personal Introduction/i);
    await user.type(introInput, 'I am interested in mentorship');

    const timeInput = screen.getByLabelText(/Preferred Mentoring Time/i);
    await user.type(timeInput, 'Weekends');

    // Submit form
    const submitButton = screen.getByText('Send Request');
    await user.click(submitButton);

    // Should upload CV first
    await waitFor(() => {
      expect(cvService.uploadCV).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(File)
      );
    });

    // Then create match with cv_included: true
    await waitFor(() => {
      expect(matchService.createMatch).toHaveBeenCalledWith(
        expect.objectContaining({
          cv_included: true,
        })
      );
    });

    // Should call success callbacks
    expect(mockOnSuccess).toHaveBeenCalled();
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should allow using existing CV if available', async () => {
    const user = userEvent.setup();
    vi.mocked(cvService.getCVMetadata).mockResolvedValue({
      cv_url: 'https://example.com/cv.pdf',
      cv_filename: 'existing-cv.pdf',
      cv_uploaded_at: Date.now(),
    });
    vi.mocked(matchService.createMatch).mockResolvedValue({
      id: 'match-1',
      mentor_id: 'mentor-1',
      mentee_id: 'user-1',
      status: 'pending',
      introduction: 'Test introduction',
      preferred_time: 'Weekends',
      cv_included: 1,
      created_at: Date.now(),
      updated_at: Date.now(),
    });

    render(
      
        <RequestMentorshipDialog
          mentor={mockMentor}
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      
    );

    // Wait for CV check to complete using findByText which has built-in retry
    await screen.findByText(/Use existing CV/i, {}, { timeout: 3000 });

    // Existing CV checkbox should be checked by default
    const existingCVCheckbox = screen.getByLabelText(/Use existing CV/i) as HTMLInputElement;
    expect(existingCVCheckbox).toBeChecked();

    // Fill in other fields
    const introInput = screen.getByLabelText(/Personal Introduction/i);
    await user.type(introInput, 'I am interested in mentorship');

    const timeInput = screen.getByLabelText(/Preferred Mentoring Time/i);
    await user.type(timeInput, 'Weekends');

    // Submit form
    const submitButton = screen.getByText('Send Request');
    await user.click(submitButton);

    // Should NOT upload CV (using existing)
    expect(cvService.uploadCV).not.toHaveBeenCalled();

    // Should create match with cv_included: true
    await waitFor(() => {
      expect(matchService.createMatch).toHaveBeenCalledWith(
        expect.objectContaining({
          cv_included: true,
        })
      );
    });
  });

  it('should validate PDF file type', async () => {
    vi.mocked(cvService.getCVMetadata).mockResolvedValue(null);
    
    render(
      
        <RequestMentorshipDialog
          mentor={mockMentor}
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      
    );

    await waitFor(() => {
      expect(screen.getByText(/Request Mentorship/i)).toBeInTheDocument();
    });

    // Wait for file input to be rendered
    await waitFor(() => {
      expect(document.getElementById("cv_file")).toBeInTheDocument();
    });

    // Try to upload non-PDF file - this should set an error
    const file = new File(['dummy content'], 'resume.txt', { type: 'text/plain' });
    const fileInput = document.getElementById("cv_file") as HTMLInputElement;
    
    // Manually trigger file selection with non-PDF file
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false
    });
    fireEvent.change(fileInput);

    // After invalid file, submit button should remain disabled  
    await waitFor(() => {
      const submitButton = screen.getByText('Send Request');
      expect(submitButton).toBeDisabled();
    });
  });

  it('should validate file size (max 5MB)', async () => {
    vi.mocked(cvService.getCVMetadata).mockResolvedValue(null);
    
    render(
      
        <RequestMentorshipDialog
          mentor={mockMentor}
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      
    );

    await waitFor(() => {
      expect(screen.getByText(/Request Mentorship/i)).toBeInTheDocument();
    });

    // Wait for file input to be rendered
    await waitFor(() => {
      expect(document.getElementById("cv_file")).toBeInTheDocument();
    });

    // Create file larger than 5MB - this should set an error
    const largeContent = new Array(6 * 1024 * 1024).fill('a').join('');
    const file = new File([largeContent], 'large-resume.pdf', { type: 'application/pdf' });
    
    const fileInput = document.getElementById("cv_file") as HTMLInputElement;
    
    // Manually trigger file selection with large file
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false
    });
    fireEvent.change(fileInput);

    // After invalid file, submit button should remain disabled
    await waitFor(() => {
      const submitButton = screen.getByText('Send Request');
      expect(submitButton).toBeDisabled();
    });
  });

  it('should close dialog when cancel button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(cvService.getCVMetadata).mockResolvedValue(null);
    
    render(
      
        <RequestMentorshipDialog
          mentor={mockMentor}
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      
    );

    await waitFor(() => {
      expect(screen.getByText(/Request Mentorship/i)).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should handle CV upload errors gracefully', async () => {
    const user = userEvent.setup();
    const mockError = new Error('Upload failed');
    vi.mocked(cvService.getCVMetadata).mockResolvedValue(null);
    vi.mocked(cvService.uploadCV).mockRejectedValue(mockError);

    render(
      
        <RequestMentorshipDialog
          mentor={mockMentor}
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      
    );

    await waitFor(() => {
      expect(screen.getByText(/Request Mentorship/i)).toBeInTheDocument();
    });

    // Upload CV file
    const file = new File(['dummy content'], 'resume.pdf', { type: 'application/pdf' });
    const fileInput = document.getElementById("cv_file") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Fill in other fields
    const introInput = screen.getByLabelText(/Personal Introduction/i);
    await user.type(introInput, 'I am interested in mentorship');

    const timeInput = screen.getByLabelText(/Preferred Mentoring Time/i);
    await user.type(timeInput, 'Weekends');

    // Submit form
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

  it('should handle API errors gracefully when creating match', async () => {
    const user = userEvent.setup();
    const mockError = new Error('API Error');
    vi.mocked(cvService.getCVMetadata).mockResolvedValue({
      cv_url: 'https://example.com/cv.pdf',
      cv_filename: 'existing-cv.pdf',
      cv_uploaded_at: Date.now(),
    });
    vi.mocked(matchService.createMatch).mockRejectedValue(mockError);

    render(
      
        <RequestMentorshipDialog
          mentor={mockMentor}
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSuccess={mockOnSuccess}
        />
      
    );

    // Wait for CV checkbox to appear using findByText which has built-in retry
    await screen.findByText(/Use existing CV/i, {}, { timeout: 3000 });

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
