import { describe, it, expect } from 'vitest';
import { generateId, generateBlogId, generateBlogLikeId, generateBlogCommentId } from '../utils/idGenerator';

describe('ID Generator', () => {
  describe('generateId', () => {
    it('should generate a 10-character ID', () => {
      const id = generateId();
      expect(id).toHaveLength(10);
    });

    it('should generate URL-safe IDs (alphanumeric with - and _)', () => {
      const id = generateId();
      expect(id).toMatch(/^[a-zA-Z0-9_-]{10}$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set();
      const count = 1000;

      for (let i = 0; i < count; i++) {
        ids.add(generateId());
      }

      expect(ids.size).toBe(count);
    });

    it('should generate different IDs on consecutive calls', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateBlogId', () => {
    it('should generate a blog ID', () => {
      const id = generateBlogId();
      expect(id).toHaveLength(10);
    });

    it('should be URL-safe', () => {
      const id = generateBlogId();
      expect(id).toMatch(/^[a-zA-Z0-9_-]{10}$/);
    });
  });

  describe('generateBlogLikeId', () => {
    it('should generate a blog like ID', () => {
      const id = generateBlogLikeId();
      expect(id).toHaveLength(10);
    });

    it('should be URL-safe', () => {
      const id = generateBlogLikeId();
      expect(id).toMatch(/^[a-zA-Z0-9_-]{10}$/);
    });
  });

  describe('generateBlogCommentId', () => {
    it('should generate a blog comment ID', () => {
      const id = generateBlogCommentId();
      expect(id).toHaveLength(10);
    });

    it('should be URL-safe', () => {
      const id = generateBlogCommentId();
      expect(id).toMatch(/^[a-zA-Z0-9_-]{10}$/);
    });
  });
});
