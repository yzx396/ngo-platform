import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiClientModule from '../apiClient';
import {
  getChallenges,
  getChallengeById,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  joinChallenge,
  submitChallenge,
  getChallengeSubmissions,
  approveSubmission,
  rejectSubmission,
  getUserChallenges,
} from '../challengeService';
import type {
  Challenge,
  ChallengeWithStatus,
  ChallengeSubmission,
  CreateChallengeDTO,
  UpdateChallengeDTO,
  SubmitChallengeDTO,
  ChallengeStatus,
  SubmissionStatus,
} from '../../../types/challenge';

// Mock the apiClient module
vi.mock('../apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
  apiFetch: vi.fn(),
}));

describe('challengeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockChallenge: Challenge = {
    id: 'chal_123',
    title: 'Learn TypeScript',
    description: 'Complete TypeScript tutorial',
    requirements: 'Submit a TypeScript project',
    created_by_user_id: 'user_admin',
    point_reward: 100,
    deadline: Date.now() + 86400000,
    status: 'active' as ChallengeStatus,
    created_at: Date.now() - 86400000,
    updated_at: Date.now() - 86400000,
    participant_count: 5,
    creator_name: 'Admin User',
  };

  const mockChallengeWithStatus: ChallengeWithStatus = {
    ...mockChallenge,
    user_has_joined: true,
    user_submission: null,
  };

  const mockSubmission: ChallengeSubmission = {
    id: 'sub_123',
    user_id: 'user_123',
    challenge_id: 'chal_123',
    submission_text: 'I completed the challenge',
    submission_url: 'https://github.com/user/project',
    status: 'pending' as SubmissionStatus,
    submitted_at: Date.now(),
    reviewed_at: null,
    reviewed_by_user_id: null,
    feedback: null,
    user_name: 'Test User',
    user_email: 'test@example.com',
    challenge_title: 'Learn TypeScript',
  };

  describe('getChallenges', () => {
    it('should fetch all challenges without filter', async () => {
      const mockResponse = { challenges: [mockChallenge] };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getChallenges();

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/challenges');
      expect(result).toEqual([mockChallenge]);
    });

    it('should fetch active challenges with status filter', async () => {
      const mockResponse = { challenges: [mockChallenge] };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getChallenges('active');

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/challenges?status=active');
      expect(result).toEqual([mockChallenge]);
    });

    it('should fetch completed challenges with status filter', async () => {
      const completedChallenge = { ...mockChallenge, status: 'completed' as ChallengeStatus };
      const mockResponse = { challenges: [completedChallenge] };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getChallenges('completed');

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/challenges?status=completed');
      expect(result).toEqual([completedChallenge]);
    });

    it('should return empty array when no challenges found', async () => {
      const mockResponse = { challenges: [] };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getChallenges();

      expect(result).toEqual([]);
    });

    it('should throw error when API call fails', async () => {
      const error = new Error('Network error');
      vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

      await expect(getChallenges()).rejects.toThrow('Network error');
    });
  });

  describe('getChallengeById', () => {
    it('should fetch a single challenge by ID', async () => {
      const mockResponse = { challenge: mockChallengeWithStatus };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getChallengeById('chal_123');

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/challenges/chal_123');
      expect(result).toEqual(mockChallengeWithStatus);
    });

    it('should include user participation status', async () => {
      const challengeWithJoinStatus: ChallengeWithStatus = {
        ...mockChallenge,
        user_has_joined: true,
        user_submission: mockSubmission,
      };
      const mockResponse = { challenge: challengeWithJoinStatus };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getChallengeById('chal_123');

      expect(result.user_has_joined).toBe(true);
      expect(result.user_submission).toEqual(mockSubmission);
    });

    it('should throw error when challenge not found', async () => {
      const error = new Error('Challenge not found');
      vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

      await expect(getChallengeById('invalid_id')).rejects.toThrow('Challenge not found');
    });
  });

  describe('createChallenge', () => {
    it('should create a new challenge with valid data', async () => {
      const createData: CreateChallengeDTO = {
        title: 'New Challenge',
        description: 'Test description',
        requirements: 'Test requirements',
        point_reward: 50,
        deadline: Date.now() + 86400000,
      };
      const mockResponse = { challenge: mockChallenge };
      vi.mocked(apiClientModule.apiPost).mockResolvedValue(mockResponse);

      const result = await createChallenge(createData);

      expect(apiClientModule.apiPost).toHaveBeenCalledWith('/api/v1/challenges', createData);
      expect(result).toEqual(mockChallenge);
    });

    it('should throw error when unauthorized', async () => {
      const createData: CreateChallengeDTO = {
        title: 'New Challenge',
        description: 'Test description',
        requirements: 'Test requirements',
        point_reward: 50,
        deadline: Date.now() + 86400000,
      };
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

      await expect(createChallenge(createData)).rejects.toThrow('Unauthorized');
    });

    it('should throw error when validation fails', async () => {
      const invalidData: CreateChallengeDTO = {
        title: '',
        description: '',
        requirements: '',
        point_reward: -10,
        deadline: Date.now() - 86400000,
      };
      const error = new Error('Validation failed');
      vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

      await expect(createChallenge(invalidData)).rejects.toThrow('Validation failed');
    });
  });

  describe('updateChallenge', () => {
    it('should update challenge with all fields', async () => {
      const updateData: UpdateChallengeDTO = {
        title: 'Updated Title',
        description: 'Updated description',
        requirements: 'Updated requirements',
        point_reward: 150,
        deadline: Date.now() + 172800000,
        status: 'completed' as ChallengeStatus,
      };
      const updatedChallenge = { ...mockChallenge, ...updateData };
      const mockResponse = { challenge: updatedChallenge };
      vi.mocked(apiClientModule.apiPut).mockResolvedValue(mockResponse);

      const result = await updateChallenge('chal_123', updateData);

      expect(apiClientModule.apiPut).toHaveBeenCalledWith('/api/v1/challenges/chal_123', updateData);
      expect(result).toEqual(updatedChallenge);
    });

    it('should update challenge with partial data', async () => {
      const updateData: UpdateChallengeDTO = {
        title: 'Updated Title',
      };
      const updatedChallenge = { ...mockChallenge, title: 'Updated Title' };
      const mockResponse = { challenge: updatedChallenge };
      vi.mocked(apiClientModule.apiPut).mockResolvedValue(mockResponse);

      const result = await updateChallenge('chal_123', updateData);

      expect(apiClientModule.apiPut).toHaveBeenCalledWith('/api/v1/challenges/chal_123', updateData);
      expect(result).toEqual(updatedChallenge);
    });

    it('should throw error when challenge not found', async () => {
      const updateData: UpdateChallengeDTO = { title: 'Updated' };
      const error = new Error('Challenge not found');
      vi.mocked(apiClientModule.apiPut).mockRejectedValue(error);

      await expect(updateChallenge('invalid_id', updateData)).rejects.toThrow('Challenge not found');
    });

    it('should throw error when unauthorized', async () => {
      const updateData: UpdateChallengeDTO = { title: 'Updated' };
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiPut).mockRejectedValue(error);

      await expect(updateChallenge('chal_123', updateData)).rejects.toThrow('Unauthorized');
    });
  });

  describe('deleteChallenge', () => {
    it('should delete a challenge successfully', async () => {
      vi.mocked(apiClientModule.apiDelete).mockResolvedValue(undefined);

      await deleteChallenge('chal_123');

      expect(apiClientModule.apiDelete).toHaveBeenCalledWith('/api/v1/challenges/chal_123');
    });

    it('should throw error when challenge not found', async () => {
      const error = new Error('Challenge not found');
      vi.mocked(apiClientModule.apiDelete).mockRejectedValue(error);

      await expect(deleteChallenge('invalid_id')).rejects.toThrow('Challenge not found');
    });

    it('should throw error when unauthorized', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiDelete).mockRejectedValue(error);

      await expect(deleteChallenge('chal_123')).rejects.toThrow('Unauthorized');
    });
  });

  describe('joinChallenge', () => {
    it('should join a challenge successfully', async () => {
      const mockResponse = { success: true };
      vi.mocked(apiClientModule.apiPost).mockResolvedValue(mockResponse);

      await joinChallenge('chal_123');

      expect(apiClientModule.apiPost).toHaveBeenCalledWith('/api/v1/challenges/chal_123/join', {});
    });

    it('should throw error when challenge not found', async () => {
      const error = new Error('Challenge not found');
      vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

      await expect(joinChallenge('invalid_id')).rejects.toThrow('Challenge not found');
    });

    it('should throw error when already joined', async () => {
      const error = new Error('Already joined this challenge');
      vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

      await expect(joinChallenge('chal_123')).rejects.toThrow('Already joined this challenge');
    });

    it('should throw error when unauthorized', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

      await expect(joinChallenge('chal_123')).rejects.toThrow('Unauthorized');
    });
  });

  describe('submitChallenge', () => {
    it('should submit challenge with text and URL', async () => {
      const submitData: SubmitChallengeDTO = {
        submission_text: 'I completed the challenge',
        submission_url: 'https://github.com/user/project',
      };
      const mockResponse = { submission: mockSubmission };
      vi.mocked(apiClientModule.apiPost).mockResolvedValue(mockResponse);

      const result = await submitChallenge('chal_123', submitData);

      expect(apiClientModule.apiPost).toHaveBeenCalledWith(
        '/api/v1/challenges/chal_123/submit',
        submitData
      );
      expect(result).toEqual(mockSubmission);
    });

    it('should submit challenge with only text', async () => {
      const submitData: SubmitChallengeDTO = {
        submission_text: 'I completed the challenge without URL',
      };
      const submissionWithoutUrl = { ...mockSubmission, submission_url: null };
      const mockResponse = { submission: submissionWithoutUrl };
      vi.mocked(apiClientModule.apiPost).mockResolvedValue(mockResponse);

      const result = await submitChallenge('chal_123', submitData);

      expect(apiClientModule.apiPost).toHaveBeenCalledWith(
        '/api/v1/challenges/chal_123/submit',
        submitData
      );
      expect(result.submission_url).toBeNull();
    });

    it('should throw error when not joined', async () => {
      const submitData: SubmitChallengeDTO = {
        submission_text: 'Submission',
      };
      const error = new Error('Must join challenge first');
      vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

      await expect(submitChallenge('chal_123', submitData)).rejects.toThrow('Must join challenge first');
    });

    it('should throw error when already submitted', async () => {
      const submitData: SubmitChallengeDTO = {
        submission_text: 'Submission',
      };
      const error = new Error('Already submitted');
      vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

      await expect(submitChallenge('chal_123', submitData)).rejects.toThrow('Already submitted');
    });

    it('should throw error when challenge not found', async () => {
      const submitData: SubmitChallengeDTO = {
        submission_text: 'Submission',
      };
      const error = new Error('Challenge not found');
      vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

      await expect(submitChallenge('invalid_id', submitData)).rejects.toThrow('Challenge not found');
    });
  });

  describe('getChallengeSubmissions', () => {
    it('should fetch all submissions for a challenge', async () => {
      const submissions = [mockSubmission, { ...mockSubmission, id: 'sub_456', user_id: 'user_456' }];
      const mockResponse = { submissions };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getChallengeSubmissions('chal_123');

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/challenges/chal_123/submissions');
      expect(result).toEqual(submissions);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no submissions found', async () => {
      const mockResponse = { submissions: [] };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getChallengeSubmissions('chal_123');

      expect(result).toEqual([]);
    });

    it('should throw error when challenge not found', async () => {
      const error = new Error('Challenge not found');
      vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

      await expect(getChallengeSubmissions('invalid_id')).rejects.toThrow('Challenge not found');
    });

    it('should throw error when unauthorized (non-admin)', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

      await expect(getChallengeSubmissions('chal_123')).rejects.toThrow('Unauthorized');
    });
  });

  describe('approveSubmission', () => {
    it('should approve a submission successfully', async () => {
      const approvedSubmission: ChallengeSubmission = {
        ...mockSubmission,
        status: 'approved' as SubmissionStatus,
        reviewed_at: Date.now(),
        reviewed_by_user_id: 'user_admin',
      };
      const mockResponse = { submission: approvedSubmission };
      vi.mocked(apiClientModule.apiFetch).mockResolvedValue(mockResponse);

      const result = await approveSubmission('sub_123');

      expect(apiClientModule.apiFetch).toHaveBeenCalledWith(
        '/api/v1/submissions/sub_123/approve',
        { method: 'PATCH' }
      );
      expect(result.status).toBe('approved');
      expect(result.reviewed_at).toBeTruthy();
      expect(result.reviewed_by_user_id).toBe('user_admin');
    });

    it('should throw error when submission not found', async () => {
      const error = new Error('Submission not found');
      vi.mocked(apiClientModule.apiFetch).mockRejectedValue(error);

      await expect(approveSubmission('invalid_id')).rejects.toThrow('Submission not found');
    });

    it('should throw error when unauthorized (non-admin)', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiFetch).mockRejectedValue(error);

      await expect(approveSubmission('sub_123')).rejects.toThrow('Unauthorized');
    });
  });

  describe('rejectSubmission', () => {
    it('should reject a submission with feedback', async () => {
      const rejectedSubmission: ChallengeSubmission = {
        ...mockSubmission,
        status: 'rejected' as SubmissionStatus,
        reviewed_at: Date.now(),
        reviewed_by_user_id: 'user_admin',
        feedback: 'Please improve your submission',
      };
      const mockResponse = { submission: rejectedSubmission };
      vi.mocked(apiClientModule.apiFetch).mockResolvedValue(mockResponse);

      const result = await rejectSubmission('sub_123', 'Please improve your submission');

      expect(apiClientModule.apiFetch).toHaveBeenCalledWith(
        '/api/v1/submissions/sub_123/reject',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ feedback: 'Please improve your submission' }),
        }
      );
      expect(result.status).toBe('rejected');
      expect(result.feedback).toBe('Please improve your submission');
    });

    it('should reject a submission without feedback', async () => {
      const rejectedSubmission: ChallengeSubmission = {
        ...mockSubmission,
        status: 'rejected' as SubmissionStatus,
        reviewed_at: Date.now(),
        reviewed_by_user_id: 'user_admin',
        feedback: null,
      };
      const mockResponse = { submission: rejectedSubmission };
      vi.mocked(apiClientModule.apiFetch).mockResolvedValue(mockResponse);

      const result = await rejectSubmission('sub_123');

      expect(apiClientModule.apiFetch).toHaveBeenCalledWith(
        '/api/v1/submissions/sub_123/reject',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );
      expect(result.status).toBe('rejected');
      expect(result.feedback).toBeNull();
    });

    it('should throw error when submission not found', async () => {
      const error = new Error('Submission not found');
      vi.mocked(apiClientModule.apiFetch).mockRejectedValue(error);

      await expect(rejectSubmission('invalid_id')).rejects.toThrow('Submission not found');
    });

    it('should throw error when unauthorized (non-admin)', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiFetch).mockRejectedValue(error);

      await expect(rejectSubmission('sub_123', 'feedback')).rejects.toThrow('Unauthorized');
    });
  });

  describe('getUserChallenges', () => {
    it('should fetch user completed challenges', async () => {
      const completedChallenges = [
        { ...mockChallenge, status: 'completed' as ChallengeStatus },
        { ...mockChallenge, id: 'chal_456', title: 'Learn React', status: 'completed' as ChallengeStatus },
      ];
      const mockResponse = { challenges: completedChallenges };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getUserChallenges('user_123');

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/users/user_123/challenges');
      expect(result).toEqual(completedChallenges);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when user has no completed challenges', async () => {
      const mockResponse = { challenges: [] };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getUserChallenges('user_123');

      expect(result).toEqual([]);
    });

    it('should throw error when user not found', async () => {
      const error = new Error('User not found');
      vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

      await expect(getUserChallenges('invalid_id')).rejects.toThrow('User not found');
    });

    it('should throw error on API failure', async () => {
      const error = new Error('Internal server error');
      vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

      await expect(getUserChallenges('user_123')).rejects.toThrow('Internal server error');
    });
  });
});
