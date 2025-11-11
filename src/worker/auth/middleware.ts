import { Context } from 'hono';
import { extractTokenFromHeader, verifyToken } from './jwt';
import { AuthPayload } from '../../types/user';

/**
 * Parse cookie header to extract specific cookie value
 */
function parseCookie(cookieHeader: string, name: string): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.trim().split('=');
    if (key === name) {
      return valueParts.join('=').trim();
    }
  }
  return null;
}

/**
 * Authentication middleware that verifies JWT token
 * Extracts token from Cookie header (auth_token) or Authorization header (for backward compatibility)
 */
export async function authMiddleware(c: Context, next: () => Promise<void>) {
  const jwtSecret = (c.env as Record<string, unknown>).JWT_SECRET as string | undefined;

  // Allow middleware to work without JWT_SECRET (for optional auth routes)

  // First, try to get token from cookie (preferred method)
  const cookieHeader = c.req.header('Cookie') || '';
  let token = parseCookie(cookieHeader, 'auth_token');

  // Fall back to Authorization header for backward compatibility during migration
  if (!token) {
    const authHeader = c.req.header('Authorization');
    token = extractTokenFromHeader(authHeader);
  }

  // If no token, user is not authenticated
  if (!token) {
    await next();
    return;
  }

  // If token exists but no secret configured, can't verify
  if (!jwtSecret) {
    await next();
    return;
  }

  try {
    const payload = await verifyToken(token, jwtSecret);
    c.set('user', payload);
  } catch {
    // Token verification failed, continue without user
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
