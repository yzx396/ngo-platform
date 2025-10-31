/**
 * User Roles System
 * Defines role enums and types for role-based access control
 */

/**
 * UserRole enum - All available user roles
 * Admin: Full administrative access
 * Member: Regular user with basic access
 */
export enum UserRole {
  Admin = 'admin',
  Member = 'member',
}

/**
 * UserRoleRecord - Database representation of a user role
 */
export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: number;
}

/**
 * Helper function to check if a role is admin
 */
export function isAdmin(role: UserRole | undefined): boolean {
  return role === UserRole.Admin;
}

/**
 * Helper function to get role display name
 * Should be used with i18n in actual UI
 */
export function getRoleName(role: UserRole): string {
  switch (role) {
    case UserRole.Admin:
      return 'Admin';
    case UserRole.Member:
      return 'Member';
    default:
      return 'Unknown';
  }
}

/**
 * Default role for new users
 */
export const DEFAULT_ROLE = UserRole.Member;

/**
 * Normalize user role from database or external source
 * Ensures role is properly typed as UserRole
 */
export function normalizeUserRole(dbRole: unknown): UserRole {
  if (dbRole === UserRole.Admin) {
    return UserRole.Admin;
  }
  return UserRole.Member;
}
