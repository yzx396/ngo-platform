import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiClientModule from '../apiClient';
import { forumService } from '../forumService';
import type {
  ForumCategory,
  ForumThreadWithAuthor,
  ForumReplyWithAuthor,
  ForumReplyWithNestedReplies,
  CreateThreadRequest,
  CreateReplyRequest,
  UpdateReplyRequest,
} from '../../../types/forum';

// Mock the apiClient module
vi.mock('../apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

describe('forumService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCategory: ForumCategory = {
    id: 'cat_123',
    name: 'General Discussion',
    description: 'General topics',
    parent_id: null,
    created_at: Date.now() - 86400000,
    updated_at: Date.now() - 86400000,
    thread_count: 10,
  };

  const mockThread: ForumThreadWithAuthor = {
    id: 'thread_123',
    title: 'Test Thread',
    content: 'Thread content',
    category_id: 'cat_123',
    user_id: 'user_123',
    created_at: Date.now(),
    updated_at: Date.now(),
    upvote_count: 5,
    downvote_count: 1,
    reply_count: 3,
    view_count: 100,
    author_name: 'Test User',
    user_vote: null,
    tags: ['tag1', 'tag2'],
  };

  const mockReply: ForumReplyWithAuthor = {
    id: 'reply_123',
    thread_id: 'thread_123',
    user_id: 'user_123',
    parent_reply_id: null,
    content: 'Reply content',
    created_at: Date.now(),
    updated_at: Date.now(),
    upvote_count: 2,
    downvote_count: 0,
    author_name: 'Test User',
    user_vote: null,
  };

  const mockNestedReply: ForumReplyWithNestedReplies = {
    ...mockReply,
    nested_replies: [],
  };

  describe('Categories', () => {
    describe('getCategories', () => {
      it('should fetch all categories without filter', async () => {
        const mockResponse = { categories: [mockCategory] };
        vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

        const result = await forumService.getCategories();

        expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/forums/categories');
        expect(result).toEqual([mockCategory]);
      });

      it('should fetch categories filtered by parent_id', async () => {
        const childCategory = { ...mockCategory, id: 'cat_child', parent_id: 'cat_123' };
        const mockResponse = { categories: [childCategory] };
        vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

        const result = await forumService.getCategories('cat_123');

        expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/forums/categories?parent_id=cat_123');
        expect(result).toEqual([childCategory]);
      });

      it('should handle empty category list', async () => {
        const mockResponse = { categories: [] };
        vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

        const result = await forumService.getCategories();

        expect(result).toEqual([]);
      });

      it('should throw error when API fails', async () => {
        const error = new Error('Network error');
        vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

        await expect(forumService.getCategories()).rejects.toThrow('Network error');
      });
    });

    describe('getCategory', () => {
      it('should fetch a single category by ID', async () => {
        const mockResponse = { category: mockCategory };
        vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

        const result = await forumService.getCategory('cat_123');

        expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/forums/categories/cat_123');
        expect(result).toEqual(mockCategory);
      });

      it('should URL encode category ID', async () => {
        const mockResponse = { category: mockCategory };
        vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

        await forumService.getCategory('cat/123');

        expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/forums/categories/cat%2F123');
      });

      it('should throw error when category not found', async () => {
        const error = new Error('Category not found');
        vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

        await expect(forumService.getCategory('invalid_id')).rejects.toThrow('Category not found');
      });
    });

    describe('getCategoryWithChildren', () => {
      it('should fetch subcategories for a parent', async () => {
        const childCategories = [
          { ...mockCategory, id: 'cat_child1', parent_id: 'cat_123' },
          { ...mockCategory, id: 'cat_child2', parent_id: 'cat_123' },
        ];
        const mockResponse = { categories: childCategories };
        vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

        const result = await forumService.getCategoryWithChildren('cat_123');

        expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/forums/categories?parent_id=cat_123');
        expect(result).toEqual(childCategories);
      });

      it('should return empty array when no children', async () => {
        const mockResponse = { categories: [] };
        vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

        const result = await forumService.getCategoryWithChildren('cat_123');

        expect(result).toEqual([]);
      });
    });

    describe('getAllCategories', () => {
      it('should fetch all categories including parents and children', async () => {
        const allCategories = [
          mockCategory,
          { ...mockCategory, id: 'cat_child', parent_id: 'cat_123' },
        ];
        const mockResponse = { categories: allCategories };
        vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

        const result = await forumService.getAllCategories();

        expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/forums/categories?include_all=true');
        expect(result).toEqual(allCategories);
      });

      it('should throw error when API fails', async () => {
        const error = new Error('Server error');
        vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

        await expect(forumService.getAllCategories()).rejects.toThrow('Server error');
      });
    });
  });

  describe('Threads', () => {
    describe('getThreads', () => {
      it('should fetch threads with default pagination', async () => {
        const mockResponse = { threads: [mockThread], total: 1 };
        vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

        const result = await forumService.getThreads('cat_123');

        expect(apiClientModule.apiGet).toHaveBeenCalledWith(
          '/api/v1/forums/threads?category_id=cat_123&limit=20&offset=0'
        );
        expect(result).toEqual(mockResponse);
      });

      it('should fetch threads with custom pagination', async () => {
        const mockResponse = { threads: [mockThread], total: 50 };
        vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

        const result = await forumService.getThreads('cat_123', 10, 20);

        expect(apiClientModule.apiGet).toHaveBeenCalledWith(
          '/api/v1/forums/threads?category_id=cat_123&limit=10&offset=20'
        );
        expect(result).toEqual(mockResponse);
      });

      it('should handle empty thread list', async () => {
        const mockResponse = { threads: [], total: 0 };
        vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

        const result = await forumService.getThreads('cat_123');

        expect(result).toEqual(mockResponse);
      });

      it('should throw error when category not found', async () => {
        const error = new Error('Category not found');
        vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

        await expect(forumService.getThreads('invalid_id')).rejects.toThrow('Category not found');
      });
    });

    describe('getThread', () => {
      it('should fetch a single thread by ID', async () => {
        const mockResponse = { thread: mockThread };
        vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

        const result = await forumService.getThread('thread_123');

        expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/forums/threads/thread_123');
        expect(result).toEqual(mockThread);
      });

      it('should URL encode thread ID', async () => {
        const mockResponse = { thread: mockThread };
        vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

        await forumService.getThread('thread/123');

        expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/forums/threads/thread%2F123');
      });

      it('should throw error when thread not found', async () => {
        const error = new Error('Thread not found');
        vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

        await expect(forumService.getThread('invalid_id')).rejects.toThrow('Thread not found');
      });
    });
  });

  describe('Replies', () => {
    describe('getReplies', () => {
      it('should fetch replies with default pagination', async () => {
        const mockResponse = { replies: [mockReply], total: 1 };
        vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

        const result = await forumService.getReplies('thread_123');

        expect(apiClientModule.apiGet).toHaveBeenCalledWith(
          '/api/v1/forums/threads/thread_123/replies?limit=50&offset=0'
        );
        expect(result).toEqual(mockResponse);
      });

      it('should fetch replies with custom pagination', async () => {
        const mockResponse = { replies: [mockReply], total: 100 };
        vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

        const result = await forumService.getReplies('thread_123', 25, 50);

        expect(apiClientModule.apiGet).toHaveBeenCalledWith(
          '/api/v1/forums/threads/thread_123/replies?limit=25&offset=50'
        );
        expect(result).toEqual(mockResponse);
      });

      it('should handle empty reply list', async () => {
        const mockResponse = { replies: [], total: 0 };
        vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

        const result = await forumService.getReplies('thread_123');

        expect(result).toEqual(mockResponse);
      });

      it('should throw error when thread not found', async () => {
        const error = new Error('Thread not found');
        vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

        await expect(forumService.getReplies('invalid_id')).rejects.toThrow('Thread not found');
      });
    });

    describe('getReply', () => {
      it('should fetch a single reply with nested replies', async () => {
        const mockResponse = { reply: mockNestedReply };
        vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

        const result = await forumService.getReply('reply_123');

        expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/forums/replies/reply_123');
        expect(result).toEqual(mockNestedReply);
      });

      it('should URL encode reply ID', async () => {
        const mockResponse = { reply: mockNestedReply };
        vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

        await forumService.getReply('reply/123');

        expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/forums/replies/reply%2F123');
      });

      it('should throw error when reply not found', async () => {
        const error = new Error('Reply not found');
        vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

        await expect(forumService.getReply('invalid_id')).rejects.toThrow('Reply not found');
      });
    });

    describe('createReply', () => {
      it('should create a new reply successfully', async () => {
        const replyData: CreateReplyRequest = {
          content: 'New reply content',
          parent_reply_id: null,
        };
        const mockResponse = { reply: mockReply };
        vi.mocked(apiClientModule.apiPost).mockResolvedValue(mockResponse);

        const result = await forumService.createReply('thread_123', replyData);

        expect(apiClientModule.apiPost).toHaveBeenCalledWith(
          '/api/v1/forums/threads/thread_123/replies',
          replyData
        );
        expect(result).toEqual(mockReply);
      });

      it('should create a nested reply with parent_reply_id', async () => {
        const nestedReplyData: CreateReplyRequest = {
          content: 'Nested reply',
          parent_reply_id: 'reply_123',
        };
        const nestedReply = { ...mockReply, parent_reply_id: 'reply_123' };
        const mockResponse = { reply: nestedReply };
        vi.mocked(apiClientModule.apiPost).mockResolvedValue(mockResponse);

        const result = await forumService.createReply('thread_123', nestedReplyData);

        expect(result.parent_reply_id).toBe('reply_123');
      });

      it('should throw error when thread not found', async () => {
        const replyData: CreateReplyRequest = { content: 'Reply', parent_reply_id: null };
        const error = new Error('Thread not found');
        vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

        await expect(forumService.createReply('invalid_id', replyData)).rejects.toThrow('Thread not found');
      });

      it('should throw error when unauthorized', async () => {
        const replyData: CreateReplyRequest = { content: 'Reply', parent_reply_id: null };
        const error = new Error('Unauthorized');
        vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

        await expect(forumService.createReply('thread_123', replyData)).rejects.toThrow('Unauthorized');
      });
    });

    describe('updateReply', () => {
      it('should update a reply successfully', async () => {
        const updateData: UpdateReplyRequest = { content: 'Updated content' };
        const updatedReply = { ...mockReply, content: 'Updated content' };
        const mockResponse = { reply: updatedReply };
        vi.mocked(apiClientModule.apiPut).mockResolvedValue(mockResponse);

        const result = await forumService.updateReply('reply_123', updateData);

        expect(apiClientModule.apiPut).toHaveBeenCalledWith(
          '/api/v1/forums/replies/reply_123',
          updateData
        );
        expect(result.content).toBe('Updated content');
      });

      it('should throw error when reply not found', async () => {
        const updateData: UpdateReplyRequest = { content: 'Updated' };
        const error = new Error('Reply not found');
        vi.mocked(apiClientModule.apiPut).mockRejectedValue(error);

        await expect(forumService.updateReply('invalid_id', updateData)).rejects.toThrow('Reply not found');
      });

      it('should throw error when unauthorized', async () => {
        const updateData: UpdateReplyRequest = { content: 'Updated' };
        const error = new Error('Unauthorized');
        vi.mocked(apiClientModule.apiPut).mockRejectedValue(error);

        await expect(forumService.updateReply('reply_123', updateData)).rejects.toThrow('Unauthorized');
      });
    });

    describe('deleteReply', () => {
      it('should delete a reply successfully', async () => {
        vi.mocked(apiClientModule.apiDelete).mockResolvedValue(undefined);

        await forumService.deleteReply('reply_123');

        expect(apiClientModule.apiDelete).toHaveBeenCalledWith('/api/v1/forums/replies/reply_123');
      });

      it('should throw error when reply not found', async () => {
        const error = new Error('Reply not found');
        vi.mocked(apiClientModule.apiDelete).mockRejectedValue(error);

        await expect(forumService.deleteReply('invalid_id')).rejects.toThrow('Reply not found');
      });

      it('should throw error when unauthorized', async () => {
        const error = new Error('Unauthorized');
        vi.mocked(apiClientModule.apiDelete).mockRejectedValue(error);

        await expect(forumService.deleteReply('reply_123')).rejects.toThrow('Unauthorized');
      });
    });
  });

  describe('Create Thread', () => {
    describe('createThread', () => {
      it('should create a new thread successfully', async () => {
        const threadData: CreateThreadRequest = {
          title: 'New Thread',
          content: 'Thread content',
          category_id: 'cat_123',
          tags: ['tag1', 'tag2'],
        };
        const mockResponse = { thread: mockThread, message: 'Thread created' };
        vi.mocked(apiClientModule.apiPost).mockResolvedValue(mockResponse);

        const result = await forumService.createThread(threadData);

        expect(apiClientModule.apiPost).toHaveBeenCalledWith('/api/v1/forums/threads', threadData);
        expect(result).toEqual(mockThread);
      });

      it('should create thread without tags', async () => {
        const threadData: CreateThreadRequest = {
          title: 'New Thread',
          content: 'Thread content',
          category_id: 'cat_123',
          tags: [],
        };
        const mockResponse = { thread: { ...mockThread, tags: [] }, message: 'Thread created' };
        vi.mocked(apiClientModule.apiPost).mockResolvedValue(mockResponse);

        const result = await forumService.createThread(threadData);

        expect(result.tags).toEqual([]);
      });

      it('should throw error when category not found', async () => {
        const threadData: CreateThreadRequest = {
          title: 'New Thread',
          content: 'Content',
          category_id: 'invalid_cat',
          tags: [],
        };
        const error = new Error('Category not found');
        vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

        await expect(forumService.createThread(threadData)).rejects.toThrow('Category not found');
      });

      it('should throw error when unauthorized', async () => {
        const threadData: CreateThreadRequest = {
          title: 'New Thread',
          content: 'Content',
          category_id: 'cat_123',
          tags: [],
        };
        const error = new Error('Unauthorized');
        vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

        await expect(forumService.createThread(threadData)).rejects.toThrow('Unauthorized');
      });

      it('should throw error on validation failure', async () => {
        const threadData: CreateThreadRequest = {
          title: '',
          content: '',
          category_id: '',
          tags: [],
        };
        const error = new Error('Validation failed');
        vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

        await expect(forumService.createThread(threadData)).rejects.toThrow('Validation failed');
      });
    });
  });

  describe('View Tracking', () => {
    describe('trackView', () => {
      it('should track a new view', async () => {
        const mockResponse = { view_count: 101, new_view: true };
        vi.mocked(apiClientModule.apiPost).mockResolvedValue(mockResponse);

        const result = await forumService.trackView('thread_123');

        expect(apiClientModule.apiPost).toHaveBeenCalledWith(
          '/api/v1/forums/threads/thread_123/view',
          {}
        );
        expect(result).toEqual(mockResponse);
      });

      it('should track a repeat view', async () => {
        const mockResponse = { view_count: 100, new_view: false };
        vi.mocked(apiClientModule.apiPost).mockResolvedValue(mockResponse);

        const result = await forumService.trackView('thread_123');

        expect(result.new_view).toBe(false);
      });

      it('should throw error when thread not found', async () => {
        const error = new Error('Thread not found');
        vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

        await expect(forumService.trackView('invalid_id')).rejects.toThrow('Thread not found');
      });
    });

    describe('getViewStats', () => {
      it('should fetch view statistics', async () => {
        const mockResponse = { total_views: 150, unique_views: 75 };
        vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

        const result = await forumService.getViewStats('thread_123');

        expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/forums/threads/thread_123/views');
        expect(result).toEqual(mockResponse);
      });

      it('should throw error when thread not found', async () => {
        const error = new Error('Thread not found');
        vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

        await expect(forumService.getViewStats('invalid_id')).rejects.toThrow('Thread not found');
      });
    });
  });

  describe('Voting', () => {
    describe('voteOnThread', () => {
      it('should upvote a thread', async () => {
        const mockResponse = { upvote_count: 6, downvote_count: 1, user_vote: 'upvote' };
        vi.mocked(apiClientModule.apiPost).mockResolvedValue(mockResponse);

        const result = await forumService.voteOnThread('thread_123', 'upvote');

        expect(apiClientModule.apiPost).toHaveBeenCalledWith(
          '/api/v1/forums/threads/thread_123/vote',
          { vote_type: 'upvote' }
        );
        expect(result).toEqual(mockResponse);
      });

      it('should downvote a thread', async () => {
        const mockResponse = { upvote_count: 5, downvote_count: 2, user_vote: 'downvote' };
        vi.mocked(apiClientModule.apiPost).mockResolvedValue(mockResponse);

        const result = await forumService.voteOnThread('thread_123', 'downvote');

        expect(apiClientModule.apiPost).toHaveBeenCalledWith(
          '/api/v1/forums/threads/thread_123/vote',
          { vote_type: 'downvote' }
        );
        expect(result.user_vote).toBe('downvote');
      });

      it('should remove vote by voting again', async () => {
        const mockResponse = { upvote_count: 5, downvote_count: 1, user_vote: null };
        vi.mocked(apiClientModule.apiPost).mockResolvedValue(mockResponse);

        const result = await forumService.voteOnThread('thread_123', 'upvote');

        expect(result.user_vote).toBeNull();
      });

      it('should throw error when thread not found', async () => {
        const error = new Error('Thread not found');
        vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

        await expect(forumService.voteOnThread('invalid_id', 'upvote')).rejects.toThrow('Thread not found');
      });

      it('should throw error when unauthorized', async () => {
        const error = new Error('Unauthorized');
        vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

        await expect(forumService.voteOnThread('thread_123', 'upvote')).rejects.toThrow('Unauthorized');
      });
    });

    describe('getThreadVote', () => {
      it('should fetch user vote on thread', async () => {
        const mockResponse = { user_vote: 'upvote' };
        vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

        const result = await forumService.getThreadVote('thread_123');

        expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/forums/threads/thread_123/vote');
        expect(result).toEqual(mockResponse);
      });

      it('should return null when user has not voted', async () => {
        const mockResponse = { user_vote: null };
        vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

        const result = await forumService.getThreadVote('thread_123');

        expect(result.user_vote).toBeNull();
      });

      it('should throw error when thread not found', async () => {
        const error = new Error('Thread not found');
        vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

        await expect(forumService.getThreadVote('invalid_id')).rejects.toThrow('Thread not found');
      });
    });

    describe('voteOnReply', () => {
      it('should upvote a reply', async () => {
        const mockResponse = { upvote_count: 3, downvote_count: 0, user_vote: 'upvote' };
        vi.mocked(apiClientModule.apiPost).mockResolvedValue(mockResponse);

        const result = await forumService.voteOnReply('reply_123', 'upvote');

        expect(apiClientModule.apiPost).toHaveBeenCalledWith(
          '/api/v1/forums/replies/reply_123/vote',
          { vote_type: 'upvote' }
        );
        expect(result).toEqual(mockResponse);
      });

      it('should downvote a reply', async () => {
        const mockResponse = { upvote_count: 2, downvote_count: 1, user_vote: 'downvote' };
        vi.mocked(apiClientModule.apiPost).mockResolvedValue(mockResponse);

        const result = await forumService.voteOnReply('reply_123', 'downvote');

        expect(apiClientModule.apiPost).toHaveBeenCalledWith(
          '/api/v1/forums/replies/reply_123/vote',
          { vote_type: 'downvote' }
        );
        expect(result.user_vote).toBe('downvote');
      });

      it('should throw error when reply not found', async () => {
        const error = new Error('Reply not found');
        vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

        await expect(forumService.voteOnReply('invalid_id', 'upvote')).rejects.toThrow('Reply not found');
      });

      it('should throw error when unauthorized', async () => {
        const error = new Error('Unauthorized');
        vi.mocked(apiClientModule.apiPost).mockRejectedValue(error);

        await expect(forumService.voteOnReply('reply_123', 'upvote')).rejects.toThrow('Unauthorized');
      });
    });

    describe('getReplyVote', () => {
      it('should fetch user vote on reply', async () => {
        const mockResponse = { user_vote: 'downvote' };
        vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

        const result = await forumService.getReplyVote('reply_123');

        expect(apiClientModule.apiGet).toHaveBeenCalledWith('/api/v1/forums/replies/reply_123/vote');
        expect(result).toEqual(mockResponse);
      });

      it('should return null when user has not voted', async () => {
        const mockResponse = { user_vote: null };
        vi.mocked(apiClientModule.apiGet).mockResolvedValue(mockResponse);

        const result = await forumService.getReplyVote('reply_123');

        expect(result.user_vote).toBeNull();
      });

      it('should throw error when reply not found', async () => {
        const error = new Error('Reply not found');
        vi.mocked(apiClientModule.apiGet).mockRejectedValue(error);

        await expect(forumService.getReplyVote('invalid_id')).rejects.toThrow('Reply not found');
      });
    });
  });
});
