import { describe, it, expect, vi } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import app from '../index';

const JWT_SECRET = 'test-jwt-secret';

interface TestEnv {
  platform_db: D1Database;
  JWT_SECRET: string;
}

interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  icon: string | null;
  display_order: number;
  thread_count: number;
  created_at: number;
}

function createMockDb() {
  const categories = new Map<string, Record<string, unknown>>([
    [
      'cat_career',
      {
        id: 'cat_career',
        name: 'Career Development',
        slug: 'career-development',
        description: 'Professional growth and career advice',
        parent_id: null,
        icon: '💼',
        display_order: 1,
        created_at: 1700000000,
        thread_count: 0,
      },
    ],
    [
      'cat_career_job',
      {
        id: 'cat_career_job',
        name: 'Job Search & Applications',
        slug: 'job-search',
        description: 'Tips, resume reviews, interview prep',
        parent_id: 'cat_career',
        icon: '💡',
        display_order: 1,
        created_at: 1700000000,
        thread_count: 0,
      },
    ],
    [
      'cat_mentorship',
      {
        id: 'cat_mentorship',
        name: 'Mentorship',
        slug: 'mentorship',
        description: 'Finding and working with mentors',
        parent_id: null,
        icon: '🤝',
        display_order: 2,
        created_at: 1700000000,
        thread_count: 0,
      },
    ],
  ]);

  return {
    prepare: vi.fn((query: string) => ({
      bind: vi.fn((...params: unknown[]) => ({
        all: vi.fn(async () => {
          // SELECT categories with parent_id
          if (
            query.includes('forum_categories') &&
            query.includes('WHERE c.parent_id = ?')
          ) {
            const parentId = params[0];
            const results = Array.from(categories.values()).filter(
              c => c.parent_id === parentId
            );
            return { results, success: true };
          }
          return { results: [], success: true };
        }),
        first: vi.fn(async () => {
          // GET single category
          if (query.includes('WHERE c.id = ?')) {
            const catId = params[0];
            return categories.get(catId as string) || null;
          }
          return null;
        }),
      })),
      all: vi.fn(async () => {
        // SELECT all top-level categories
        if (
          query.includes('forum_categories') &&
          query.includes('WHERE c.parent_id IS NULL')
        ) {
          const results = Array.from(categories.values())
            .filter(c => c.parent_id === null)
            .sort((a, b) => (a.display_order as number) - (b.display_order as number));
          return { results, success: true };
        }
        return { results: [], success: true };
      }),
      first: vi.fn(async () => null),
    })),
  };
}

const mockEnv: TestEnv = {
  platform_db: createMockDb() as D1Database,
  JWT_SECRET,
};

describe('Forum Categories API', () => {
  describe('GET /api/v1/forums/categories', () => {
    it('should return all top-level categories', async () => {
      const req = new Request('http://localhost/api/v1/forums/categories');
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = (await res.json()) as { categories: CategoryRecord[] };
      expect(Array.isArray(data.categories)).toBe(true);
      expect(data.categories.length).toBeGreaterThan(0);
      expect(data.categories[0]).toHaveProperty('name');
      expect(data.categories[0]).toHaveProperty('slug');
      expect(data.categories[0]).toHaveProperty('thread_count');
    });

    it('should return only top-level categories by default', async () => {
      const req = new Request('http://localhost/api/v1/forums/categories');
      const res = await app.fetch(req, mockEnv);
      const data = (await res.json()) as { categories: CategoryRecord[] };

      const allTopLevel = data.categories.every(c => c.parent_id === null);
      expect(allTopLevel).toBe(true);
    });

    it('should return subcategories for a parent_id', async () => {
      const req = new Request('http://localhost/api/v1/forums/categories?parent_id=cat_career');
      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const data = (await res.json()) as { categories: CategoryRecord[] };

      const allMatch = data.categories.every(c => c.parent_id === 'cat_career');
      expect(allMatch).toBe(true);
      expect(data.categories.length).toBeGreaterThan(0);
    });

    it('should include thread_count for each category', async () => {
      const req = new Request('http://localhost/api/v1/forums/categories');
      const res = await app.fetch(req, mockEnv);
      const data = (await res.json()) as { categories: CategoryRecord[] };

      expect(data.categories[0]).toHaveProperty('thread_count');
      expect(typeof data.categories[0].thread_count).toBe('number');
    });

    it('should order by display_order ascending', async () => {
      const req = new Request('http://localhost/api/v1/forums/categories');
      const res = await app.fetch(req, mockEnv);
      const data = (await res.json()) as { categories: CategoryRecord[] };

      for (let i = 1; i < data.categories.length; i++) {
        expect(data.categories[i].display_order).toBeGreaterThanOrEqual(
          data.categories[i - 1].display_order
        );
      }
    });

    it('should return 404 for non-existent parent_id', async () => {
      const req = new Request('http://localhost/api/v1/forums/categories?parent_id=fake_id');
      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/forums/categories/:id', () => {
    it('should return a single category with details', async () => {
      const req = new Request('http://localhost/api/v1/forums/categories/cat_career');
      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const data = (await res.json()) as { category: CategoryRecord };
      expect(data.category.id).toBe('cat_career');
      expect(data.category.name).toBe('Career Development');
      expect(data.category).toHaveProperty('thread_count');
      expect(data.category).toHaveProperty('description');
    });

    it('should return 404 for non-existent category', async () => {
      const req = new Request('http://localhost/api/v1/forums/categories/fake_id');
      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(404);
    });

    it('should include all category fields', async () => {
      const req = new Request('http://localhost/api/v1/forums/categories/cat_career');
      const res = await app.fetch(req, mockEnv);
      const data = (await res.json()) as { category: CategoryRecord };

      expect(data.category).toHaveProperty('id');
      expect(data.category).toHaveProperty('name');
      expect(data.category).toHaveProperty('slug');
      expect(data.category).toHaveProperty('description');
      expect(data.category).toHaveProperty('parent_id');
      expect(data.category).toHaveProperty('icon');
      expect(data.category).toHaveProperty('display_order');
      expect(data.category).toHaveProperty('created_at');
      expect(data.category).toHaveProperty('thread_count');
    });
  });
});
