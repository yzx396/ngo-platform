import { apiPut } from './apiClient';
import { UpdateUserRequest } from '../../types/api';
import { User } from '../../types/user';

/**
 * User Service
 * Handles user profile management API calls
 */
export const userService = {
  /**
   * Update user profile
   * @param userId - The ID of the user to update
   * @param updates - The fields to update (name and/or email)
   * @returns Updated user object
   */
  async updateUser(userId: string, updates: UpdateUserRequest): Promise<User> {
    return apiPut<User>(`/api/v1/users/${userId}`, updates);
  },
};
