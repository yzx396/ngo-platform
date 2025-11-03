import { describe, it, expect } from 'vitest';
import {
  buildCommentTree,
  normalizePostCommentWithAuthor,
  type PostCommentWithAuthor,
} from '../../types/post';

/**
 * Test suite for hierarchical comment system
 * Tests tree building logic, nesting depth, and edge cases
 */
describe('Hierarchical Comments System', () => {
  describe('buildCommentTree', () => {
    it('should build a flat list of root comments when all have no parent', () => {
      const comments: PostCommentWithAuthor[] = [
        {
          id: '1',
          post_id: 'post1',
          user_id: 'user1',
          content: 'First comment',
          parent_comment_id: null,
          created_at: 1000,
          updated_at: 1000,
          author_name: 'Alice',
        },
        {
          id: '2',
          post_id: 'post1',
          user_id: 'user2',
          content: 'Second comment',
          parent_comment_id: null,
          created_at: 2000,
          updated_at: 2000,
          author_name: 'Bob',
        },
      ];

      const tree = buildCommentTree(comments);

      expect(tree).toHaveLength(2);
      expect(tree[0].id).toBe('1');
      expect(tree[1].id).toBe('2');
      expect(tree[0].replies).toHaveLength(0);
      expect(tree[1].replies).toHaveLength(0);
    });

    it('should nest replies under their parent comment', () => {
      const comments: PostCommentWithAuthor[] = [
        {
          id: '1',
          post_id: 'post1',
          user_id: 'user1',
          content: 'Root comment',
          parent_comment_id: null,
          created_at: 1000,
          updated_at: 1000,
          author_name: 'Alice',
        },
        {
          id: '2',
          post_id: 'post1',
          user_id: 'user2',
          content: 'Reply to comment 1',
          parent_comment_id: '1',
          created_at: 2000,
          updated_at: 2000,
          author_name: 'Bob',
        },
        {
          id: '3',
          post_id: 'post1',
          user_id: 'user3',
          content: 'Another reply to comment 1',
          parent_comment_id: '1',
          created_at: 3000,
          updated_at: 3000,
          author_name: 'Charlie',
        },
      ];

      const tree = buildCommentTree(comments);

      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('1');
      expect(tree[0].replies).toHaveLength(2);
      expect(tree[0].replies![0].id).toBe('2');
      expect(tree[0].replies![1].id).toBe('3');
    });

    it('should handle multi-level nesting (up to max depth)', () => {
      const comments: PostCommentWithAuthor[] = [
        {
          id: '1',
          post_id: 'post1',
          user_id: 'user1',
          content: 'Level 1',
          parent_comment_id: null,
          created_at: 1000,
          updated_at: 1000,
          author_name: 'Alice',
        },
        {
          id: '2',
          post_id: 'post1',
          user_id: 'user2',
          content: 'Level 2 (reply to 1)',
          parent_comment_id: '1',
          created_at: 2000,
          updated_at: 2000,
          author_name: 'Bob',
        },
        {
          id: '3',
          post_id: 'post1',
          user_id: 'user3',
          content: 'Level 3 (reply to 2)',
          parent_comment_id: '2',
          created_at: 3000,
          updated_at: 3000,
          author_name: 'Charlie',
        },
        {
          id: '4',
          post_id: 'post1',
          user_id: 'user4',
          content: 'Level 4 (reply to 3)',
          parent_comment_id: '3',
          created_at: 4000,
          updated_at: 4000,
          author_name: 'David',
        },
        {
          id: '5',
          post_id: 'post1',
          user_id: 'user5',
          content: 'Level 5 (reply to 4)',
          parent_comment_id: '4',
          created_at: 5000,
          updated_at: 5000,
          author_name: 'Eve',
        },
      ];

      const tree = buildCommentTree(comments, 5);

      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('1');
      expect(tree[0].replies![0].id).toBe('2');
      expect(tree[0].replies![0].replies![0].id).toBe('3');
      expect(tree[0].replies![0].replies![0].replies![0].id).toBe('4');
      expect(tree[0].replies![0].replies![0].replies![0].replies![0].id).toBe('5');
    });

    it('should enforce max depth by flattening comments beyond the limit', () => {
      const comments: PostCommentWithAuthor[] = [
        {
          id: '1',
          post_id: 'post1',
          user_id: 'user1',
          content: 'Level 1',
          parent_comment_id: null,
          created_at: 1000,
          updated_at: 1000,
          author_name: 'Alice',
        },
        {
          id: '2',
          post_id: 'post1',
          user_id: 'user2',
          content: 'Level 2',
          parent_comment_id: '1',
          created_at: 2000,
          updated_at: 2000,
          author_name: 'Bob',
        },
        {
          id: '3',
          post_id: 'post1',
          user_id: 'user3',
          content: 'Level 3 (would exceed max of 2)',
          parent_comment_id: '2',
          created_at: 3000,
          updated_at: 3000,
          author_name: 'Charlie',
        },
      ];

      const tree = buildCommentTree(comments, 2);

      // Comment 3 should be flattened to root level since it exceeds max depth of 2
      expect(tree).toHaveLength(2);
      expect(tree[0].id).toBe('1');
      expect(tree[1].id).toBe('3'); // Flattened to root
      expect(tree[0].replies).toHaveLength(1);
      expect(tree[0].replies![0].id).toBe('2');
    });

    it('should handle orphaned comments (parent not found)', () => {
      const comments: PostCommentWithAuthor[] = [
        {
          id: '1',
          post_id: 'post1',
          user_id: 'user1',
          content: 'Root comment',
          parent_comment_id: null,
          created_at: 1000,
          updated_at: 1000,
          author_name: 'Alice',
        },
        {
          id: '2',
          post_id: 'post1',
          user_id: 'user2',
          content: 'Orphaned comment (parent does not exist)',
          parent_comment_id: 'non-existent-parent',
          created_at: 2000,
          updated_at: 2000,
          author_name: 'Bob',
        },
      ];

      const tree = buildCommentTree(comments);

      // Orphaned comment should be treated as a root comment
      expect(tree).toHaveLength(2);
      expect(tree[0].id).toBe('1');
      expect(tree[1].id).toBe('2');
    });

    it('should sort comments by creation time at each level', () => {
      const comments: PostCommentWithAuthor[] = [
        {
          id: '1',
          post_id: 'post1',
          user_id: 'user1',
          content: 'Root comment (latest)',
          parent_comment_id: null,
          created_at: 3000,
          updated_at: 3000,
          author_name: 'Alice',
        },
        {
          id: '2',
          post_id: 'post1',
          user_id: 'user2',
          content: 'Root comment (earliest)',
          parent_comment_id: null,
          created_at: 1000,
          updated_at: 1000,
          author_name: 'Bob',
        },
        {
          id: '3',
          post_id: 'post1',
          user_id: 'user3',
          content: 'Reply (latest)',
          parent_comment_id: '2',
          created_at: 3000,
          updated_at: 3000,
          author_name: 'Charlie',
        },
        {
          id: '4',
          post_id: 'post1',
          user_id: 'user4',
          content: 'Reply (earliest)',
          parent_comment_id: '2',
          created_at: 2000,
          updated_at: 2000,
          author_name: 'David',
        },
      ];

      const tree = buildCommentTree(comments);

      // Root comments should be sorted by creation time (ascending)
      expect(tree[0].id).toBe('2');
      expect(tree[1].id).toBe('1');

      // Replies should be sorted by creation time (ascending)
      expect(tree[0].replies![0].id).toBe('4');
      expect(tree[0].replies![1].id).toBe('3');
    });

    it('should handle empty comment list', () => {
      const comments: PostCommentWithAuthor[] = [];
      const tree = buildCommentTree(comments);

      expect(tree).toHaveLength(0);
    });

    it('should preserve comment metadata through tree building', () => {
      const comments: PostCommentWithAuthor[] = [
        {
          id: '1',
          post_id: 'post1',
          user_id: 'user1',
          content: 'Parent comment',
          parent_comment_id: null,
          created_at: 1000,
          updated_at: 2000,
          author_name: 'Alice',
          author_email: 'alice@example.com',
        },
        {
          id: '2',
          post_id: 'post1',
          user_id: 'user2',
          content: 'Child comment',
          parent_comment_id: '1',
          created_at: 3000,
          updated_at: 4000,
          author_name: 'Bob',
          author_email: 'bob@example.com',
        },
      ];

      const tree = buildCommentTree(comments);

      // Check parent metadata
      expect(tree[0].id).toBe('1');
      expect(tree[0].author_name).toBe('Alice');
      expect(tree[0].author_email).toBe('alice@example.com');
      expect(tree[0].updated_at).toBe(2000);

      // Check child metadata
      const child = tree[0].replies![0];
      expect(child.id).toBe('2');
      expect(child.author_name).toBe('Bob');
      expect(child.author_email).toBe('bob@example.com');
      expect(child.updated_at).toBe(4000);
      expect(child.parent_comment_id).toBe('1');
    });

    it('should create replies array for all comments (empty if no replies)', () => {
      const comments: PostCommentWithAuthor[] = [
        {
          id: '1',
          post_id: 'post1',
          user_id: 'user1',
          content: 'Comment',
          parent_comment_id: null,
          created_at: 1000,
          updated_at: 1000,
          author_name: 'Alice',
        },
      ];

      const tree = buildCommentTree(comments);

      expect(tree[0].replies).toBeDefined();
      expect(Array.isArray(tree[0].replies)).toBe(true);
      expect(tree[0].replies).toHaveLength(0);
    });

    it('should handle complex tree with multiple branches', () => {
      const comments: PostCommentWithAuthor[] = [
        {
          id: '1',
          post_id: 'post1',
          user_id: 'user1',
          content: 'Root 1',
          parent_comment_id: null,
          created_at: 1000,
          updated_at: 1000,
          author_name: 'Alice',
        },
        {
          id: '2',
          post_id: 'post1',
          user_id: 'user2',
          content: 'Root 2',
          parent_comment_id: null,
          created_at: 2000,
          updated_at: 2000,
          author_name: 'Bob',
        },
        {
          id: '3',
          post_id: 'post1',
          user_id: 'user3',
          content: 'Reply to Root 1',
          parent_comment_id: '1',
          created_at: 3000,
          updated_at: 3000,
          author_name: 'Charlie',
        },
        {
          id: '4',
          post_id: 'post1',
          user_id: 'user4',
          content: 'Reply to Root 2',
          parent_comment_id: '2',
          created_at: 4000,
          updated_at: 4000,
          author_name: 'David',
        },
        {
          id: '5',
          post_id: 'post1',
          user_id: 'user5',
          content: 'Reply to Reply of Root 1',
          parent_comment_id: '3',
          created_at: 5000,
          updated_at: 5000,
          author_name: 'Eve',
        },
      ];

      const tree = buildCommentTree(comments);

      expect(tree).toHaveLength(2);
      expect(tree[0].replies).toHaveLength(1);
      expect(tree[0].replies![0].replies).toHaveLength(1);
      expect(tree[1].replies).toHaveLength(1);
      expect(tree[1].replies![0].replies).toHaveLength(0);
    });
  });

  describe('normalizePostCommentWithAuthor', () => {
    it('should normalize a comment with author information', () => {
      const dbComment = {
        id: 'comment-1',
        post_id: 'post-1',
        user_id: 'user-1',
        content: 'Test comment',
        parent_comment_id: 'parent-1',
        created_at: 1000,
        updated_at: 2000,
      };

      const comment = normalizePostCommentWithAuthor(dbComment, 'Alice', 'alice@example.com');

      expect(comment.id).toBe('comment-1');
      expect(comment.content).toBe('Test comment');
      expect(comment.author_name).toBe('Alice');
      expect(comment.author_email).toBe('alice@example.com');
      expect(comment.parent_comment_id).toBe('parent-1');
    });

    it('should handle null parent_comment_id', () => {
      const dbComment = {
        id: 'comment-1',
        post_id: 'post-1',
        user_id: 'user-1',
        content: 'Root comment',
        parent_comment_id: null,
        created_at: 1000,
        updated_at: 1000,
      };

      const comment = normalizePostCommentWithAuthor(dbComment);

      expect(comment.parent_comment_id).toBeNull();
    });
  });
});
