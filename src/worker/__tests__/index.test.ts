import { describe, it, expect, beforeEach } from 'vitest';
import app from '../index';

describe('Worker API Routes', () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = {
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      JWT_SECRET: 'test-jwt-secret',
      platform_db: {
        prepare: () => ({
          bind: () => ({
            first: async () => null,
            run: async () => ({ success: true }),
          }),
          first: async () => null,
          run: async () => ({ success: true }),
        }),
      },
    } as unknown as Env;
  });

  describe('GET /api/v1/auth/google/login', () => {
    it('should persist redirect_uri in cookie and return login URL', async () => {
      const req = new Request('http://localhost/api/v1/auth/google/login?redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fgoogle%2Fcallback', {
        method: 'GET',
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('url');
      expect(typeof data.url).toBe('string');

      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toBeTruthy();
      expect(setCookie).toContain('oauth_redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fgoogle%2Fcallback');
    });
  });

  describe('GET /api/v1/auth/google/callback', () => {
    it('should clear cookie and respond with error when code missing', async () => {
      const req = new Request('http://localhost/api/v1/auth/google/callback', {
        method: 'GET',
        headers: {
          Cookie: 'oauth_redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fgoogle%2Fcallback',
        },
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Missing authorization code');

      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toBeTruthy();
      expect(setCookie).toContain('Max-Age=0');
    });
  });
});

describe('Worker API Routes - Legacy Tests', () => {
  const legacyEnv = {} as Env;

  describe('GET /api/', () => {
    it('should return 200 status code', async () => {
      const req = new Request('http://localhost/api/', {
        method: 'GET',
      });
      const res = await app.fetch(req, legacyEnv);

      expect(res.status).toBe(200);
    });

    it('should return JSON response', async () => {
      const req = new Request('http://localhost/api/', {
        method: 'GET',
      });
      const res = await app.fetch(req, legacyEnv);

      expect(res.headers.get('content-type')).toContain('application/json');
    });

    it('should return name property with "Cloudflare" value', async () => {
      const req = new Request('http://localhost/api/', {
        method: 'GET',
      });
      const res = await app.fetch(req, legacyEnv);
      const data = await res.json();

      expect(data).toHaveProperty('name');
      expect(data.name).toBe('Cloudflare');
    });

    it('should return expected data structure', async () => {
      const req = new Request('http://localhost/api/', {
        method: 'GET',
      });
      const res = await app.fetch(req, legacyEnv);
      const data = await res.json();

      expect(data).toEqual({ name: 'Cloudflare' });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const req = new Request('http://localhost/api/nonexistent', {
        method: 'GET',
      });
      const res = await app.fetch(req, legacyEnv);

      expect(res.status).toBe(404);
    });

    it('should return 404 for root path', async () => {
      const req = new Request('http://localhost/', {
        method: 'GET',
      });
      const res = await app.fetch(req, legacyEnv);

      expect(res.status).toBe(404);
    });

    it('should handle invalid HTTP methods gracefully', async () => {
      const req = new Request('http://localhost/api/', {
        method: 'POST',
      });
      const res = await app.fetch(req, legacyEnv);

      // POST is not defined for /api/ route, should return 404
      expect(res.status).toBe(404);
    });
  });

  describe('Response Format', () => {
    it('should return valid JSON that can be parsed', async () => {
      const req = new Request('http://localhost/api/', {
        method: 'GET',
      });
      const res = await app.fetch(req, legacyEnv);
      const text = await res.text();

      expect(() => JSON.parse(text)).not.toThrow();
    });

    it('should have correct content-type header', async () => {
      const req = new Request('http://localhost/api/', {
        method: 'GET',
      });
      const res = await app.fetch(req, legacyEnv);

      const contentType = res.headers.get('content-type');
      expect(contentType).toBeTruthy();
      expect(contentType).toMatch(/application\/json/);
    });

    it('should return consistent response on multiple calls', async () => {
      const responses = [] as Array<Record<string, unknown>>;

      for (let i = 0; i < 3; i++) {
        const req = new Request('http://localhost/api/', {
          method: 'GET',
        });
        const res = await app.fetch(req, legacyEnv);
        const data = await res.json();
        responses.push(data);
      }

      // All responses should be identical
      expect(responses[0]).toEqual(responses[1]);
      expect(responses[1]).toEqual(responses[2]);
    });
  });
});
