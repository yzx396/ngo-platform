import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiClientModule from '../apiClient';
import {
  createMatch,
  getMatches,
  getMatchesByStatusAndRole,
  respondToMatch,
  completeMatch,
  deleteMatch,
  acceptMatch,
  rejectMatch,
  checkExistingMatch,
} from '../matchService';
import type { Match } from '../../../types/match';

vi.mock('../apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

describe('matchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockMatch: Match = {
    id: 'match_123',
    mentee_id: 'user_123',
    mentor_id: 'user_456',
    status: 'pending',
    requested_at: Date.now(),
    responded_at: null,
    completed_at: null,
    notes: 'Looking for mentorship',
  };

  describe('createMatch', () => {
    it('should create a match request', async () => {
      vi.mocked(apiClientModule.apiPost).mockResolvedValue(mockMatch);

      const data = {
        mentor_id: 'user_456',
        introduction: 'Hi, I want to learn from you',
        preferred_time: 'weekends',
      };

      const result = await createMatch(data);

      expect(apiClientModule.apiPost).toHaveBeenCalledWith('/api/v1/matches', data);
      expect(result).toEqual(mockMatch);
    });

    it('should throw error when mentor not found', async () => {
      const error = new Error('Mentor not found');
      vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

      const data = { mentor_id: 'invalid', introduction: 'Hi', preferred_time: 'weekends' };

      await expect(createMatch(data)).rejects.toThrow('Mentor not found');
    });

    it('should throw error when unauthorized', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

      const data = { mentor_id: 'user_456', introduction: 'Hi', preferred_time: 'weekends' };

      await expect(createMatch(data)).rejects.toThrow('Unauthorized');
    });
  });

  describe('getMatches', () => {
    it('should fetch all matches without filters', async () => {
      const mockResponse = { matches: [mockMatch] };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getMatches();

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/matches');
      expect(result).toEqual([mockMatch]);
    });

    it('should fetch matches with status filter', async () => {
      const mockResponse = { matches: [mockMatch] };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      await getMatches({ status: 'pending' });

      expect(apiClientModule.apiGet).toHaveBeenCalledWith(
        expect.stringContaining('status=pending')
      );
    });

    it('should fetch matches with role filter', async () => {
      const mockResponse = { matches: [mockMatch] };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      await getMatches({ role: 'mentee' });

      expect(apiClientModule.apiGet).toHaveBeenCalledWith(
        expect.stringContaining('role=mentee')
      );
    });

    it('should return empty array when matches undefined', async () => {
      const mockResponse = { matches: undefined };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getMatches();

      expect(result).toEqual([]);
    });
  });

  describe('getMatchesByStatusAndRole', () => {
    it('should fetch matches filtered by status and role', async () => {
      const mockResponse = { matches: [mockMatch] };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      await getMatchesByStatusAndRole('pending', 'mentee');

      expect(apiClientModule.apiGet).toHaveBeenCalledWith(
        expect.stringContaining('status=pending')
      );
      expect(apiClientModule.apiGet).toHaveBeenCalledWith(
        expect.stringContaining('role=mentee')
      );
    });
  });

  describe('respondToMatch', () => {
    it('should accept a match', async () => {
      const acceptedMatch = { ...mockMatch, status: 'accepted', responded_at: Date.now() };
      vi.mocked(apiClientModule.apiPost).mockResolvedValue(acceptedMatch);

      const result = await respondToMatch('match_123', 'accept');

      expect(apiClientModule.apiPost).toHaveBeenCalledWith('/api/v1/matches/match_123/respond', {
        action: 'accept',
      });
      expect(result.status).toBe('accepted');
    });

    it('should reject a match', async () => {
      const rejectedMatch = { ...mockMatch, status: 'rejected', responded_at: Date.now() };
      vi.mocked(apiClientModule.apiPost).mockResolvedValue(rejectedMatch);

      const result = await respondToMatch('match_123', 'reject');

      expect(apiClientModule.apiPost).toHaveBeenCalledWith('/api/v1/matches/match_123/respond', {
        action: 'reject',
      });
      expect(result.status).toBe('rejected');
    });

    it('should throw error when match not found', async () => {
      const error = new Error('Match not found');
      vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

      await expect(respondToMatch('invalid_id', 'accept')).rejects.toThrow('Match not found');
    });
  });

  describe('completeMatch', () => {
    it('should complete a match', async () => {
      const completedMatch = { ...mockMatch, status: 'completed', completed_at: Date.now() };
      vi.mocked(apiClientModule.apiPatch).mockResolvedValue(completedMatch);

      const result = await completeMatch('match_123');

      expect(apiClientModule.apiPatch).toHaveBeenCalledWith('/api/v1/matches/match_123/complete', {});
      expect(result.status).toBe('completed');
    });

    it('should throw error when match not found', async () => {
      const error = new Error('Match not found');
      vi.mocked(apiClientModule.apiPatch).mockRejectedValue(error);

      await expect(completeMatch('invalid_id')).rejects.toThrow('Match not found');
    });
  });

  describe('deleteMatch', () => {
    it('should delete a match', async () => {
      const mockResponse = { success: true };
      vi.mocked(apiClientModule.apiDelete).mockResolvedValue(mockResponse);

      const result = await deleteMatch('match_123');

      expect(apiClientModule.apiDelete).toHaveBeenCalledWith('/api/v1/matches/match_123');
      expect(result.success).toBe(true);
    });

    it('should throw error when match not found', async () => {
      const error = new Error('Match not found');
      vi.mocked(apiClientModule.apiDelete).mockRejectedValue(error);

      await expect(deleteMatch('invalid_id')).rejects.toThrow('Match not found');
    });
  });

  describe('acceptMatch', () => {
    it('should accept a match', async () => {
      const acceptedMatch = { ...mockMatch, status: 'accepted' };
      vi.mocked(apiClientModule.apiPost).mockResolvedValue(acceptedMatch);

      const result = await acceptMatch('match_123');

      expect(apiClientModule.apiPost).toHaveBeenCalledWith('/api/v1/matches/match_123/respond', {
        action: 'accept',
      });
      expect(result.status).toBe('accepted');
    });
  });

  describe('rejectMatch', () => {
    it('should reject a match', async () => {
      const rejectedMatch = { ...mockMatch, status: 'rejected' };
      vi.mocked(apiClientModule.apiPost).mockResolvedValue(rejectedMatch);

      const result = await rejectMatch('match_123');

      expect(apiClientModule.apiPost).toHaveBeenCalledWith('/api/v1/matches/match_123/respond', {
        action: 'reject',
      });
      expect(result.status).toBe('rejected');
    });
  });

  describe('checkExistingMatch', () => {
    it('should return match info if exists', async () => {
      const mockResponse = { exists: true, matchId: 'match_123', status: 'pending' };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await checkExistingMatch('user_456');

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/matches/check/user_456');
      expect(result?.exists).toBe(true);
      expect(result?.matchId).toBe('match_123');
    });

    it('should return exists: false if no match (404)', async () => {
      const error = new Error('404');
      vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

      const result = await checkExistingMatch('user_456');

      expect(result?.exists).toBe(false);
    });

    it('should throw non-404 errors', async () => {
      const error = new Error('Server error');
      vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

      await expect(checkExistingMatch('user_456')).rejects.toThrow('Server error');
    });
  });
});
