import { SignJWT, jwtVerify } from 'jose';
import { AuthPayload } from '../../types/user';
import { normalizeUserRole } from '../../types/role';

/**
 * Creates a JWT token for authentication
 * @param payload User authentication payload
 * @param secret JWT secret key
 * @param expirationHours Hours until token expires (default: 168 = 7 days)
 */
export async function createToken(
  payload: AuthPayload,
  secret: string,
  expirationHours: number = 168
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);

  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expirationHours}h`)
    .sign(secretKey);

  return token;
}

/**
 * Verifies and decodes a JWT token
 * @param token JWT token to verify
 * @param secret JWT secret key
 */
export async function verifyToken(
  token: string,
  secret: string
): Promise<AuthPayload> {
  const secretKey = new TextEncoder().encode(secret);

  try {
    const verified = await jwtVerify(token, secretKey);
    const { userId, email, name, role, iat, exp } = verified.payload;
    return {
      userId: userId as string,
      email: email as string,
      name: name as string,
      role: role ? normalizeUserRole(role) : undefined,
      iat: iat ? Math.floor(iat) : undefined,
      exp: exp ? Math.floor(exp) : undefined,
    };
  } catch {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Extracts JWT token from Authorization header
 * Expected format: "Bearer <token>"
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}
