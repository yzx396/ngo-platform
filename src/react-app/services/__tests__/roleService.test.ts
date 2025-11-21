import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiClientModule from '../apiClient';
import { listUsers, getUserRole, assignRole } from '../roleService';
import { UserRole } from '../../../types/role';

vi.mock('../apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

describe('roleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listUsers', () => {
    it('should list users with default pagination', async () => {
      const mockResponse = {
        users: [
          { id: 'user_1', email: 'user1@example.com', name: 'User 1', role: 'member' },
          { id: 'user_2', email: 'user2@example.com', name: 'User 2', role: 'admin' },
        ],
        total: 100,
        limit: 50,
        offset: 0,
      };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await listUsers();

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/users?limit=50');
      expect(result).toEqual(mockResponse);
      expect(result.users).toHaveLength(2);
    });

    it('should list users with custom pagination', async () => {
      const mockResponse = {
        users: [{ id: 'user_1', email: 'user1@example.com', name: 'User 1', role: 'member' }],
        total: 100,
        limit: 20,
        offset: 40,
      };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await listUsers(20, 40);

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/users?limit=20&offset=40');
      expect(result).toEqual(mockResponse);
    });

    it('should throw error when unauthorized', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

      await expect(listUsers()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getUserRole', () => {
    it('should fetch user role', async () => {
      const mockResponse = { user_id: 'user_123', role: 'member' };
      vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

      const result = await getUserRole('user_123');

      expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/users/user_123/role');
      expect(result).toEqual(mockResponse);
    });

    it('should throw error when user not found', async () => {
      const error = new Error('User not found');
      vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

      await expect(getUserRole('invalid_id')).rejects.toThrow('User not found');
    });
  });

  describe('assignRole', () => {
    it('should assign admin role', async () => {
      const mockResponse = { userId: 'user_123', role: 'admin', message: 'Role assigned' };
      vi.mocked(apiClientModule.apiPost).mockResolvedValue(mockResponse);

      const result = await assignRole('user_123', UserRole.Admin);

      expect(apiClientModule.apiPost).toHaveBeenCalledWith('/api/v1/roles', {
        userId: 'user_123',
        role: UserRole.Admin,
      });
      expect(result.role).toBe('admin');
    });

    it('should assign member role', async () => {
      const mockResponse = { userId: 'user_123', role: 'member', message: 'Role assigned' };
      vi.mocked(apiClientModule.apiPost).mockResolvedValue(mockResponse);

      const result = await assignRole('user_123', UserRole.Member);

      expect(apiClientModule.apiPost).toHaveBeenCalledWith('/api/v1/roles', {
        userId: 'user_123',
        role: UserRole.Member,
      });
      expect(result.role).toBe('member');
    });

    it('should throw error when user not found', async () => {
      const error = new Error('User not found');
      vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

      await expect(assignRole('invalid_id', UserRole.Admin)).rejects.toThrow('User not found');
    });

    it('should throw error when unauthorized', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

      await expect(assignRole('user_123', UserRole.Admin)).rejects.toThrow('Unauthorized');
    });
  });
});
