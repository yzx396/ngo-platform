import { describe, it, expect, vi } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import { normalizePost, getPostTypeName, formatPostTime } from '../../types/post';

// Mock database helper
function createMockDb(): D1Database {
  return {
    prepare: vi.fn(() => ({
      bind: vi.fn().mockReturnThis(),
      all: vi.fn(() => ({ success: true, results: [] })),
      first: vi.fn(() => null),
      run: vi.fn(() => ({ success: true })),
    })),
  } as unknown as D1Database;
}

describe('Posts System', () => {
  describe('Type Normalization', () => {
    it('should normalize post from database', () => {
      const dbPost = {
        id: 'post-123',
        user_id: 'user-456',
        content: 'Hello world',
        post_type: 'general',
        likes_count: 5,
        comments_count: 2,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
      };

      const normalized = normalizePost(dbPost);

      expect(normalized.id).toBe('post-123');
      expect(normalized.user_id).toBe('user-456');
      expect(normalized.content).toBe('Hello world');
      expect(normalized.post_type).toBe('general');
      expect(normalized.likes_count).toBe(5);
      expect(normalized.comments_count).toBe(2);
    });

    it('should handle announcement post type', () => {
      const dbPost = {
        id: 'post-123',
        user_id: 'user-456',
        content: 'Official announcement',
        post_type: 'announcement',
        likes_count: 0,
        comments_count: 0,
        created_at: 1234567890,
        updated_at: 1234567890,
      };

      const normalized = normalizePost(dbPost);

      expect(normalized.post_type).toBe('announcement');
    });

    it('should handle discussion post type', () => {
      const dbPost = {
        id: 'post-123',
        user_id: 'user-456',
        content: 'Let\'s discuss',
        post_type: 'discussion',
        likes_count: 0,
        comments_count: 0,
        created_at: 1234567890,
        updated_at: 1234567890,
      };

      const normalized = normalizePost(dbPost);

      expect(normalized.post_type).toBe('discussion');
    });

    it('should default to general post type for invalid types', () => {
      const dbPost = {
        id: 'post-123',
        user_id: 'user-456',
        content: 'Invalid type',
        post_type: 'invalid_type',
        likes_count: 0,
        comments_count: 0,
        created_at: 1234567890,
        updated_at: 1234567890,
      };

      const normalized = normalizePost(dbPost);

      expect(normalized.post_type).toBe('general');
    });

    it('should handle zero counts', () => {
      const dbPost = {
        id: 'post-123',
        user_id: 'user-456',
        content: 'New post',
        post_type: 'general',
        likes_count: 0,
        comments_count: 0,
        created_at: 1234567890,
        updated_at: 1234567890,
      };

      const normalized = normalizePost(dbPost);

      expect(normalized.likes_count).toBe(0);
      expect(normalized.comments_count).toBe(0);
    });

    it('should handle missing fields', () => {
      const dbPost: Record<string, unknown> = {
        id: 'post-123',
      };

      const normalized = normalizePost(dbPost);

      expect(normalized.id).toBe('post-123');
      expect(normalized.user_id).toBe('');
      expect(normalized.content).toBe('');
      expect(normalized.post_type).toBe('general');
      expect(normalized.likes_count).toBe(0);
      expect(normalized.comments_count).toBe(0);
    });
  });

  describe('Post Type Names', () => {
    it('should return correct name for announcement', () => {
      expect(getPostTypeName('announcement')).toBe('Announcement');
    });

    it('should return correct name for discussion', () => {
      expect(getPostTypeName('discussion')).toBe('Discussion');
    });

    it('should return correct name for general', () => {
      expect(getPostTypeName('general')).toBe('General');
    });

    it('should return Unknown for invalid type', () => {
      expect(getPostTypeName('invalid' as PostType)).toBe('Unknown');
    });
  });

  describe('Post Time Formatting', () => {
    it('should format time as "just now" for recent posts', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(formatPostTime(now)).toBe('just now');
    });

    it('should format time as minutes ago', () => {
      const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;
      const result = formatPostTime(fiveMinutesAgo);
      expect(result).toMatch(/^\d+m ago$/);
    });

    it('should format time as hours ago', () => {
      const twoHoursAgo = Math.floor(Date.now() / 1000) - 7200;
      const result = formatPostTime(twoHoursAgo);
      expect(result).toMatch(/^\d+h ago$/);
    });

    it('should format time as days ago', () => {
      const threeDaysAgo = Math.floor(Date.now() / 1000) - 259200;
      const result = formatPostTime(threeDaysAgo);
      expect(result).toMatch(/^\d+d ago$/);
    });

    it('should format time as date for old posts', () => {
      const twoWeeksAgo = Math.floor(Date.now() / 1000) - 1209600;
      const result = formatPostTime(twoWeeksAgo);
      // Should be a date string, not relative
      expect(result).not.toMatch(/ago$/);
    });
  });

  describe('Database Mock', () => {
    it('should create mock database', () => {
      const mockDb = createMockDb();
      expect(mockDb).toBeDefined();
      expect(mockDb.prepare).toBeDefined();
    });

    it('should handle mock queries', () => {
      const mockDb = createMockDb();
      const result = mockDb.prepare('SELECT * FROM posts').all();
      expect(result).toEqual({ success: true, results: [] });
    });
  });
});
