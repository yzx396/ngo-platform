import { Context } from 'hono';
import { extractTokenFromHeader, verifyToken } from './jwt';
import { AuthPayload } from '../../types/user';

/**
 * Extends Hono Context to include authenticated user
 */
export interface AuthContext extends Context {
  get(key: 'user'): AuthPayload | undefined;
  set(key: 'user', value: AuthPayload): void;
}

/**
 * Authentication middleware that verifies JWT token
 * Extracts token from Authorization header and validates it
 */
export async function authMiddleware(c: Context, next: () => Promise<void>) {
  const jwtSecret = c.env.JWT_SECRET;

  // Allow middleware to work without JWT_SECRET (for optional auth routes)
  const authHeader = c.req.header('Authorization');
  const token = extractTokenFromHeader(authHeader);

  // If no token, user is not authenticated
  if (!token) {
    c.set('user', undefined);
    await next();
    return;
  }

  // If token exists but no secret configured, can't verify
  if (!jwtSecret) {
    c.set('user', undefined);
    await next();
    return;
  }

  try {
    const payload = await verifyToken(token, jwtSecret);
    c.set('user', payload);
  } catch (error) {
    c.set('user', undefined);
  }

  await next();
}

/**
 * Guard middleware that requires authentication
 * Returns 401 if user is not authenticated
 */
export async function requireAuth(c: Context, next: () => Promise<void>) {
  const user = c.get('user') as AuthPayload | undefined;

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await next();
}
