import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiClientModule from '../apiClient';
import {
  getUserPoints,
  updateUserPoints,
  addPointsToUser,
  awardPointsForAction,
  getLeaderboard,
} from '../pointsService';

vi.mock('../apiClient', () => ({
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
}));

describe('pointsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPointsResponse = {
    user_id: 'user_123',
    points: 500,
    rank: 10,
  };

  describe('getUserPoints', () => {
    it('should fetch user points', async () => {
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockPointsResponse);

      const result = await getUserPoints('user_123');

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/users/user_123/points');
      expect(result).toEqual(mockPointsResponse);
    });

    it('should throw error when user not found', async () => {
      const error = new Error('User not found');
      vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

      await expect(getUserPoints('invalid_id')).rejects.toThrow('User not found');
    });
  });

  describe('updateUserPoints', () => {
    it('should update user points', async () => {
      const updated = { ...mockPointsResponse, points: 750 };
      vi.mocked(apiClientModule.apiPatch).mockResolvedValue(updated);

      const result = await updateUserPoints('user_123', 750);

      expect(apiClientModule.apiPatch).toHaveBeenCalledWith('/api/v1/users/user_123/points', {
        points: 750,
      });
      expect(result.points).toBe(750);
    });

    it('should throw error when unauthorized', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiPatch).mockRejectedValue(error);

      await expect(updateUserPoints('user_123', 100)).rejects.toThrow('Unauthorized');
    });
  });

  describe('addPointsToUser', () => {
    it('should add points to user', async () => {
      vi.mocked(apiClientModule.apiGet).mockResolvedValueOnce(mockPointsResponse);
      const updated = { ...mockPointsResponse, points: 600 };
      vi.mocked(apiClientModule.apiPatch).mockResolvedValueOnce(updated);

      const result = await addPointsToUser('user_123', 100);

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/users/user_123/points');
      expect(apiClientModule.apiPatch).toHaveBeenCalledWith('/api/v1/users/user_123/points', {
        points: 600,
      });
      expect(result.points).toBe(600);
    });

    it('should handle adding points when user has no current points', async () => {
      const noPoints = { user_id: 'user_new', points: null, rank: null };
      vi.mocked(apiClientModule.apiGet).mockResolvedValueOnce(noPoints);
      const updated = { user_id: 'user_new', points: 50, rank: 1000 };
      vi.mocked(apiClientModule.apiPatch).mockResolvedValueOnce(updated);

      const result = await addPointsToUser('user_new', 50);

      expect(apiClientModule.apiPatch).toHaveBeenCalledWith('/api/v1/users/user_new/points', {
        points: 50,
      });
      expect(result.points).toBe(50);
    });

    it('should throw error when user not found', async () => {
      const error = new Error('User not found');
      vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

      await expect(addPointsToUser('invalid_id', 100)).rejects.toThrow('User not found');
    });
  });

  describe('awardPointsForAction', () => {
    it('should award points for action', async () => {
      vi.mocked(apiClientModule.apiGet).mockResolvedValueOnce(mockPointsResponse);
      const updated = { ...mockPointsResponse, points: 550 };
      vi.mocked(apiClientModule.apiPatch).mockResolvedValueOnce(updated);

      const result = await awardPointsForAction('user_123', 50, 'blog_post');

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/users/user_123/points');
      expect(result.points).toBe(550);
    });

    it('should award points without action description', async () => {
      vi.mocked(apiClientModule.apiGet).mockResolvedValueOnce(mockPointsResponse);
      const updated = { ...mockPointsResponse, points: 525 };
      vi.mocked(apiClientModule.apiPatch).mockResolvedValueOnce(updated);

      const result = await awardPointsForAction('user_123', 25);

      expect(result.points).toBe(525);
    });
  });

  describe('getLeaderboard', () => {
    it('should fetch leaderboard with default pagination', async () => {
      const mockResponse = {
        leaderboard: [
          { user_id: 'user_1', name: 'User 1', points: 1000 },
          { user_id: 'user_2', name: 'User 2', points: 900 },
        ],
        total: 100,
        limit: 50,
        offset: 0,
      };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getLeaderboard();

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/leaderboard?limit=50');
      expect(result).toEqual(mockResponse);
    });

    it('should fetch leaderboard with custom pagination', async () => {
      const mockResponse = {
        leaderboard: [{ user_id: 'user_1', name: 'User 1', points: 1000 }],
        total: 100,
        limit: 10,
        offset: 20,
      };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      await getLeaderboard(10, 20);

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/leaderboard?limit=10&offset=20');
    });

    it('should handle zero offset', async () => {
      const mockResponse = { leaderboard: [], total: 0, limit: 50, offset: 0 };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      await getLeaderboard(50, 0);

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/leaderboard?limit=50');
    });
  });
});
