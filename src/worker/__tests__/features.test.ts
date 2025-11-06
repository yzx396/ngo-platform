/**
 * Tests for Feature Flags API endpoints
 * Following TDD: Write tests FIRST, then implement the API
 *
 * Endpoints under test:
 * - GET /api/v1/admin/features - List all feature flags (admin-only)
 * - POST /api/v1/admin/features - Create new feature flag (admin-only)
 * - PATCH /api/v1/admin/features/:id - Toggle feature flag (admin-only)
 * - DELETE /api/v1/admin/features/:id - Delete feature flag (admin-only)
 * - GET /api/v1/features/enabled - Get enabled features (public)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import app from '../index';
import { createToken } from '../auth/jwt';
import type { AuthPayload } from '../../types/user';

interface Env {
  platform_db: D1Database;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  JWT_SECRET: string;
}

// ============================================================================
// Mock D1 Database
// ============================================================================

interface MockFeatureFlag {
  id: string;
  feature_key: string;
  display_name: string;
  description: string | null;
  enabled: number; // SQLite stores as INTEGER
  created_at: number;
  updated_at: number;
}

const createMockDb = () => {
  const mockFeatures = new Map<string, MockFeatureFlag>();

  // Seed with initial features
  mockFeatures.set('ft-1', {
    id: 'ft-1',
    feature_key: 'mentor_search',
    display_name: 'Mentor Search',
    description: 'Allow users to search mentors',
    enabled: 1,
    created_at: Date.now(),
    updated_at: Date.now(),
  });
  mockFeatures.set('ft-2', {
    id: 'ft-2',
    feature_key: 'challenges',
    display_name: 'Community Challenges',
    description: 'Community challenges feature',
    enabled: 0,
    created_at: Date.now(),
    updated_at: Date.now(),
  });
  mockFeatures.set('ft-3', {
    id: 'ft-3',
    feature_key: 'blogs',
    display_name: 'Blog Posts',
    description: 'User-generated blog posts',
    enabled: 0,
    created_at: Date.now(),
    updated_at: Date.now(),
  });

  const createMockMethods = (params: (string | number)[] = []) => ({
    all: vi.fn(async () => {
      // GET all features
      if (query.includes('SELECT * FROM feature_flags') && query.includes('ORDER BY')) {
        return {
          success: true,
          results: Array.from(mockFeatures.values()),
        };
      }

      // GET enabled features only
      if (query.includes('SELECT feature_key FROM feature_flags WHERE enabled = 1')) {
        const enabled = Array.from(mockFeatures.values()).filter(
          (f) => f.enabled === 1
        );
        return {
          success: true,
          results: enabled,
        };
      }

      return { success: true, results: [] };
    }),
    first: vi.fn(async () => {
      // GET feature by ID
      if (query.includes('SELECT * FROM feature_flags WHERE id = ?')) {
        return mockFeatures.get(params[0] as string) || null;
      }

      // Check if feature_key exists
      if (query.includes('SELECT id FROM feature_flags WHERE feature_key = ?')) {
        const existing = Array.from(mockFeatures.values()).find(
          (f) => f.feature_key === params[0]
        );
        return existing || null;
      }

      // Check if feature exists (for delete/update)
      if (query.includes('SELECT id FROM feature_flags WHERE id = ?') || query.includes('SELECT * FROM feature_flags WHERE id = ?')) {
        return mockFeatures.get(params[0] as string) || null;
      }

      return null;
    }),
    run: vi.fn(async () => {
      // INSERT new feature
      if (query.includes('INSERT INTO feature_flags')) {
        const [id, key, name, desc, enabled, created, updated] = params;
        mockFeatures.set(id as string, {
          id: id as string,
          feature_key: key as string,
          display_name: name as string,
          description: desc as string | null,
          enabled: enabled as number,
          created_at: created as number,
          updated_at: updated as number,
        });
        return { success: true };
      }

      // UPDATE feature (toggle)
      if (query.includes('UPDATE feature_flags SET enabled')) {
        const [enabled, updated, id] = params;
        const feature = mockFeatures.get(id as string);
        if (feature) {
          feature.enabled = enabled as number;
          feature.updated_at = updated as number;
        }
        return { success: true };
      }

      // DELETE feature
      if (query.includes('DELETE FROM feature_flags WHERE id')) {
        mockFeatures.delete(params[0] as string);
        return { success: true };
      }

      return { success: true };
    }),
  });

  let query = '';

  return {
    prepare: vi.fn((q: string) => {
      query = q;
      const withoutBind = createMockMethods();
      return {
        ...withoutBind,
        bind: vi.fn((...params: (string | number)[]) => createMockMethods(params)),
      };
    }),
  };
};

// ============================================================================
// Test Setup
// ============================================================================

let mockDb: ReturnType<typeof createMockDb>;
let mockEnv: Env;

const jwtSecret = 'test-secret-key';

const adminUser: AuthPayload = {
  userId: 'admin-user-123',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin',
};

const memberUser: AuthPayload = {
  userId: 'member-user-456',
  email: 'member@example.com',
  name: 'Member User',
  role: 'member',
};

beforeEach(() => {
  mockDb = createMockDb();
  mockEnv = {
    platform_db: mockDb as unknown as D1Database,
    JWT_SECRET: jwtSecret,
  };
});

// ============================================================================
// Tests: GET /api/v1/admin/features (List all features)
// ============================================================================

describe('GET /api/v1/admin/features', () => {
  it('should return all feature flags for admin users', async () => {
    const token = await createToken(adminUser, jwtSecret);
    const req = new Request('http://localhost/api/v1/admin/features', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('id');
    expect(data[0]).toHaveProperty('feature_key');
    expect(data[0]).toHaveProperty('enabled');
  });

  it('should return 401 for unauthenticated requests', async () => {
    const req = new Request('http://localhost/api/v1/admin/features');
    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(401);
  });

  it('should return 403 for non-admin users', async () => {
    const token = await createToken(memberUser, jwtSecret);
    const req = new Request('http://localhost/api/v1/admin/features', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(403);
  });
});

// ============================================================================
// Tests: POST /api/v1/admin/features (Create new feature)
// ============================================================================

describe('POST /api/v1/admin/features', () => {
  it('should create a new feature flag for admin users', async () => {
    const token = await createToken(adminUser, jwtSecret);
    const newFeature = {
      feature_key: 'new_feature',
      display_name: 'New Feature',
      description: 'A brand new feature',
      enabled: false,
    };

    const req = new Request('http://localhost/api/v1/admin/features', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newFeature),
    });

    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data).toHaveProperty('id');
    expect(data.feature_key).toBe('new_feature');
    expect(data.display_name).toBe('New Feature');
    expect(data.enabled).toBe(false);
  });

  it('should reject invalid feature_key format', async () => {
    const token = await createToken(adminUser, jwtSecret);
    const invalidFeature = {
      feature_key: 'Invalid-Feature!', // uppercase and special chars
      display_name: 'Invalid Feature',
    };

    const req = new Request('http://localhost/api/v1/admin/features', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidFeature),
    });

    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain('feature_key');
  });

  it('should reject duplicate feature_key', async () => {
    const token = await createToken(adminUser, jwtSecret);
    const duplicateFeature = {
      feature_key: 'mentor_search', // Already exists
      display_name: 'Duplicate Feature',
    };

    const req = new Request('http://localhost/api/v1/admin/features', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(duplicateFeature),
    });

    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(409);

    const data = await res.json();
    expect(data.error).toContain('already exists');
  });

  it('should require display_name field', async () => {
    const token = await createToken(adminUser, jwtSecret);
    const missingName = {
      feature_key: 'missing_name',
    };

    const req = new Request('http://localhost/api/v1/admin/features', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(missingName),
    });

    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(400);
  });

  it('should return 403 for non-admin users', async () => {
    const token = await createToken(memberUser, jwtSecret);
    const newFeature = {
      feature_key: 'unauthorized_feature',
      display_name: 'Unauthorized',
    };

    const req = new Request('http://localhost/api/v1/admin/features', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newFeature),
    });

    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(403);
  });
});

// ============================================================================
// Tests: PATCH /api/v1/admin/features/:id (Toggle feature)
// ============================================================================

describe('PATCH /api/v1/admin/features/:id', () => {
  it('should toggle feature flag for admin users', async () => {
    const token = await createToken(adminUser, jwtSecret);
    const updateData = {
      enabled: true,
    };

    const req = new Request('http://localhost/api/v1/admin/features/ft-2', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.enabled).toBe(true);
    expect(data.id).toBe('ft-2');
  });

  it('should return 404 for non-existent feature', async () => {
    const token = await createToken(adminUser, jwtSecret);
    const updateData = {
      enabled: true,
    };

    const req = new Request(
      'http://localhost/api/v1/admin/features/non-existent',
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      }
    );

    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(404);
  });

  it('should require enabled field in request body', async () => {
    const token = await createToken(adminUser, jwtSecret);
    const req = new Request('http://localhost/api/v1/admin/features/ft-2', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(400);
  });

  it('should return 403 for non-admin users', async () => {
    const token = await createToken(memberUser, jwtSecret);
    const updateData = {
      enabled: true,
    };

    const req = new Request('http://localhost/api/v1/admin/features/ft-2', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(403);
  });
});

// ============================================================================
// Tests: DELETE /api/v1/admin/features/:id (Delete feature)
// ============================================================================

describe('DELETE /api/v1/admin/features/:id', () => {
  it('should delete feature flag for admin users', async () => {
    const token = await createToken(adminUser, jwtSecret);
    const req = new Request('http://localhost/api/v1/admin/features/ft-3', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(204);
  });

  it('should return 404 for non-existent feature', async () => {
    const token = await createToken(adminUser, jwtSecret);
    const req = new Request(
      'http://localhost/api/v1/admin/features/non-existent',
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(404);
  });

  it('should return 403 for non-admin users', async () => {
    const token = await createToken(memberUser, jwtSecret);
    const req = new Request('http://localhost/api/v1/admin/features/ft-3', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const res = await app.fetch(req, mockEnv);
    expect(res.status).toBe(403);
  });
});

// ============================================================================
// Tests: GET /api/v1/features/enabled (Public endpoint)
// ============================================================================

describe('GET /api/v1/features/enabled', () => {
  it('should return only enabled features as key-value map', async () => {
    const req = new Request('http://localhost/api/v1/features/enabled');
    const res = await app.fetch(req, mockEnv);

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('mentor_search', true);
    expect(data).not.toHaveProperty('challenges'); // disabled
    expect(data).not.toHaveProperty('blogs'); // disabled
  });

  it('should not require authentication', async () => {
    const req = new Request('http://localhost/api/v1/features/enabled');
    const res = await app.fetch(req, mockEnv);

    expect(res.status).toBe(200);
  });

  it('should return empty object if no features are enabled', async () => {
    // Clear all features or disable them all
    const emptyDb = {
      prepare: vi.fn(() => ({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn(async () => ({
          success: true,
          results: [],
        })),
      })),
    };

    const emptyEnv = {
      platform_db: emptyDb as unknown as D1Database,
      JWT_SECRET: jwtSecret,
    };

    const req = new Request('http://localhost/api/v1/features/enabled');
    const res = await app.fetch(req, emptyEnv);

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(Object.keys(data).length).toBe(0);
  });
});
