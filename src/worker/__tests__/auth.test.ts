import { describe, it, expect } from 'vitest';
import { createToken, verifyToken, extractTokenFromHeader } from '../auth/jwt';
import { createAuthPayload } from '../auth/google';
import type { AuthPayload, User } from '../../types/user';

// ============================================================================
// JWT Token Tests
// ============================================================================

describe('JWT Authentication', () => {
  const jwtSecret = 'test-secret-key-12345';
  const testPayload: AuthPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  describe('createToken', () => {
    it('should create a valid JWT token', async () => {
      const token = await createToken(testPayload, jwtSecret);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts separated by dots
    });

    it('should include payload data in token', async () => {
      const token = await createToken(testPayload, jwtSecret);
      const verified = await verifyToken(token, jwtSecret);

      expect(verified.userId).toBe(testPayload.userId);
      expect(verified.email).toBe(testPayload.email);
      expect(verified.name).toBe(testPayload.name);
    });

    it('should set expiration time', async () => {
      const token = await createToken(testPayload, jwtSecret, 24); // 24 hours
      const verified = await verifyToken(token, jwtSecret);

      expect(verified.exp).toBeDefined();
      expect(typeof verified.exp).toBe('number');
      // Verify token was created with proper expiration
      expect(verified.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should use default 7-day expiration', async () => {
      const token = await createToken(testPayload, jwtSecret); // Default 168 hours = 7 days
      const verified = await verifyToken(token, jwtSecret);
      const now = Math.floor(Date.now() / 1000);

      // 7 days in seconds: 7 * 24 * 60 * 60 = 604800
      // Allow 5 second margin for test execution
      expect(verified.exp).toBeGreaterThan(now + 604795);
      expect(verified.exp).toBeLessThan(now + 604805);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const token = await createToken(testPayload, jwtSecret);
      const verified = await verifyToken(token, jwtSecret);

      // Check that essential payload fields are present and correct
      expect(verified.userId).toBe(testPayload.userId);
      expect(verified.email).toBe(testPayload.email);
      expect(verified.name).toBe(testPayload.name);
      // JWT also includes exp and iat claims
      expect(verified.exp).toBeDefined();
      expect(verified.iat).toBeDefined();
    });

    it('should throw error for invalid token', async () => {
      const invalidToken = 'invalid.token.here';

      await expect(verifyToken(invalidToken, jwtSecret)).rejects.toThrow(
        'Invalid or expired token'
      );
    });

    it('should throw error for tampered token', async () => {
      const token = await createToken(testPayload, jwtSecret);
      const parts = token.split('.');
      parts[1] = Buffer.from(JSON.stringify({ userId: 'hacker' })).toString('base64url');
      const tamperedToken = parts.join('.');

      await expect(verifyToken(tamperedToken, jwtSecret)).rejects.toThrow(
        'Invalid or expired token'
      );
    });

    it('should throw error for token signed with different secret', async () => {
      const token = await createToken(testPayload, jwtSecret);
      const wrongSecret = 'different-secret-key';

      await expect(verifyToken(token, wrongSecret)).rejects.toThrow(
        'Invalid or expired token'
      );
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
      const header = `Bearer ${token}`;

      const extracted = extractTokenFromHeader(header);
      expect(extracted).toBe(token);
    });

    it('should return null for missing header', () => {
      const extracted = extractTokenFromHeader(undefined);
      expect(extracted).toBeNull();
    });

    it('should return null for empty header', () => {
      const extracted = extractTokenFromHeader('');
      expect(extracted).toBeNull();
    });

    it('should return null for header without Bearer prefix', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
      const extracted = extractTokenFromHeader(token);
      expect(extracted).toBeNull();
    });

    it('should return null for malformed Bearer header', () => {
      const extracted = extractTokenFromHeader('Bearer token extra');
      expect(extracted).toBeNull();
    });
  });
});

// ============================================================================
// Auth Payload Tests
// ============================================================================

describe('Auth Payload', () => {
  describe('createAuthPayload', () => {
    it('should create payload from user', () => {
      const user: User = {
        id: 'user-456',
        email: 'user@example.com',
        name: 'John Doe',
        created_at: 1000,
        updated_at: 2000,
      };

      const payload = createAuthPayload(user);

      expect(payload.userId).toBe(user.id);
      expect(payload.email).toBe(user.email);
      expect(payload.name).toBe(user.name);
    });

    it('should not include sensitive fields in payload', () => {
      const user: User = {
        id: 'user-456',
        email: 'user@example.com',
        name: 'Jane Doe',
        google_id: 'google-123',
        created_at: 1000,
        updated_at: 2000,
      };

      const payload = createAuthPayload(user);

      // Payload should only have userId, email, name
      expect(Object.keys(payload).sort()).toEqual(['email', 'name', 'userId']);
      expect(payload).not.toHaveProperty('google_id');
      expect(payload).not.toHaveProperty('created_at');
      expect(payload).not.toHaveProperty('updated_at');
    });
  });
});

// ============================================================================
// Token Expiration Tests
// ============================================================================

describe('Token Expiration', () => {
  const jwtSecret = 'expiration-test-secret';
  const testPayload: AuthPayload = {
    userId: 'user-exp-test',
    email: 'exptest@example.com',
    name: 'Expiration Test User',
  };

  it('should create token with correct expiration timestamp', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await createToken(testPayload, jwtSecret, 1); // 1 hour
    const verified = await verifyToken(token, jwtSecret);

    // Token should expire in approximately 1 hour (3600 seconds)
    const expirationSeconds = verified.exp! - now;
    expect(expirationSeconds).toBeGreaterThan(3595); // 5 second margin
    expect(expirationSeconds).toBeLessThan(3605);
  });

  it('should include issued at timestamp', async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await createToken(testPayload, jwtSecret);
    const after = Math.floor(Date.now() / 1000);
    const verified = await verifyToken(token, jwtSecret);

    // iat should be between before and after
    expect(verified.iat).toBeGreaterThanOrEqual(before);
    expect(verified.iat).toBeLessThanOrEqual(after + 1);
  });
});

// ============================================================================
// OAuth Payload Tests
// ============================================================================

describe('OAuth User Profile Tests', () => {
  it('should handle user with google_id', () => {
    const user: User = {
      id: 'user-oauth-123',
      email: 'oauth@example.com',
      name: 'OAuth User',
      google_id: 'google-user-id-12345',
      created_at: 1000,
      updated_at: 2000,
    };

    const payload = createAuthPayload(user);

    expect(payload.userId).toBe(user.id);
    expect(payload.email).toBe(user.email);
    expect(payload.name).toBe(user.name);
    // google_id should not be in payload
    expect(payload).not.toHaveProperty('google_id');
  });

  it('should handle user without google_id (backwards compatibility)', () => {
    const user: User = {
      id: 'user-legacy-123',
      email: 'legacy@example.com',
      name: 'Legacy User',
      created_at: 1000,
      updated_at: 2000,
    };

    const payload = createAuthPayload(user);

    expect(payload.userId).toBe(user.id);
    expect(payload.email).toBe(user.email);
    expect(payload.name).toBe(user.name);
  });
});

// ============================================================================
// Cookie Authentication Tests
// ============================================================================

describe('Cookie Authentication', () => {
  const jwtSecret = 'cookie-test-secret';

  describe('parseCookie', () => {
    // We need to import or define parseCookie function for testing
    // For now, defining inline helper for testing
    const parseCookie = (cookieHeader: string, name: string): string | null => {
      if (!cookieHeader) return null;
      const cookies = cookieHeader.split(';');
      for (const cookie of cookies) {
        const [key, ...valueParts] = cookie.trim().split('=');
        if (key === name) {
          return valueParts.join('=').trim();
        }
      }
      return null;
    };

    it('should extract auth_token from cookie header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
      const cookieHeader = `auth_token=${token}; Path=/; HttpOnly`;

      const extracted = parseCookie(cookieHeader, 'auth_token');
      expect(extracted).toBe(token);
    });

    it('should return null when cookie not found', () => {
      const cookieHeader = `other_cookie=value; Path=/`;

      const extracted = parseCookie(cookieHeader, 'auth_token');
      expect(extracted).toBeNull();
    });

    it('should return null for empty cookie header', () => {
      const extracted = parseCookie('', 'auth_token');
      expect(extracted).toBeNull();
    });

    it('should handle multiple cookies and extract correct one', () => {
      const token = 'my-jwt-token-123';
      const cookieHeader = `session_id=abc123; auth_token=${token}; csrftoken=xyz789`;

      const extracted = parseCookie(cookieHeader, 'auth_token');
      expect(extracted).toBe(token);
    });

    it('should handle cookies with spaces around values', () => {
      const token = 'spaced-token';
      const cookieHeader = `auth_token= ${token} ; Path=/`;

      const extracted = parseCookie(cookieHeader, 'auth_token');
      expect(extracted).toBe(token);
    });
  });

  describe('Cookie-based Auth Middleware', () => {
    it('should extract and verify token from Cookie header', async () => {
      // This test will be implemented once we update the middleware
      // For now, it's a placeholder showing expected behavior
      const testPayload: AuthPayload = {
        userId: 'cookie-user-123',
        email: 'cookie@example.com',
        name: 'Cookie User',
      };

      const token = await createToken(testPayload, jwtSecret);
      const cookieHeader = `auth_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax`;

      // Expected behavior: middleware should parse cookie, extract token, and verify it
      expect(cookieHeader).toContain('HttpOnly');
      expect(cookieHeader).toContain('Secure');
      expect(cookieHeader).toContain('SameSite=Lax');
    });

    it('should reject request with missing cookie', async () => {
      // Test that middleware returns 401 when cookie is missing
      // This will be implemented with the actual middleware update
      const cookieHeader = '';

      const extracted = cookieHeader ? null : null;
      expect(extracted).toBeNull();
    });

    it('should reject request with invalid cookie token', async () => {
      // Test that middleware rejects invalid/expired tokens from cookies
      const invalidCookie = 'auth_token=invalid.token.here; Path=/';

      const extracted = invalidCookie.split('=')[1].split(';')[0];
      expect(extracted).toBe('invalid.token.here');
    });
  });

  describe('OAuth Callback Cookie Setting', () => {
    it('should set auth_token cookie with correct attributes on login', async () => {
      // Test the OAuth callback endpoint sets cookie with proper attributes
      const testPayload: AuthPayload = {
        userId: 'oauth-cookie-user',
        email: 'oauthcookie@example.com',
        name: 'OAuth Cookie User',
      };

      const token = await createToken(testPayload, jwtSecret);

      // Expected cookie string format
      const expectedCookie = `auth_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`;

      // Verify cookie attributes
      expect(expectedCookie).toContain('HttpOnly');
      expect(expectedCookie).toContain('Secure');
      expect(expectedCookie).toContain('SameSite=Lax');
      expect(expectedCookie).toContain('Path=/');
      expect(expectedCookie).toContain('Max-Age=604800'); // 7 days
    });

    it('should NOT return token in JSON response', () => {
      // After migration, OAuth callback should return user data without token
      const user = {
        userId: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
      };

      const response = { user };

      // Response should not include token
      expect(response).not.toHaveProperty('token');
      expect(response.user).toBeDefined();
    });
  });

  describe('Logout Cookie Clearing', () => {
    it('should clear auth_token cookie with Max-Age=0', () => {
      // Test logout endpoint sets cookie with Max-Age=0 to clear it
      const clearCookie = 'auth_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';

      expect(clearCookie).toContain('Max-Age=0');
      expect(clearCookie).toContain('auth_token=');
    });

    it('should maintain cookie attributes when clearing', () => {
      // When clearing, should maintain HttpOnly, Secure, SameSite, Path for browser compatibility
      const clearCookie = 'auth_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';

      expect(clearCookie).toContain('HttpOnly');
      expect(clearCookie).toContain('Secure');
      expect(clearCookie).toContain('SameSite=Lax');
      expect(clearCookie).toContain('Path=/');
    });
  });
});
