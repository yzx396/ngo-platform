import { Context } from 'hono';
import { AuthPayload, User } from '../../types/user';

/**
 * Google OAuth response from token endpoint
 */
interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
}

/**
 * Google user profile from userinfo endpoint
 */
interface GoogleUserProfile {
  sub: string; // Google ID
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
}

/**
 * Generates Google OAuth login URL
 */
export function getGoogleLoginUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchanges Google authorization code for access token
 */
export async function exchangeGoogleCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<GoogleTokenResponse> {
  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Google token exchange failed: ${error.error_description}`);
  }

  return response.json();
}

/**
 * Fetches user profile from Google using access token
 */
export async function getGoogleUserProfile(accessToken: string): Promise<GoogleUserProfile> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Google user profile');
  }

  return response.json();
}

/**
 * Finds or creates user from Google profile
 */
export async function findOrCreateUserFromGoogle(
  googleProfile: GoogleUserProfile,
  db: D1Database
): Promise<User> {
  // Try to find existing user by google_id
  const existing = await db
    .prepare('SELECT * FROM users WHERE google_id = ?')
    .bind(googleProfile.sub)
    .first<User>();

  if (existing) {
    return existing;
  }

  // Check if email already exists
  const emailExists = await db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(googleProfile.email)
    .first<User>();

  if (emailExists) {
    // Link Google ID to existing email account
    const now = Date.now();
    await db
      .prepare('UPDATE users SET google_id = ?, updated_at = ? WHERE email = ?')
      .bind(googleProfile.sub, now, googleProfile.email)
      .run();

    return {
      ...emailExists,
      google_id: googleProfile.sub,
      updated_at: now,
    };
  }

  // Create new user
  const userId = `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const now = Date.now();

  await db
    .prepare(
      'INSERT INTO users (id, email, name, google_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(userId, googleProfile.email, googleProfile.name, googleProfile.sub, now, now)
    .run();

  return {
    id: userId,
    email: googleProfile.email,
    name: googleProfile.name,
    google_id: googleProfile.sub,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Creates auth payload from user
 */
export function createAuthPayload(user: User): AuthPayload {
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
  };
}
