import { Context } from 'hono';
import { AuthPayload } from '../../types/user';
import { UserRole, isAdmin, normalizeUserRole } from '../../types/role';

/**
 * Role-based access control middleware
 * Checks if user has required role(s)
 */
export async function requireRole(
  requiredRoles: UserRole | UserRole[]
) {
  return async (c: Context, next: () => Promise<void>) => {
    const user = c.get('user') as AuthPayload | undefined;

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    const userRole = user.role || UserRole.Member;

    if (!roles.includes(userRole)) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await next();
  };
}

/**
 * Admin-only middleware
 * Returns 403 if user is not an admin
 */
export async function requireAdmin(c: Context, next: () => Promise<void>) {
  const user = c.get('user') as AuthPayload | undefined;

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const userRole = user.role || UserRole.Member;

  if (!isAdmin(userRole)) {
    return c.json({ error: 'Forbidden - Admin role required' }, 403);
  }

  await next();
}

// normalizeUserRole is exported from ../../types/role
export { normalizeUserRole };
