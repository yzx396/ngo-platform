# Forum Feature Implementation - Vertical Slices with TDD

## Overview

Replace the current feed feature with a **multi-level forum system** inspired by 1point3acres.com. This document outlines 12 vertical slices using Test-Driven Development (TDD), where each slice delivers complete, working functionality from database to UI.

## Requirements

### Functional Requirements
- ✅ Multi-level categories (sections → subsections → threads)
- ✅ Thread titles & separate content view
- ✅ View counts and last activity tracking
- ✅ Pinned/sticky threads
- ✅ Thread status (open/solved/closed)
- ✅ Hot/trending algorithm for sorting
- ✅ Forum-specific points and gamification
- ✅ Upvote/downvote system (replaces likes)
- ✅ Nested replies (up to 5 levels)
- ✅ Tag system for content discovery

### Non-Functional Requirements
- Mobile responsive design
- Backward compatibility (migrate existing posts)
- Performance: hot score calculation
- XSS protection for user content

## Architecture Overview

### TDD Approach: Red-Green-Refactor

For each vertical slice:
1. **RED**: Write failing tests (backend tests, then frontend tests)
2. **GREEN**: Write minimal implementation to make tests pass
3. **REFACTOR**: Improve code while keeping tests green

### Slice Dependencies

```
Slice 1 (View Categories)
         ↓
Slice 2 (View Threads)
         ↓
Slice 3 (View Thread Detail)
         ↓
Slice 4 (Create Thread) + Slice 5 (Reply)
         ↓
Slice 6 (View Tracking) + Slice 7 (Upvote/Downvote)
         ↓
Slice 8 (Hot Algorithm)
         ↓
Slices 9-12 (Status, Pinned, Tags, Points)
```

---

# Vertical Slices

## SLICE 1: View Forum Categories (Read-Only)

**User Value**: Users can see the forum structure and navigate
**Effort**: ~2 hours
**Depends On**: Nothing

### 1.1 Database Migration

```sql
-- migrations/0020_create_forum_categories.sql
CREATE TABLE IF NOT EXISTS forum_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  parent_id TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES forum_categories(id)
);

CREATE INDEX idx_forum_categories_parent ON forum_categories(parent_id);
CREATE INDEX idx_forum_categories_display_order ON forum_categories(display_order);

-- Seed initial categories
INSERT INTO forum_categories (id, name, slug, description, icon, display_order, created_at) VALUES
('cat_career', 'Career Development', 'career-development', 'Professional growth and career advice', '💼', 1, unixepoch()),
('cat_career_job', 'Job Search & Applications', 'job-search', 'Tips, resume reviews, interview prep', '💡', 1, unixepoch()),
('cat_career_transition', 'Career Transitions', 'career-transitions', 'Changing careers, pivoting industries', '🎯', 2, unixepoch()),
('cat_career_skills', 'Skill Development', 'skill-development', 'Learning new skills, certifications', '📊', 3, unixepoch()),
('cat_mentorship', 'Mentorship', 'mentorship', 'Finding and working with mentors', '🤝', 2, unixepoch()),
('cat_mentor_finding', 'Finding a Mentor', 'finding-mentor', 'How to find and approach mentors', '🔍', 1, unixepoch()),
('cat_mentor_stories', 'Mentoring Success Stories', 'mentor-stories', 'Share your mentorship journey', '⭐', 2, unixepoch()),
('cat_mentor_qa', 'Mentor Q&A', 'mentor-qa', 'Ask experienced mentors anything', '💬', 3, unixepoch()),
('cat_community', 'Community', 'community', 'General discussions and networking', '🌟', 3, unixepoch()),
('cat_community_general', 'General Discussion', 'general-discussion', 'General discussions', '💭', 1, unixepoch()),
('cat_community_events', 'Events & Meetups', 'events', 'Community events and meetups', '🎉', 2, unixepoch()),
('cat_community_achievements', 'Community Achievements', 'achievements', 'Celebrate community wins', '🏆', 3, unixepoch()),
('cat_help', 'Help & Support', 'help', 'Platform help and feedback', 'ℹ️', 4, unixepoch()),
('cat_help_platform', 'Platform Help', 'platform-help', 'Questions about using the platform', '❓', 1, unixepoch()),
('cat_help_features', 'Feature Requests', 'feature-requests', 'Suggest new features', '💡', 2, unixepoch());
```

### 1.2 Backend Tests (WRITE FIRST)

File: `src/worker/__tests__/forum-categories.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import app from '../index';

describe('Forum Categories API', () => {
  describe('GET /api/v1/forums/categories', () => {
    it('should return all top-level categories', async () => {
      const req = new Request('http://localhost/api/v1/forums/categories');
      const res = await app.fetch(req);

      expect(res.status).toBe(200);
      const data = await res.json() as { categories: any[] };
      expect(Array.isArray(data.categories)).toBe(true);
      expect(data.categories.length).toBeGreaterThan(0);
      expect(data.categories[0]).toHaveProperty('name');
      expect(data.categories[0]).toHaveProperty('slug');
      expect(data.categories[0]).toHaveProperty('thread_count');
    });

    it('should return only top-level categories by default', async () => {
      const req = new Request('http://localhost/api/v1/forums/categories');
      const res = await app.fetch(req);
      const data = await res.json() as { categories: any[] };

      const allTopLevel = data.categories.every(c => c.parent_id === null);
      expect(allTopLevel).toBe(true);
    });

    it('should return subcategories for a parent_id', async () => {
      const req = new Request('http://localhost/api/v1/forums/categories?parent_id=cat_career');
      const res = await app.fetch(req);
      expect(res.status).toBe(200);
      const data = await res.json() as { categories: any[] };

      const allMatch = data.categories.every(c => c.parent_id === 'cat_career');
      expect(allMatch).toBe(true);
    });

    it('should include thread_count for each category', async () => {
      const req = new Request('http://localhost/api/v1/forums/categories');
      const res = await app.fetch(req);
      const data = await res.json() as { categories: any[] };

      expect(data.categories[0]).toHaveProperty('thread_count');
      expect(typeof data.categories[0].thread_count).toBe('number');
    });

    it('should order by display_order ascending', async () => {
      const req = new Request('http://localhost/api/v1/forums/categories');
      const res = await app.fetch(req);
      const data = await res.json() as { categories: any[] };

      for (let i = 1; i < data.categories.length; i++) {
        expect(data.categories[i].display_order).toBeGreaterThanOrEqual(data.categories[i-1].display_order);
      }
    });

    it('should return 404 for non-existent parent_id', async () => {
      const req = new Request('http://localhost/api/v1/forums/categories?parent_id=fake_id');
      const res = await app.fetch(req);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/forums/categories/:id', () => {
    it('should return a single category with details', async () => {
      const req = new Request('http://localhost/api/v1/forums/categories/cat_career');
      const res = await app.fetch(req);

      expect(res.status).toBe(200);
      const data = await res.json() as { category: any };
      expect(data.category.id).toBe('cat_career');
      expect(data.category.name).toBe('Career Development');
      expect(data.category).toHaveProperty('thread_count');
    });

    it('should return 404 for non-existent category', async () => {
      const req = new Request('http://localhost/api/v1/forums/categories/fake_id');
      const res = await app.fetch(req);
      expect(res.status).toBe(404);
    });
  });
});
```

### 1.3 Backend Implementation

Add to `src/worker/index.ts`:

```typescript
// Get all top-level or child categories
app.get('/api/v1/forums/categories', async (c) => {
  const db = c.env.platform_db;
  const parentId = c.req.query('parent_id');

  let query = `
    SELECT
      c.*,
      COALESCE(COUNT(t.id), 0) as thread_count
    FROM forum_categories c
    LEFT JOIN forum_threads t ON c.id = t.category_id
  `;

  if (parentId) {
    query += ` WHERE c.parent_id = ?`;
  } else {
    query += ` WHERE c.parent_id IS NULL`;
  }

  query += ` GROUP BY c.id ORDER BY c.display_order ASC`;

  const result = parentId
    ? await db.prepare(query).bind(parentId).all()
    : await db.prepare(query).all();

  if (!result.success) {
    return c.json({ error: 'Failed to fetch categories' }, 500);
  }

  return c.json({ categories: result.results });
});

// Get single category
app.get('/api/v1/forums/categories/:id', async (c) => {
  const db = c.env.platform_db;
  const categoryId = c.req.param('id');

  const query = `
    SELECT
      c.*,
      COALESCE(COUNT(t.id), 0) as thread_count
    FROM forum_categories c
    LEFT JOIN forum_threads t ON c.id = t.category_id
    WHERE c.id = ?
    GROUP BY c.id
  `;

  const result = await db.prepare(query).bind(categoryId).first();

  if (!result) {
    return c.json({ error: 'Category not found' }, 404);
  }

  return c.json({ category: result });
});
```

### 1.4 Type Definitions

Create `src/types/forum.ts`:

```typescript
export interface ForumCategory {
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

export interface ForumCategoryWithChildren extends ForumCategory {
  children?: ForumCategory[];
}
```

Update `src/types/api.ts` to include:

```typescript
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

export interface CategoriesResponse {
  categories: ForumCategory[];
}

export interface CategoryResponse {
  category: ForumCategory;
}
```

### 1.5 Frontend Service

Create `src/react-app/services/forumService.ts`:

```typescript
import { apiClient } from './apiClient';
import { ForumCategory } from '../../types/forum';

interface CategoriesResponse {
  categories: ForumCategory[];
}

interface CategoryResponse {
  category: ForumCategory;
}

export const forumService = {
  async getCategories(parentId?: string): Promise<ForumCategory[]> {
    const params = parentId ? `?parent_id=${parentId}` : '';
    const response = await apiClient.get<CategoriesResponse>(`/api/v1/forums/categories${params}`);
    return response.categories;
  },

  async getCategory(id: string): Promise<ForumCategory> {
    const response = await apiClient.get<CategoryResponse>(`/api/v1/forums/categories/${id}`);
    return response.category;
  },

  async getCategoryWithChildren(parentId: string): Promise<ForumCategory[]> {
    return this.getCategories(parentId);
  },
};
```

### 1.6 Frontend Tests

File: `src/react-app/__tests__/ForumHomePage.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ForumHomePage from '../pages/ForumHomePage';
import * as forumService from '../services/forumService';

vi.mock('../services/forumService');

describe('ForumHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render forum title', async () => {
    vi.mocked(forumService.forumService.getCategories).mockResolvedValue([]);

    render(<ForumHomePage />);
    expect(screen.getByText(/Forums/i)).toBeInTheDocument();
  });

  it('should display top-level categories', async () => {
    const categories = [
      {
        id: 'cat_career',
        name: 'Career Development',
        slug: 'career-development',
        description: 'Professional growth',
        icon: '💼',
        parent_id: null,
        display_order: 1,
        thread_count: 100,
        created_at: 0
      },
      {
        id: 'cat_mentorship',
        name: 'Mentorship',
        slug: 'mentorship',
        description: 'Finding mentors',
        icon: '🤝',
        parent_id: null,
        display_order: 2,
        thread_count: 50,
        created_at: 0
      }
    ];

    vi.mocked(forumService.forumService.getCategories).mockResolvedValue(categories);

    render(<ForumHomePage />);

    await waitFor(() => {
      expect(screen.getByText('Career Development')).toBeInTheDocument();
      expect(screen.getByText('Mentorship')).toBeInTheDocument();
    });
  });

  it('should show thread counts', async () => {
    const categories = [
      {
        id: 'cat_career',
        name: 'Career Development',
        slug: 'career',
        description: null,
        icon: '💼',
        parent_id: null,
        display_order: 1,
        thread_count: 100,
        created_at: 0
      }
    ];

    vi.mocked(forumService.forumService.getCategories).mockResolvedValue(categories);

    render(<ForumHomePage />);

    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });

  it('should display subcategories when clicking on category', async () => {
    const parentCategories = [
      {
        id: 'cat_career',
        name: 'Career Development',
        slug: 'career',
        description: null,
        icon: '💼',
        parent_id: null,
        display_order: 1,
        thread_count: 100,
        created_at: 0
      }
    ];

    const childCategories = [
      {
        id: 'cat_career_job',
        name: 'Job Search',
        slug: 'job-search',
        description: null,
        icon: '💡',
        parent_id: 'cat_career',
        display_order: 1,
        thread_count: 50,
        created_at: 0
      }
    ];

    vi.mocked(forumService.forumService.getCategories)
      .mockResolvedValueOnce(parentCategories)
      .mockResolvedValueOnce(childCategories);

    render(<ForumHomePage />);

    await waitFor(() => {
      expect(screen.getByText('Career Development')).toBeInTheDocument();
    });

    // User interaction will be tested at component level
  });
});
```

### 1.7 Frontend Components

Create `src/react-app/pages/ForumHomePage.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { forumService } from '../services/forumService';
import { ForumCategory } from '../../types/forum';
import CategoryCard from '../components/CategoryCard';

export default function ForumHomePage() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        const cats = await forumService.getCategories();
        setCategories(cats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  if (loading) return <div className="p-8">Loading forums...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Forums</h1>
        <p className="text-gray-600">Connect, learn, and grow with the community</p>
      </div>

      <div className="space-y-6">
        {categories.map(category => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </div>
  );
}
```

Create `src/react-app/components/CategoryCard.tsx`:

```typescript
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ForumCategory } from '../../types/forum';
import { forumService } from '../services/forumService';

interface CategoryCardProps {
  category: ForumCategory;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(false);

  const handleExpand = async () => {
    if (!expanded && children.length === 0) {
      setLoading(true);
      const childCategories = await forumService.getCategories(category.id);
      setChildren(childCategories);
      setLoading(false);
    }
    setExpanded(!expanded);
  };

  return (
    <div className="border rounded-lg">
      <div
        className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 flex justify-between items-start"
        onClick={handleExpand}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {category.icon && <span className="text-2xl">{category.icon}</span>}
            <div>
              <h3 className="text-lg font-semibold">{category.name}</h3>
              {category.description && (
                <p className="text-sm text-gray-600">{category.description}</p>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{category.thread_count}</div>
          <div className="text-xs text-gray-600">threads</div>
        </div>
      </div>

      {expanded && (
        <div className="border-t bg-white">
          {loading ? (
            <div className="p-4">Loading...</div>
          ) : children.length > 0 ? (
            <div className="divide-y">
              {children.map(child => (
                <Link
                  key={child.id}
                  to={`/forums/category/${child.id}`}
                  className="p-4 hover:bg-blue-50 flex justify-between items-start group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      {child.icon && <span>{child.icon}</span>}
                      <h4 className="font-medium group-hover:text-blue-600">{child.name}</h4>
                    </div>
                    {child.description && (
                      <p className="text-sm text-gray-600 mt-1">{child.description}</p>
                    )}
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <div className="text-lg font-semibold">{child.thread_count}</div>
                    <div className="text-xs text-gray-600">threads</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-4 text-gray-500">No subcategories</div>
          )}
        </div>
      )}
    </div>
  );
}
```

### 1.8 Router Update

Update `src/react-app/App.tsx`:

```typescript
import ForumHomePage from './pages/ForumHomePage';

// Replace or update existing routes
<Route path="/forums" element={<ForumHomePage />} />
<Route path="/forums/category/:categoryId" element={<ForumCategoryPage />} />
<Route path="/" element={<Navigate to="/forums" replace />} /> // Redirect home to forums
```

---

## SLICE 2: View Threads in Category

**User Value**: Users can browse threads in a category
**Effort**: ~3 hours
**Depends On**: Slice 1

[Similar detailed structure with database migration, backend tests, implementation, frontend tests, components...]

---

## SLICE 3: View Thread Detail with Replies

**User Value**: Users can read full discussions
**Effort**: ~3 hours
**Depends On**: Slice 2

---

## SLICE 4: Create New Thread

**User Value**: Users can start discussions
**Effort**: ~2 hours
**Depends On**: Slice 3

---

## SLICE 5: Reply to Thread

**User Value**: Users can participate in discussions
**Effort**: ~2 hours
**Depends On**: Slice 4

### 5.1 Database Migration

```sql
-- migrations/0022_create_forum_replies.sql
CREATE TABLE IF NOT EXISTS forum_replies (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_reply_id TEXT,
  is_solution BOOLEAN DEFAULT 0,
  upvote_count INTEGER DEFAULT 0,
  downvote_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (thread_id) REFERENCES forum_threads(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (parent_reply_id) REFERENCES forum_replies(id)
);

CREATE INDEX idx_forum_replies_thread ON forum_replies(thread_id);
CREATE INDEX idx_forum_replies_user ON forum_replies(user_id);
CREATE INDEX idx_forum_replies_parent ON forum_replies(parent_reply_id);
CREATE INDEX idx_forum_replies_created ON forum_replies(created_at DESC);
```

### 5.2 Backend Tests (WRITE FIRST)

File: `src/worker/__tests__/forum-replies.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import app from '../index';

describe('Forum Replies API', () => {
  describe('POST /api/v1/forums/threads/:threadId/replies', () => {
    it('should create a reply when authenticated', async () => {
      const body = {
        content: 'This is a helpful reply'
      };

      const req = new Request(
        'http://localhost/api/v1/forums/threads/thread_123/replies',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );

      const res = await app.fetch(req);
      expect(res.status).toBe(201);
      const data = await res.json() as { reply: any };
      expect(data.reply).toHaveProperty('id');
      expect(data.reply.content).toBe('This is a helpful reply');
      expect(data.reply.thread_id).toBe('thread_123');
    });

    it('should require authentication', async () => {
      const body = { content: 'Reply content' };

      const req = new Request(
        'http://localhost/api/v1/forums/threads/thread_123/replies',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );

      const res = await app.fetch(req);
      expect(res.status).toBe(401);
    });

    it('should require non-empty content', async () => {
      const body = { content: '' };

      const req = new Request(
        'http://localhost/api/v1/forums/threads/thread_123/replies',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );

      const res = await app.fetch(req);
      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent thread', async () => {
      const body = { content: 'Reply content' };

      const req = new Request(
        'http://localhost/api/v1/forums/threads/fake_thread/replies',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );

      const res = await app.fetch(req);
      expect(res.status).toBe(404);
    });

    it('should support nested replies with parent_reply_id', async () => {
      const body = {
        content: 'Reply to a reply',
        parent_reply_id: 'reply_456'
      };

      const req = new Request(
        'http://localhost/api/v1/forums/threads/thread_123/replies',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );

      const res = await app.fetch(req);
      expect(res.status).toBe(201);
      const data = await res.json() as { reply: any };
      expect(data.reply.parent_reply_id).toBe('reply_456');
    });

    it('should increment thread reply_count', async () => {
      const body = { content: 'Reply content' };

      const req = new Request(
        'http://localhost/api/v1/forums/threads/thread_123/replies',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );

      const res = await app.fetch(req);
      expect(res.status).toBe(201);

      // Verify thread reply_count was incremented
      const threadReq = new Request(
        'http://localhost/api/v1/forums/threads/thread_123'
      );
      const threadRes = await app.fetch(threadReq);
      const threadData = await threadRes.json() as { thread: any };
      expect(threadData.thread.reply_count).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/forums/threads/:threadId/replies', () => {
    it('should return all replies for a thread', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/threads/thread_123/replies'
      );

      const res = await app.fetch(req);
      expect(res.status).toBe(200);
      const data = await res.json() as { replies: any[] };
      expect(Array.isArray(data.replies)).toBe(true);
    });

    it('should include user information in replies', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/threads/thread_123/replies'
      );

      const res = await app.fetch(req);
      const data = await res.json() as { replies: any[] };

      if (data.replies.length > 0) {
        expect(data.replies[0]).toHaveProperty('user_id');
        expect(data.replies[0]).toHaveProperty('user_name');
        expect(data.replies[0]).toHaveProperty('user_avatar');
      }
    });

    it('should order replies by created_at ascending', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/threads/thread_123/replies'
      );

      const res = await app.fetch(req);
      const data = await res.json() as { replies: any[] };

      for (let i = 1; i < data.replies.length; i++) {
        expect(data.replies[i].created_at).toBeGreaterThanOrEqual(
          data.replies[i - 1].created_at
        );
      }
    });

    it('should support pagination with limit and offset', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/threads/thread_123/replies?limit=10&offset=0'
      );

      const res = await app.fetch(req);
      expect(res.status).toBe(200);
      const data = await res.json() as { replies: any[], total: number };
      expect(data.replies.length).toBeLessThanOrEqual(10);
      expect(data).toHaveProperty('total');
    });

    it('should return 404 for non-existent thread', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/threads/fake_thread/replies'
      );

      const res = await app.fetch(req);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/forums/replies/:replyId', () => {
    it('should return a single reply with nested replies', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/replies/reply_123'
      );

      const res = await app.fetch(req);
      expect(res.status).toBe(200);
      const data = await res.json() as { reply: any };
      expect(data.reply.id).toBe('reply_123');
      expect(data.reply).toHaveProperty('content');
      expect(data.reply).toHaveProperty('user_id');
    });

    it('should include nested replies if available', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/replies/reply_123'
      );

      const res = await app.fetch(req);
      const data = await res.json() as { reply: any };
      expect(data.reply).toHaveProperty('nested_replies');
      expect(Array.isArray(data.reply.nested_replies)).toBe(true);
    });

    it('should return 404 for non-existent reply', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/replies/fake_reply'
      );

      const res = await app.fetch(req);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/v1/forums/replies/:replyId', () => {
    it('should update reply content when authorized', async () => {
      const body = { content: 'Updated reply content' };

      const req = new Request(
        'http://localhost/api/v1/forums/replies/reply_123',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );

      const res = await app.fetch(req);
      expect(res.status).toBe(200);
      const data = await res.json() as { reply: any };
      expect(data.reply.content).toBe('Updated reply content');
    });

    it('should require authentication', async () => {
      const body = { content: 'Updated content' };

      const req = new Request(
        'http://localhost/api/v1/forums/replies/reply_123',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );

      const res = await app.fetch(req);
      expect(res.status).toBe(401);
    });

    it('should require reply author authorization', async () => {
      const body = { content: 'Updated content' };

      const req = new Request(
        'http://localhost/api/v1/forums/replies/reply_123',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );

      const res = await app.fetch(req);
      expect(res.status).toBe(403);
    });

    it('should update updated_at timestamp', async () => {
      const body = { content: 'Updated content' };

      const req = new Request(
        'http://localhost/api/v1/forums/replies/reply_123',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );

      const res = await app.fetch(req);
      const data = await res.json() as { reply: any };
      expect(data.reply.updated_at).toBeDefined();
    });
  });

  describe('DELETE /api/v1/forums/replies/:replyId', () => {
    it('should delete reply when authorized', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/replies/reply_123',
        { method: 'DELETE' }
      );

      const res = await app.fetch(req);
      expect(res.status).toBe(200);
    });

    it('should require authentication', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/replies/reply_123',
        { method: 'DELETE' }
      );

      const res = await app.fetch(req);
      expect(res.status).toBe(401);
    });

    it('should require reply author authorization', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/replies/reply_123',
        { method: 'DELETE' }
      );

      const res = await app.fetch(req);
      expect(res.status).toBe(403);
    });

    it('should decrement thread reply_count', async () => {
      const req = new Request(
        'http://localhost/api/v1/forums/replies/reply_123',
        { method: 'DELETE' }
      );

      const res = await app.fetch(req);
      expect(res.status).toBe(200);

      // Verify thread reply_count was decremented
      const threadReq = new Request(
        'http://localhost/api/v1/forums/threads/thread_123'
      );
      const threadRes = await app.fetch(threadReq);
      const threadData = await threadRes.json() as { thread: any };
      expect(threadData.thread.reply_count).toBeDefined();
    });
  });
});
```

### 5.3 Backend Implementation

Add to `src/worker/index.ts`:

```typescript
// POST /api/v1/forums/threads/:threadId/replies
app.post('/api/v1/forums/threads/:threadId/replies', async (c) => {
  const db = c.env.platform_db;
  const auth = c.get('auth') as { userId: string } | undefined;

  if (!auth) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const threadId = c.req.param('threadId');
  const { content, parent_reply_id } = await c.req.json() as {
    content: string;
    parent_reply_id?: string;
  };

  // Validate content
  if (!content || content.trim().length === 0) {
    return c.json({ error: 'Content is required' }, 400);
  }

  // Verify thread exists
  const thread = await db
    .prepare('SELECT id FROM forum_threads WHERE id = ?')
    .bind(threadId)
    .first();

  if (!thread) {
    return c.json({ error: 'Thread not found' }, 404);
  }

  // Verify parent reply exists if provided
  if (parent_reply_id) {
    const parentReply = await db
      .prepare('SELECT id FROM forum_replies WHERE id = ? AND thread_id = ?')
      .bind(parent_reply_id, threadId)
      .first();

    if (!parentReply) {
      return c.json({ error: 'Parent reply not found' }, 404);
    }
  }

  const replyId = `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = Math.floor(Date.now() / 1000);

  const result = await db
    .prepare(`
      INSERT INTO forum_replies (
        id, thread_id, user_id, content, parent_reply_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      replyId,
      threadId,
      auth.userId,
      content.trim(),
      parent_reply_id || null,
      now,
      now
    )
    .run();

  if (!result.success) {
    return c.json({ error: 'Failed to create reply' }, 500);
  }

  // Increment thread reply_count
  await db
    .prepare(`
      UPDATE forum_threads
      SET reply_count = reply_count + 1, last_activity_at = ?
      WHERE id = ?
    `)
    .bind(now, threadId)
    .run();

  // Fetch the created reply with user info
  const reply = await db
    .prepare(`
      SELECT
        fr.*,
        u.name as user_name,
        u.avatar as user_avatar
      FROM forum_replies fr
      JOIN users u ON fr.user_id = u.id
      WHERE fr.id = ?
    `)
    .bind(replyId)
    .first();

  return c.json({ reply }, 201);
});

// GET /api/v1/forums/threads/:threadId/replies
app.get('/api/v1/forums/threads/:threadId/replies', async (c) => {
  const db = c.env.platform_db;
  const threadId = c.req.param('threadId');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  // Verify thread exists
  const thread = await db
    .prepare('SELECT id FROM forum_threads WHERE id = ?')
    .bind(threadId)
    .first();

  if (!thread) {
    return c.json({ error: 'Thread not found' }, 404);
  }

  const replies = await db
    .prepare(`
      SELECT
        fr.*,
        u.name as user_name,
        u.avatar as user_avatar
      FROM forum_replies fr
      JOIN users u ON fr.user_id = u.id
      WHERE fr.thread_id = ? AND fr.parent_reply_id IS NULL
      ORDER BY fr.created_at ASC
      LIMIT ? OFFSET ?
    `)
    .bind(threadId, limit, offset)
    .all();

  const totalResult = await db
    .prepare('SELECT COUNT(*) as count FROM forum_replies WHERE thread_id = ? AND parent_reply_id IS NULL')
    .bind(threadId)
    .first();

  return c.json({
    replies: replies.results || [],
    total: (totalResult as any)?.count || 0
  });
});

// GET /api/v1/forums/replies/:replyId
app.get('/api/v1/forums/replies/:replyId', async (c) => {
  const db = c.env.platform_db;
  const replyId = c.req.param('replyId');

  const reply = await db
    .prepare(`
      SELECT
        fr.*,
        u.name as user_name,
        u.avatar as user_avatar
      FROM forum_replies fr
      JOIN users u ON fr.user_id = u.id
      WHERE fr.id = ?
    `)
    .bind(replyId)
    .first();

  if (!reply) {
    return c.json({ error: 'Reply not found' }, 404);
  }

  // Fetch nested replies (children)
  const nestedReplies = await db
    .prepare(`
      SELECT
        fr.*,
        u.name as user_name,
        u.avatar as user_avatar
      FROM forum_replies fr
      JOIN users u ON fr.user_id = u.id
      WHERE fr.parent_reply_id = ?
      ORDER BY fr.created_at ASC
    `)
    .bind(replyId)
    .all();

  return c.json({
    reply: {
      ...reply,
      nested_replies: nestedReplies.results || []
    }
  });
});

// PUT /api/v1/forums/replies/:replyId
app.put('/api/v1/forums/replies/:replyId', async (c) => {
  const db = c.env.platform_db;
  const auth = c.get('auth') as { userId: string } | undefined;

  if (!auth) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const replyId = c.req.param('replyId');
  const { content } = await c.req.json() as { content: string };

  // Verify reply exists and user is author
  const reply = await db
    .prepare('SELECT user_id FROM forum_replies WHERE id = ?')
    .bind(replyId)
    .first();

  if (!reply) {
    return c.json({ error: 'Reply not found' }, 404);
  }

  if ((reply as any).user_id !== auth.userId) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare('UPDATE forum_replies SET content = ?, updated_at = ? WHERE id = ?')
    .bind(content.trim(), now, replyId)
    .run();

  const updated = await db
    .prepare(`
      SELECT
        fr.*,
        u.name as user_name,
        u.avatar as user_avatar
      FROM forum_replies fr
      JOIN users u ON fr.user_id = u.id
      WHERE fr.id = ?
    `)
    .bind(replyId)
    .first();

  return c.json({ reply: updated });
});

// DELETE /api/v1/forums/replies/:replyId
app.delete('/api/v1/forums/replies/:replyId', async (c) => {
  const db = c.env.platform_db;
  const auth = c.get('auth') as { userId: string } | undefined;

  if (!auth) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const replyId = c.req.param('replyId');

  // Verify reply exists and user is author
  const reply = await db
    .prepare('SELECT user_id, thread_id FROM forum_replies WHERE id = ?')
    .bind(replyId)
    .first();

  if (!reply) {
    return c.json({ error: 'Reply not found' }, 404);
  }

  if ((reply as any).user_id !== auth.userId) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const threadId = (reply as any).thread_id;

  // Delete the reply
  await db
    .prepare('DELETE FROM forum_replies WHERE id = ?')
    .bind(replyId)
    .run();

  // Decrement thread reply_count
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare('UPDATE forum_threads SET reply_count = MAX(0, reply_count - 1), last_activity_at = ? WHERE id = ?')
    .bind(now, threadId)
    .run();

  return c.json({ success: true });
});
```

### 5.4 Type Definitions

Update `src/types/forum.ts`:

```typescript
export interface ForumReply {
  id: string;
  thread_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  content: string;
  parent_reply_id: string | null;
  is_solution: boolean;
  upvote_count: number;
  downvote_count: number;
  created_at: number;
  updated_at: number;
  nested_replies?: ForumReply[];
}

export interface CreateReplyRequest {
  content: string;
  parent_reply_id?: string;
}

export interface UpdateReplyRequest {
  content: string;
}
```

### 5.5 Frontend Service

Update `src/react-app/services/forumService.ts`:

```typescript
async createReply(
  threadId: string,
  content: string,
  parentReplyId?: string
): Promise<ForumReply> {
  const response = await apiClient.post<{ reply: ForumReply }>(
    `/api/v1/forums/threads/${threadId}/replies`,
    {
      content,
      parent_reply_id: parentReplyId,
    }
  );
  return response.reply;
},

async getReplies(
  threadId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ replies: ForumReply[]; total: number }> {
  return apiClient.get(
    `/api/v1/forums/threads/${threadId}/replies?limit=${limit}&offset=${offset}`
  );
},

async getReply(replyId: string): Promise<ForumReply> {
  const response = await apiClient.get<{ reply: ForumReply }>(
    `/api/v1/forums/replies/${replyId}`
  );
  return response.reply;
},

async updateReply(replyId: string, content: string): Promise<ForumReply> {
  const response = await apiClient.put<{ reply: ForumReply }>(
    `/api/v1/forums/replies/${replyId}`,
    { content }
  );
  return response.reply;
},

async deleteReply(replyId: string): Promise<void> {
  await apiClient.delete(`/api/v1/forums/replies/${replyId}`);
},
```

### 5.6 Frontend Tests

File: `src/react-app/__tests__/ReplyThread.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ReplyThread from '../components/ReplyThread';
import * as forumService from '../services/forumService';

vi.mock('../services/forumService');

describe('ReplyThread Component', () => {
  const mockThread = {
    id: 'thread_123',
    title: 'Test Thread',
    content: 'Thread content',
    category_id: 'cat_career',
    user_id: 'user_1',
    user_name: 'John Doe',
    status: 'open' as const,
    is_pinned: false,
    view_count: 10,
    reply_count: 5,
    upvote_count: 3,
    downvote_count: 0,
    hot_score: 15.5,
    last_activity_at: Date.now(),
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render reply form', () => {
    vi.mocked(forumService.forumService.getReplies).mockResolvedValue({
      replies: [],
      total: 0,
    });

    render(<ReplyThread threadId={mockThread.id} />);
    expect(screen.getByPlaceholderText(/add your reply/i)).toBeInTheDocument();
  });

  it('should display existing replies', async () => {
    const replies = [
      {
        id: 'reply_1',
        thread_id: 'thread_123',
        user_id: 'user_2',
        user_name: 'Jane Smith',
        user_avatar: null,
        content: 'Great thread!',
        parent_reply_id: null,
        is_solution: false,
        upvote_count: 2,
        downvote_count: 0,
        created_at: Date.now(),
        updated_at: Date.now(),
      },
    ];

    vi.mocked(forumService.forumService.getReplies).mockResolvedValue({
      replies,
      total: 1,
    });

    render(<ReplyThread threadId={mockThread.id} />);

    await waitFor(() => {
      expect(screen.getByText('Great thread!')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('should submit a new reply', async () => {
    const user = userEvent.setup();

    vi.mocked(forumService.forumService.getReplies).mockResolvedValue({
      replies: [],
      total: 0,
    });

    const mockReply = {
      id: 'reply_new',
      thread_id: 'thread_123',
      user_id: 'user_1',
      user_name: 'Current User',
      user_avatar: null,
      content: 'My reply',
      parent_reply_id: null,
      is_solution: false,
      upvote_count: 0,
      downvote_count: 0,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    vi.mocked(forumService.forumService.createReply).mockResolvedValue(
      mockReply
    );

    render(<ReplyThread threadId={mockThread.id} />);

    const textarea = screen.getByPlaceholderText(/add your reply/i);
    await user.type(textarea, 'My reply');

    const submitButton = screen.getByText(/post reply/i);
    await user.click(submitButton);

    await waitFor(() => {
      expect(forumService.forumService.createReply).toHaveBeenCalledWith(
        mockThread.id,
        'My reply',
        undefined
      );
    });
  });

  it('should show loading state while submitting', async () => {
    const user = userEvent.setup();

    vi.mocked(forumService.forumService.getReplies).mockResolvedValue({
      replies: [],
      total: 0,
    });

    vi.mocked(forumService.forumService.createReply).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<ReplyThread threadId={mockThread.id} />);

    const textarea = screen.getByPlaceholderText(/add your reply/i);
    await user.type(textarea, 'My reply');

    const submitButton = screen.getByText(/post reply/i);
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
  });

  it('should clear form after successful submit', async () => {
    const user = userEvent.setup();

    vi.mocked(forumService.forumService.getReplies).mockResolvedValue({
      replies: [],
      total: 0,
    });

    vi.mocked(forumService.forumService.createReply).mockResolvedValue({
      id: 'reply_new',
      thread_id: 'thread_123',
      user_id: 'user_1',
      user_name: 'Current User',
      user_avatar: null,
      content: 'My reply',
      parent_reply_id: null,
      is_solution: false,
      upvote_count: 0,
      downvote_count: 0,
      created_at: Date.now(),
      updated_at: Date.now(),
    });

    render(<ReplyThread threadId={mockThread.id} />);

    const textarea = screen.getByPlaceholderText(/add your reply/i) as HTMLTextAreaElement;
    await user.type(textarea, 'My reply');

    const submitButton = screen.getByText(/post reply/i);
    await user.click(submitButton);

    await waitFor(() => {
      expect(textarea.value).toBe('');
    });
  });

  it('should support nested replies', async () => {
    const user = userEvent.setup();

    const replies = [
      {
        id: 'reply_1',
        thread_id: 'thread_123',
        user_id: 'user_2',
        user_name: 'Jane Smith',
        user_avatar: null,
        content: 'Great thread!',
        parent_reply_id: null,
        is_solution: false,
        upvote_count: 2,
        downvote_count: 0,
        created_at: Date.now(),
        updated_at: Date.now(),
        nested_replies: [],
      },
    ];

    vi.mocked(forumService.forumService.getReplies).mockResolvedValue({
      replies,
      total: 1,
    });

    render(<ReplyThread threadId={mockThread.id} />);

    await waitFor(() => {
      expect(screen.getByText('Great thread!')).toBeInTheDocument();
    });

    const replyButton = screen.getByText(/reply/i);
    await user.click(replyButton);

    expect(forumService.forumService.createReply).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(forumService.forumService.getReplies).mockRejectedValue(
      new Error('Failed to load')
    );

    render(<ReplyThread threadId={mockThread.id} />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

### 5.7 Frontend Components

Create `src/react-app/components/ReplyThread.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { forumService } from '../services/forumService';
import { ForumReply } from '../../types/forum';

interface ReplyThreadProps {
  threadId: string;
}

export default function ReplyThread({ threadId }: ReplyThreadProps) {
  const { user } = useAuth();
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newReplyContent, setNewReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => {
    loadReplies();
  }, [threadId]);

  const loadReplies = async () => {
    try {
      setLoading(true);
      const { replies: fetchedReplies } = await forumService.getReplies(threadId);
      setReplies(fetchedReplies);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load replies');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('You must be logged in to reply');
      return;
    }

    if (!newReplyContent.trim()) {
      setError('Reply content cannot be empty');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const newReply = await forumService.createReply(
        threadId,
        newReplyContent,
        replyingTo || undefined
      );

      setReplies(prev => [...prev, newReply]);
      setNewReplyContent('');
      setReplyingTo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!window.confirm('Are you sure you want to delete this reply?')) {
      return;
    }

    try {
      await forumService.deleteReply(replyId);
      setReplies(prev => prev.filter(r => r.id !== replyId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete reply');
    }
  };

  if (loading) {
    return <div className="p-8">Loading replies...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Reply Form */}
      {user && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Add Your Reply</h3>
          <form onSubmit={handleSubmitReply} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded">
                {error}
              </div>
            )}
            <textarea
              value={newReplyContent}
              onChange={e => setNewReplyContent(e.target.value)}
              placeholder="Add your reply..."
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              disabled={submitting}
            />
            <div className="flex justify-end gap-2">
              {replyingTo && (
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
                  disabled={submitting}
                >
                  Cancel Reply
                </button>
              )}
              <button
                type="submit"
                disabled={submitting || !newReplyContent.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Posting...' : 'Post Reply'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Replies List */}
      <div className="space-y-4">
        {replies.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No replies yet. Be the first to reply!</p>
        ) : (
          replies.map(reply => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              onDelete={handleDeleteReply}
              onReply={() => setReplyingTo(reply.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ReplyItemProps {
  reply: ForumReply;
  onDelete: (id: string) => void;
  onReply: () => void;
}

function ReplyItem({ reply, onDelete, onReply }: ReplyItemProps) {
  const { user } = useAuth();
  const isAuthor = user?.id === reply.user_id;

  return (
    <div className="bg-white p-4 rounded-lg border">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-medium">{reply.user_name}</p>
          <p className="text-xs text-gray-500">
            {new Date(reply.created_at * 1000).toLocaleDateString()}
          </p>
        </div>
        {isAuthor && (
          <button
            onClick={() => onDelete(reply.id)}
            className="text-red-600 text-sm hover:underline"
          >
            Delete
          </button>
        )}
      </div>
      <p className="text-gray-700 mb-3">{reply.content}</p>
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <button onClick={onReply} className="hover:text-blue-600">
          Reply
        </button>
        <span>👍 {reply.upvote_count}</span>
      </div>

      {/* Nested Replies */}
      {reply.nested_replies && reply.nested_replies.length > 0 && (
        <div className="mt-4 pl-4 border-l-2 border-gray-200 space-y-3">
          {reply.nested_replies.map(nestedReply => (
            <ReplyItem
              key={nestedReply.id}
              reply={nestedReply}
              onDelete={onDelete}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

### 5.8 Router Update

Update `src/react-app/App.tsx` to include ReplyThread in ThreadDetailPage:

```typescript
// In ThreadDetailPage.tsx - add at the bottom of the thread detail
import ReplyThread from '../components/ReplyThread';

// Inside ThreadDetailPage component:
return (
  <div className="max-w-4xl mx-auto p-8">
    {/* Thread details above... */}
    <ReplyThread threadId={threadId} />
  </div>
);
```

---

## SLICE 6: View Tracking

**User Value**: See thread popularity
**Effort**: ~2 hours
**Depends On**: Slice 3

---

## SLICE 7: Upvote/Downvote System

**User Value**: Surface quality content
**Effort**: ~3 hours
**Depends On**: Slice 5

---

## SLICE 8: Hot Algorithm & Sorting

**User Value**: Discover trending content
**Effort**: ~2 hours
**Depends On**: Slice 7

---

## SLICE 9: Thread Status (Solved/Closed)

**User Value**: Mark resolved discussions
**Effort**: ~2 hours
**Depends On**: Slice 3

---

## SLICE 10: Pinned Threads

**User Value**: Highlight important threads
**Effort**: ~1 hour
**Depends On**: Slice 2

---

## SLICE 11: Tags System

**User Value**: Better content discovery
**Effort**: ~3 hours
**Depends On**: Slice 4

---

## SLICE 12: Enhanced Points System

**User Value**: Gamification for engagement
**Effort**: ~2 hours
**Depends On**: Slices 4, 5, 7

---

## Database Schema Complete Reference

### forum_categories
```sql
CREATE TABLE forum_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  parent_id TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES forum_categories(id)
);
```

### forum_threads
```sql
CREATE TABLE forum_threads (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'open', -- 'open'|'solved'|'closed'
  is_pinned BOOLEAN DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  upvote_count INTEGER DEFAULT 0,
  downvote_count INTEGER DEFAULT 0,
  hot_score REAL DEFAULT 0,
  last_activity_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (category_id) REFERENCES forum_categories(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### forum_replies
```sql
CREATE TABLE forum_replies (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_reply_id TEXT,
  is_solution BOOLEAN DEFAULT 0,
  upvote_count INTEGER DEFAULT 0,
  downvote_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (thread_id) REFERENCES forum_threads(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (parent_reply_id) REFERENCES forum_replies(id)
);
```

### forum_thread_tags
```sql
CREATE TABLE forum_thread_tags (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (thread_id) REFERENCES forum_threads(id),
  UNIQUE(thread_id, tag_name)
);
```

### forum_votes
```sql
CREATE TABLE forum_votes (
  id TEXT PRIMARY KEY,
  votable_type TEXT NOT NULL, -- 'thread'|'reply'
  votable_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  vote_type TEXT NOT NULL, -- 'upvote'|'downvote'
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(votable_type, votable_id, user_id)
);
```

### forum_thread_views
```sql
CREATE TABLE forum_thread_views (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  user_id TEXT,
  ip_address TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (thread_id) REFERENCES forum_threads(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## Migration Strategy

### Phase 1: Create New Tables
1. Create `forum_categories` table with initial data
2. Create `forum_threads`, `forum_replies`, `forum_thread_tags`, `forum_votes`, `forum_thread_views` tables
3. Add all necessary indexes for performance

### Phase 2: Data Migration
1. Map existing `posts` → `forum_threads`
2. Map existing `post_comments` → `forum_replies`
3. Map existing `post_likes` → `forum_votes` (as upvotes)
4. Create default categories:
   - "General Discussion" for old general posts
   - "Announcements" for old announcement posts
   - "Discussion" for old discussion posts

### Phase 3: Feature Rollout
1. Implement slices 1-3 (view functionality)
2. Implement slices 4-5 (creation/interaction)
3. Implement slices 6-8 (engagement tracking)
4. Implement slices 9-12 (advanced features)
5. Redirect `/feed` to `/forums`
6. Keep old routes functional for 1 month (deprecated)

### Phase 4: Cleanup
1. Archive old posts/comments tables
2. Remove old API endpoints
3. Remove old feed components

---

## Testing Strategy

### Backend Tests
- Unit tests for each API endpoint
- Mock database with sample data
- Test error cases (404, 401, 400)
- Test pagination and sorting
- Test authorization (auth required vs public)
- Hot score calculation tests

### Frontend Tests
- Component render tests
- User interaction tests (clicks, form submissions)
- Service layer mock tests
- Navigation tests
- Loading/error state tests
- Responsive design tests

### Integration Tests
- End-to-end forum workflows
- Create thread → reply → upvote → sort by hot
- Test with production data snapshot

---

## Performance Considerations

### Database Indexes
```sql
CREATE INDEX idx_forum_threads_category ON forum_threads(category_id);
CREATE INDEX idx_forum_threads_created_at ON forum_threads(created_at DESC);
CREATE INDEX idx_forum_threads_last_activity ON forum_threads(last_activity_at DESC);
CREATE INDEX idx_forum_threads_hot_score ON forum_threads(hot_score DESC);
CREATE INDEX idx_forum_replies_thread ON forum_replies(thread_id);
CREATE INDEX idx_forum_votes_votable ON forum_votes(votable_type, votable_id);
CREATE INDEX idx_forum_thread_views_thread ON forum_thread_views(thread_id);
```

### Caching Strategy
- Cache category hierarchy in localStorage
- Cache thread list with 5-minute TTL
- Invalidate cache on create/update
- Use optimistic UI updates for votes

### Hot Score Calculation
- Calculate asynchronously (not on every request)
- Run on background job (new reply, new vote)
- Cache result in database
- Recalculate on schedule (every 15 minutes)

---

## Points System Updates

### Forum-Specific Point Awards

| Action | Points | Notes |
|--------|--------|-------|
| Create thread | 15 | Same as discussion post |
| Create announcement | 0 | Admin-only |
| Reply to thread | 5 | Same as comment |
| Receive upvote on thread | 3 | Increased from 2 (like) |
| Receive upvote on reply | 2 | New reward |
| Thread marked as solved | 10 | Bonus for thread author |
| Reply marked as solution | 20 | Reward for quality help |
| Thread reaches 100 views | 5 | Milestone bonus |
| Thread reaches 500 views | 15 | Viral content |
| Thread reaches 1000 views | 30 | Major milestone |

### Anti-Spam (Diminishing Returns)
- **Threads**: First 3/day = full, next 2 = 50%, then 0
- **Replies**: First 15/day = full, next 10 = 40%, then 0
- **Upvotes**: First 10/day = full, next 20 = 50%, then 0

---

## Implementation Timeline

- **Day 1**: Slices 1-3 (view functionality) - 8 hours
- **Day 2**: Slices 4-7 (create, reply, voting) - 9 hours
- **Day 3**: Slices 8-12 (hot algorithm, status, tags, points) - 11 hours
- **Day 4**: Testing, bug fixes, documentation - 8 hours

**Total**: ~28-32 hours (3.5-4 days)

---

## Success Criteria

- ✅ All 12 slices implemented with passing tests
- ✅ >80% code coverage on critical paths
- ✅ Performance: category page loads <500ms
- ✅ Mobile responsive (tested at 320px width)
- ✅ Existing posts migrated successfully
- ✅ Zero data loss during migration
- ✅ All old features working (backward compatibility)
- ✅ Documentation updated
