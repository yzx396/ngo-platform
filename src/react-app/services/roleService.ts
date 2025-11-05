import { apiGet, apiPost } from './apiClient';
import type {
  AssignRoleRequest,
  GetUserRoleResponse,
  GetUsersResponse
} from '../../types/api';
import { UserRole } from '../../types/role';

/**
 * Role Service
 * Handles all role-related API operations
 */

/**
 * List all users (admin only)
 * @param limit - Number of users to return (default 50, max 100)
 * @param offset - Pagination offset (default 0)
 * @returns List of users with pagination info
 */
export async function listUsers(
  limit: number = 50,
  offset: number = 0
): Promise<GetUsersResponse> {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  if (offset) params.append('offset', offset.toString());

  const queryString = params.toString();
  const url = `/api/v1/users${queryString ? `?${queryString}` : ''}`;
  return apiGet<GetUsersResponse>(url);
}

/**
 * Get user's role by user ID
 * @param userId - User ID to fetch role for
 * @returns User role information
 */
export async function getUserRole(userId: string): Promise<GetUserRoleResponse> {
  return apiGet<GetUserRoleResponse>(`/api/v1/users/${userId}/role`);
}

/**
 * Assign a role to a user (admin only)
 * @param userId - User ID to assign role to
 * @param role - Role to assign (UserRole.Admin | UserRole.Member)
 * @returns Response with updated role information
 */
export async function assignRole(
  userId: string,
  role: UserRole
): Promise<{ userId: string; role: string; message: string }> {
  const body: AssignRoleRequest = { userId, role };
  return apiPost<{ userId: string; role: string; message: string }>(
    '/api/v1/roles',
    body
  );
}
