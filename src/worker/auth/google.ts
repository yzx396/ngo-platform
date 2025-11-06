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
 * Decoded JWT payload from id_token
 */
interface GoogleIdTokenPayload {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
  [key: string]: unknown;
}

/**
 * Decodes a JWT token (without verification) to extract payload
 * Used to extract user info from id_token as a fallback
 */
function decodeJwt(token: string): GoogleIdTokenPayload | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (add padding if needed)
    const payload = parts[1];
    const paddedPayload = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const decoded = atob(paddedPayload);
    return JSON.parse(decoded) as GoogleIdTokenPayload;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Generates Google OAuth login URL
 * Uses prompt=select_account to always show account picker, allowing users to choose
 * which Google account to use (enables logging in with different Gmail accounts)
 */
export function getGoogleLoginUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account', // Always show account picker
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
    const error = await response.json() as Record<string, unknown>;
    console.error('Google token exchange error:', {
      status: response.status,
      error: error.error,
      error_description: error.error_description,
      redirectUri, // Log the redirect_uri being used
    });
    throw new Error(`Google token exchange failed: ${error.error_description || error.error || 'Unknown error'}`);
  }

  return response.json();
}

/**
 * Fetches user profile from Google using access token
 * Includes fallback logic in case id_token is needed
 */
export async function getGoogleUserProfile(
  accessToken: string,
  idToken?: string
): Promise<GoogleUserProfile> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    // If userinfo fetch fails, try to extract from id_token
    if (idToken) {
      console.warn('Userinfo endpoint failed, attempting to use id_token');
      const payload = decodeJwt(idToken);
      if (payload && payload.sub && payload.email) {
        return {
          sub: payload.sub,
          email: payload.email,
          name: payload.name || payload.email.split('@')[0],
          picture: payload.picture,
          email_verified: payload.email_verified,
        };
      }
    }
    throw new Error('Failed to fetch Google user profile');
  }

  const profile = await response.json() as Record<string, unknown>;

  // Extract sub and email from id_token if missing
  if (!profile.sub && idToken) {
    const payload = decodeJwt(idToken);
    if (payload && payload.sub && payload.email) {
      return {
        sub: payload.sub,
        email: payload.email as string,
        name: payload.name as string || (payload.email as string).split('@')[0],
        picture: payload.picture as string | undefined,
        email_verified: payload.email_verified as boolean | undefined,
      };
    }
  }

  // Validate required fields
  if (!profile.sub || !profile.email) {
    console.error('Missing required fields in Google profile:', {
      hasSub: !!profile.sub,
      hasEmail: !!profile.email,
      responseKeys: Object.keys(profile),
    });
    throw new Error(
      `Google profile missing required fields. Got: ${Object.keys(profile).join(', ')}`
    );
  }

  return profile as unknown as GoogleUserProfile;
}

/**
 * Finds or creates user from Google profile
 */
export async function findOrCreateUserFromGoogle(
  googleProfile: GoogleUserProfile,
  db: D1Database
): Promise<User> {
  // Validate required fields from Google profile
  // D1 does not accept undefined values in .bind(), so we must validate first
  if (!googleProfile.sub) {
    throw new Error('Google profile missing required field: sub');
  }
  if (!googleProfile.email) {
    throw new Error('Google profile missing required field: email');
  }

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
  // Fallback to email username if name not provided
  const userName = googleProfile.name || googleProfile.email.split('@')[0];

  await db
    .prepare(
      'INSERT INTO users (id, email, name, google_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(userId, googleProfile.email, userName, googleProfile.sub, now, now)
    .run();

  return {
    id: userId,
    email: googleProfile.email,
    name: userName,
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
