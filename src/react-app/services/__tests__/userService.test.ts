import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiClientModule from '../apiClient';
import { userService } from '../userService';
import type { User } from '../../../types/user';

vi.mock('../apiClient', () => ({
  apiPut: vi.fn(),
}));

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser: User = {
    id: 'user_123',
    email: 'user@example.com',
    name: 'John Doe',
    google_id: 'google_123',
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  describe('updateUser', () => {
    it('should update user name', async () => {
      const updated = { ...mockUser, name: 'Jane Doe' };
      vi.mocked(apiClientModule.apiPut).mockResolvedValue(updated);

      const result = await userService.updateUser('user_123', { name: 'Jane Doe' });

      expect(apiClientModule.apiPut).toHaveBeenCalledWith('/api/v1/users/user_123', {
        name: 'Jane Doe',
      });
      expect(result.name).toBe('Jane Doe');
    });

    it('should update user email', async () => {
      const updated = { ...mockUser, email: 'newemail@example.com' };
      vi.mocked(apiClientModule.apiPut).mockResolvedValue(updated);

      const result = await userService.updateUser('user_123', {
        email: 'newemail@example.com',
      });

      expect(apiClientModule.apiPut).toHaveBeenCalledWith('/api/v1/users/user_123', {
        email: 'newemail@example.com',
      });
      expect(result.email).toBe('newemail@example.com');
    });

    it('should update both name and email', async () => {
      const updated = {
        ...mockUser,
        name: 'Jane Smith',
        email: 'jane@example.com',
      };
      vi.mocked(apiClientModule.apiPut).mockResolvedValue(updated);

      const result = await userService.updateUser('user_123', {
        name: 'Jane Smith',
        email: 'jane@example.com',
      });

      expect(apiClientModule.apiPut).toHaveBeenCalledWith('/api/v1/users/user_123', {
        name: 'Jane Smith',
        email: 'jane@example.com',
      });
      expect(result.name).toBe('Jane Smith');
      expect(result.email).toBe('jane@example.com');
    });

    it('should throw error when user not found', async () => {
      const error = new Error('User not found');
      vi.mocked(apiClientModule.apiPut).mockRejectedValue(error);

      await expect(
        userService.updateUser('invalid_id', { name: 'New Name' })
      ).rejects.toThrow('User not found');
    });

    it('should throw error when email already exists', async () => {
      const error = new Error('Email already in use');
      vi.mocked(apiClientModule.apiPut).mockRejectedValue(error);

      await expect(
        userService.updateUser('user_123', { email: 'taken@example.com' })
      ).rejects.toThrow('Email already in use');
    });

    it('should throw error when validation fails', async () => {
      const error = new Error('Invalid email format');
      vi.mocked(apiClientModule.apiPut).mockRejectedValue(error);

      await expect(
        userService.updateUser('user_123', { email: 'invalid-email' })
      ).rejects.toThrow('Invalid email format');
    });

    it('should throw error when unauthorized', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClientModule.apiPut).mockRejectedValue(error);

      await expect(
        userService.updateUser('other_user_id', { name: 'Hacker' })
      ).rejects.toThrow('Unauthorized');
    });
  });
});
