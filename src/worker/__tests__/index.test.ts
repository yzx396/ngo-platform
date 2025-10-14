import { describe, it, expect } from 'vitest';
import app from '../index';

// Mock Env object for testing
const mockEnv = {} as Env;

describe('Worker API Routes', () => {
  describe('GET /api/', () => {
    it('should return 200 status code', async () => {
      const req = new Request('http://localhost/api/', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
    });

    it('should return JSON response', async () => {
      const req = new Request('http://localhost/api/', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.headers.get('content-type')).toContain('application/json');
    });

    it('should return name property with "Cloudflare" value', async () => {
      const req = new Request('http://localhost/api/', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(data).toHaveProperty('name');
      expect(data.name).toBe('Cloudflare');
    });

    it('should return expected data structure', async () => {
      const req = new Request('http://localhost/api/', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);
      const data = await res.json();

      expect(data).toEqual({ name: 'Cloudflare' });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const req = new Request('http://localhost/api/nonexistent', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
    });

    it('should return 404 for root path', async () => {
      const req = new Request('http://localhost/', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
    });

    it('should handle invalid HTTP methods gracefully', async () => {
      const req = new Request('http://localhost/api/', {
        method: 'POST',
      });
      const res = await app.fetch(req, mockEnv);

      // POST is not defined for /api/ route, should return 404
      expect(res.status).toBe(404);
    });
  });

  describe('Response Format', () => {
    it('should return valid JSON that can be parsed', async () => {
      const req = new Request('http://localhost/api/', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);
      const text = await res.text();

      expect(() => JSON.parse(text)).not.toThrow();
    });

    it('should have correct content-type header', async () => {
      const req = new Request('http://localhost/api/', {
        method: 'GET',
      });
      const res = await app.fetch(req, mockEnv);

      const contentType = res.headers.get('content-type');
      expect(contentType).toBeTruthy();
      expect(contentType).toMatch(/application\/json/);
    });

    it('should return consistent response on multiple calls', async () => {
      const responses = [];

      for (let i = 0; i < 3; i++) {
        const req = new Request('http://localhost/api/', {
          method: 'GET',
        });
        const res = await app.fetch(req, mockEnv);
        const data = await res.json();
        responses.push(data);
      }

      // All responses should be identical
      expect(responses[0]).toEqual(responses[1]);
      expect(responses[1]).toEqual(responses[2]);
    });
  });
});
