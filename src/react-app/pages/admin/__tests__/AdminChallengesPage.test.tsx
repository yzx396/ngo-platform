import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AdminChallengesPage } from '../AdminChallengesPage';
import * as challengeServiceModule from '../../../services/challengeService';
import { ChallengeStatus } from '../../../../types/challenge';
import type { Challenge } from '../../../../types/challenge';

vi.mock('../../../services/challengeService');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: { language: 'en' },
  }),
}));

const mockChallenge: Challenge = {
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
};

const mockCompletedChallenge: Challenge = {
  ...mockChallenge,
  id: 'chal_456',
  title: 'Learn TypeScript',
  status: 'completed',
  participant_count: 3,
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <MemoryRouter initialEntries={['/admin/challenges']}>
      <Routes>
        <Route path="/admin/challenges" element={component} />
        <Route path="/admin/challenges/:id/submissions" element={<div>Submissions Page</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('AdminChallengesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should display loading spinner while fetching', () => {
      vi.mocked(challengeServiceModule.getChallenges).mockImplementation(
        () => new Promise(() => {})
      );

      renderWithRouter(<AdminChallengesPage />);

      // Loader2 renders as SVG, check for animate-spin class
      const spinner = document.querySelector('[class*="animate-spin"]');
      expect(spinner).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('should display error message when fetch fails', async () => {
      const error = new Error('Failed to load');
      vi.mocked(challengeServiceModule.getChallenges).mockRejectedValue(error);

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load challenges/i)).toBeInTheDocument();
      });
    });
  });

  describe('Challenge List Display', () => {
    it('should display challenges with all details', async () => {
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([mockChallenge]);

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText('Learn React')).toBeInTheDocument();
        expect(screen.getByText('Master React basics')).toBeInTheDocument();
        expect(screen.getByText(/100 points/)).toBeInTheDocument();
        expect(screen.getByText(/5 participants/)).toBeInTheDocument();
      });
    });

    it('should display status badge for each challenge', async () => {
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([
        mockChallenge,
        mockCompletedChallenge,
      ]);

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText('active')).toBeInTheDocument();
        expect(screen.getByText('completed')).toBeInTheDocument();
      });
    });

    it('should show empty state when no challenges', async () => {
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([]);

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText(/No challenges yet/)).toBeInTheDocument();
      });
    });

    it('should show create button in empty state', async () => {
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([]);

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText(/Create the first challenge/)).toBeInTheDocument();
      });
    });
  });

  describe('Header', () => {
    it('should display page title and subtitle', async () => {
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([]);

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText('Manage Challenges')).toBeInTheDocument();
        expect(
          screen.getByText(/Create and manage challenges for the community/)
        ).toBeInTheDocument();
      });
    });

    it('should display create button in header', async () => {
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([]);

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Create Challenge', () => {
    it('should open create dialog when clicking create button', async () => {
      const user = userEvent.setup();
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([]);

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText(/Manage Challenges/)).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      const headerCreateButton = buttons[0]; // First button is the header Create button
      await user.click(headerCreateButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
      });
    });

    it('should show create form with all required fields', async () => {
      const user = userEvent.setup();
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([]);

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText(/Manage Challenges/)).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]); // Header Create button

      await waitFor(() => {
        expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Requirements/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Point Reward/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Deadline/)).toBeInTheDocument();
      });
    });

    it('should not show status selector in create mode', async () => {
      const user = userEvent.setup();
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([]);

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText(/Manage Challenges/)).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]); // Header Create button

      await waitFor(() => {
        // Status field should not be present during create
        const statusLabels = screen.queryAllByLabelText(/Status/);
        expect(statusLabels.length).toBe(0);
      });
    });

    it('should create challenge when form is submitted', async () => {
      const user = userEvent.setup();
      vi.mocked(challengeServiceModule.getChallenges)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockChallenge]);
      vi.mocked(challengeServiceModule.createChallenge).mockResolvedValue(mockChallenge);

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText(/Manage Challenges/)).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]); // Header Create button

      await waitFor(() => {
        expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/Title/) as HTMLInputElement;
      const descInput = screen.getByLabelText(/Description/) as HTMLTextAreaElement;
      const reqInput = screen.getByLabelText(/Requirements/) as HTMLTextAreaElement;
      const pointsInput = screen.getByLabelText(/Point Reward/) as HTMLInputElement;
      const deadlineInput = screen.getByLabelText(/Deadline/) as HTMLInputElement;

      await user.type(titleInput, 'New Challenge');
      await user.type(descInput, 'Challenge description');
      await user.type(reqInput, 'Challenge requirements');
      await user.clear(pointsInput);
      await user.type(pointsInput, '50');
      await user.type(deadlineInput, '2025-12-31T23:59');

      const saveButton = screen.getByText(/Save/);
      await user.click(saveButton);

      await waitFor(() => {
        expect(challengeServiceModule.createChallenge).toHaveBeenCalledWith({
          title: 'New Challenge',
          description: 'Challenge description',
          requirements: 'Challenge requirements',
          point_reward: 50,
          deadline: expect.any(Number),
        });
      });
    });

    it('should disable save button while saving', async () => {
      const user = userEvent.setup();
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([]);
      vi.mocked(challengeServiceModule.createChallenge).mockImplementation(
        () => new Promise(() => {})
      );

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText(/Manage Challenges/)).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]); // Header Create button

      await waitFor(() => {
        expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/Title/) as HTMLInputElement;
      const descInput = screen.getByLabelText(/Description/) as HTMLTextAreaElement;
      const reqInput = screen.getByLabelText(/Requirements/) as HTMLTextAreaElement;
      const deadlineInput = screen.getByLabelText(/Deadline/) as HTMLInputElement;

      await user.type(titleInput, 'New Challenge');
      await user.type(descInput, 'Description');
      await user.type(reqInput, 'Requirements');
      await user.type(deadlineInput, '2025-12-31T23:59');

      const saveButton = screen.getByText(/Save/) as HTMLButtonElement;
      await user.click(saveButton);

      await waitFor(() => {
        expect(saveButton.disabled).toBe(true);
      });
    });

    it('should close dialog on cancel', async () => {
      const user = userEvent.setup();
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([]);

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText(/Manage Challenges/)).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]); // Header Create button

      await waitFor(() => {
        expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
      });

      const cancelButton = screen.getByText(/Cancel/);
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByLabelText(/Title/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Edit Challenge', () => {
    it('should open edit dialog when clicking edit button', async () => {
      const user = userEvent.setup();
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([mockChallenge]);

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText('Learn React')).toBeInTheDocument();
      });

      // Find and click edit button (buttons: Create, Submissions, Edit, Delete)
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[2]); // Edit button

      await waitFor(() => {
        expect(screen.getByText(/Edit Challenge/i)).toBeInTheDocument();
      });
    });

    it('should pre-populate form fields in edit mode', async () => {
      const user = userEvent.setup();
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([mockChallenge]);

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText('Learn React')).toBeInTheDocument();
      });

      // Find and click edit button
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[2]); // Edit button

      await waitFor(() => {
        const titleInput = screen.getByLabelText(/Title/) as HTMLInputElement;
        expect(titleInput.value).toBe('Learn React');

        const descInput = screen.getByLabelText(/Description/) as HTMLTextAreaElement;
        expect(descInput.value).toBe('Master React basics');

        const reqInput = screen.getByLabelText(/Requirements/) as HTMLTextAreaElement;
        expect(reqInput.value).toBe('Build a React component');

        const pointsInput = screen.getByLabelText(/Point Reward/) as HTMLInputElement;
        expect(pointsInput.value).toBe('100');
      });
    });

    it('should update challenge when form is submitted', async () => {
      const user = userEvent.setup();
      vi.mocked(challengeServiceModule.getChallenges)
        .mockResolvedValueOnce([mockChallenge])
        .mockResolvedValueOnce([{ ...mockChallenge, title: 'Updated Challenge' }]);
      vi.mocked(challengeServiceModule.updateChallenge).mockResolvedValue({
        ...mockChallenge,
        title: 'Updated Challenge',
      });

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText('Learn React')).toBeInTheDocument();
      });

      // Find and click edit button
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[2]); // Edit button

      await waitFor(() => {
        expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/Title/) as HTMLInputElement;
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Challenge');

      const saveButton = screen.getByText(/Save/);
      await user.click(saveButton);

      await waitFor(() => {
        expect(challengeServiceModule.updateChallenge).toHaveBeenCalledWith('chal_123', {
          title: 'Updated Challenge',
          description: 'Master React basics',
          requirements: 'Build a React component',
          point_reward: 100,
          deadline: expect.any(Number),
          status: 'active',
        });
      });
    });

  });

  describe('Delete Challenge', () => {
    it('should open delete confirmation dialog when clicking delete button', async () => {
      const user = userEvent.setup();
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([mockChallenge]);

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText('Learn React')).toBeInTheDocument();
      });

      // Find delete button (last icon button)
      const buttons = screen.getAllByRole('button');
      const deleteButton = buttons[buttons.length - 1];
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/Delete Challenge/)).toBeInTheDocument();
        expect(
          screen.getByText(/Are you sure you want to delete this challenge/)
        ).toBeInTheDocument();
      });
    });

    it('should delete challenge when confirming', async () => {
      const user = userEvent.setup();
      vi.mocked(challengeServiceModule.getChallenges)
        .mockResolvedValueOnce([mockChallenge])
        .mockResolvedValueOnce([]);
      vi.mocked(challengeServiceModule.deleteChallenge).mockResolvedValue(undefined);

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText('Learn React')).toBeInTheDocument();
      });

      // Find delete button
      const buttons = screen.getAllByRole('button');
      const deleteButton = buttons[buttons.length - 1];
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/Delete Challenge/)).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText(/Delete/);
      const confirmButton = deleteButtons[deleteButtons.length - 1]; // Get the last Delete button (in dialog)
      await user.click(confirmButton);

      await waitFor(() => {
        expect(challengeServiceModule.deleteChallenge).toHaveBeenCalledWith('chal_123');
      });
    });

    it('should disable delete button while deleting', async () => {
      const user = userEvent.setup();
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([mockChallenge]);
      vi.mocked(challengeServiceModule.deleteChallenge).mockImplementation(
        () => new Promise(() => {})
      );

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText('Learn React')).toBeInTheDocument();
      });

      // Find delete button
      const buttons = screen.getAllByRole('button');
      const deleteButton = buttons[buttons.length - 1];
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/Delete Challenge/)).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText(/Delete/);
      const confirmButton = deleteButtons[deleteButtons.length - 1] as HTMLButtonElement;
      await user.click(confirmButton);

      await waitFor(() => {
        expect(confirmButton.disabled).toBe(true);
      });
    });

    it('should close delete dialog on cancel', async () => {
      const user = userEvent.setup();
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([mockChallenge]);

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText('Learn React')).toBeInTheDocument();
      });

      // Find delete button
      const buttons = screen.getAllByRole('button');
      const deleteButton = buttons[buttons.length - 1];
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/Delete Challenge/)).toBeInTheDocument();
      });

      const cancelButton = screen.getAllByText(/Cancel/).pop();
      if (cancelButton) {
        await user.click(cancelButton);
      }

      await waitFor(() => {
        expect(screen.queryByText(/Are you sure/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Submissions Navigation', () => {
    it('should navigate to submissions page when clicking view submissions', async () => {
      const user = userEvent.setup();
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([mockChallenge]);

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText('Learn React')).toBeInTheDocument();
      });

      const submissionsButton = screen.getByText(/Submissions/);
      await user.click(submissionsButton);

      await waitFor(() => {
        expect(screen.getByText('Submissions Page')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should not submit if title is empty', async () => {
      const user = userEvent.setup();
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([]);

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText(/Manage Challenges/)).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]); // Header Create button

      await waitFor(() => {
        expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
      });

      const descInput = screen.getByLabelText(/Description/) as HTMLTextAreaElement;
      const reqInput = screen.getByLabelText(/Requirements/) as HTMLTextAreaElement;
      const deadlineInput = screen.getByLabelText(/Deadline/) as HTMLInputElement;

      await user.type(descInput, 'Description');
      await user.type(reqInput, 'Requirements');
      await user.type(deadlineInput, '2025-12-31T23:59');

      // Title is empty, form should not submit
      expect(challengeServiceModule.createChallenge).not.toHaveBeenCalled();
    });

    it('should not submit if description is empty', async () => {
      const user = userEvent.setup();
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([]);

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText(/Manage Challenges/)).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]); // Header Create button

      await waitFor(() => {
        expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/Title/) as HTMLInputElement;
      const reqInput = screen.getByLabelText(/Requirements/) as HTMLTextAreaElement;
      const deadlineInput = screen.getByLabelText(/Deadline/) as HTMLInputElement;

      await user.type(titleInput, 'Title');
      await user.type(reqInput, 'Requirements');
      await user.type(deadlineInput, '2025-12-31T23:59');

      // Description is empty, form should not submit
      expect(challengeServiceModule.createChallenge).not.toHaveBeenCalled();
    });

    it('should not submit if requirements is empty', async () => {
      const user = userEvent.setup();
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([]);

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText(/Manage Challenges/)).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]); // Header Create button

      await waitFor(() => {
        expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/Title/) as HTMLInputElement;
      const descInput = screen.getByLabelText(/Description/) as HTMLTextAreaElement;
      const deadlineInput = screen.getByLabelText(/Deadline/) as HTMLInputElement;

      await user.type(titleInput, 'Title');
      await user.type(descInput, 'Description');
      await user.type(deadlineInput, '2025-12-31T23:59');

      // Requirements is empty, form should not submit
      expect(challengeServiceModule.createChallenge).not.toHaveBeenCalled();
    });

    it('should not submit if deadline is empty', async () => {
      const user = userEvent.setup();
      vi.mocked(challengeServiceModule.getChallenges).mockResolvedValue([]);

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText(/Manage Challenges/)).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]); // Header Create button

      await waitFor(() => {
        expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/Title/) as HTMLInputElement;
      const descInput = screen.getByLabelText(/Description/) as HTMLTextAreaElement;
      const reqInput = screen.getByLabelText(/Requirements/) as HTMLTextAreaElement;

      await user.type(titleInput, 'Title');
      await user.type(descInput, 'Description');
      await user.type(reqInput, 'Requirements');

      // Deadline is empty, form should not submit
      expect(challengeServiceModule.createChallenge).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should show error and reload list when create fails', async () => {
      const user = userEvent.setup();
      vi.mocked(challengeServiceModule.getChallenges)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      vi.mocked(challengeServiceModule.createChallenge).mockRejectedValue(
        new Error('Create failed')
      );

      renderWithRouter(<AdminChallengesPage />);

      await waitFor(() => {
        expect(screen.getByText(/Manage Challenges/)).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]); // Header Create button

      await waitFor(() => {
        expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/Title/) as HTMLInputElement;
      const descInput = screen.getByLabelText(/Description/) as HTMLTextAreaElement;
      const reqInput = screen.getByLabelText(/Requirements/) as HTMLTextAreaElement;
      const deadlineInput = screen.getByLabelText(/Deadline/) as HTMLInputElement;

      await user.type(titleInput, 'Title');
      await user.type(descInput, 'Description');
      await user.type(reqInput, 'Requirements');
      await user.type(deadlineInput, '2025-12-31T23:59');

      const saveButton = screen.getByText(/Save/);
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to save challenge/)).toBeInTheDocument();
      });
    });

  });

});
