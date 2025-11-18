/**
 * Forum service layer for API interactions
 * All forum-related API calls go through this service
 */

import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import { ForumCategory, ForumThreadWithAuthor, GetThreadsResponse, GetThreadResponse, ForumReplyWithAuthor, CreateThreadRequest, CreateReplyRequest, UpdateReplyRequest, ForumReplyWithNestedReplies, GetReplyResponse } from '../../types/forum';

interface CategoriesResponse {
  categories: ForumCategory[];
}

interface CategoryResponse {
  category: ForumCategory;
}

interface GetRepliesResponse {
  replies: ForumReplyWithAuthor[];
  total: number;
}

interface CreateThreadResponse {
  thread: ForumThreadWithAuthor;
  message: string;
}

export const forumService = {
  // ============================================================================
  // Categories
  // ============================================================================

  /**
   * Get all top-level or child categories
   * @param parentId - Optional parent category ID to filter by
   */
  async getCategories(parentId?: string): Promise<ForumCategory[]> {
    const params = parentId ? `?parent_id=${encodeURIComponent(parentId)}` : '';
    const response = await apiGet<CategoriesResponse>(
      `/api/v1/forums/categories${params}`
    );
    return response.categories;
  },

  /**
   * Get a single category
   * @param id - Category ID
   */
  async getCategory(id: string): Promise<ForumCategory> {
    const response = await apiGet<CategoryResponse>(
      `/api/v1/forums/categories/${encodeURIComponent(id)}`
    );
    return response.category;
  },

  /**
   * Get subcategories for a parent
   * @param parentId - Parent category ID
   */
  async getCategoryWithChildren(parentId: string): Promise<ForumCategory[]> {
    return this.getCategories(parentId);
  },

  // ============================================================================
  // Threads
  // ============================================================================

  /**
   * Get threads in a category
   * @param categoryId - Category ID
   * @param limit - Number of threads per page (default 20)
   * @param offset - Pagination offset (default 0)
   */
  async getThreads(categoryId: string, limit: number = 20, offset: number = 0): Promise<GetThreadsResponse> {
    const params = new URLSearchParams({
      category_id: categoryId,
      limit: limit.toString(),
      offset: offset.toString(),
    });
    return apiGet<GetThreadsResponse>(
      `/api/v1/forums/threads?${params.toString()}`
    );
  },

  /**
   * Get a single thread
   * @param id - Thread ID
   */
  async getThread(id: string): Promise<ForumThreadWithAuthor> {
    const response = await apiGet<GetThreadResponse>(
      `/api/v1/forums/threads/${encodeURIComponent(id)}`
    );
    return response.thread;
  },

  // ============================================================================
  // Replies
  // ============================================================================

  /**
   * Get replies for a thread
   * @param threadId - Thread ID
   * @param limit - Number of replies per page (default 50)
   * @param offset - Pagination offset (default 0)
   */
  async getReplies(threadId: string, limit: number = 50, offset: number = 0): Promise<GetRepliesResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    return apiGet<GetRepliesResponse>(
      `/api/v1/forums/threads/${encodeURIComponent(threadId)}/replies?${params.toString()}`
    );
  },

  /**
   * Get a single reply with nested replies
   * @param replyId - Reply ID
   */
  async getReply(replyId: string): Promise<ForumReplyWithNestedReplies> {
    const response = await apiGet<GetReplyResponse>(
      `/api/v1/forums/replies/${encodeURIComponent(replyId)}`
    );
    return response.reply;
  },

  /**
   * Create a new reply
   * @param threadId - Thread ID
   * @param data - Reply creation data
   */
  async createReply(threadId: string, data: CreateReplyRequest): Promise<ForumReplyWithAuthor> {
    interface CreateReplyResponse {
      reply: ForumReplyWithAuthor;
    }
    const response = await apiPost<CreateReplyResponse>(
      `/api/v1/forums/threads/${encodeURIComponent(threadId)}/replies`,
      data
    );
    return response.reply;
  },

  /**
   * Update a reply
   * @param replyId - Reply ID
   * @param data - Reply update data
   */
  async updateReply(replyId: string, data: UpdateReplyRequest): Promise<ForumReplyWithAuthor> {
    interface UpdateReplyResponse {
      reply: ForumReplyWithAuthor;
    }
    const response = await apiPut<UpdateReplyResponse>(
      `/api/v1/forums/replies/${encodeURIComponent(replyId)}`,
      data
    );
    return response.reply;
  },

  /**
   * Delete a reply
   * @param replyId - Reply ID
   */
  async deleteReply(replyId: string): Promise<void> {
    await apiDelete(`/api/v1/forums/replies/${encodeURIComponent(replyId)}`);
  },

  // ============================================================================
  // Create Thread
  // ============================================================================

  /**
   * Create a new thread
   * @param data - Thread creation data
   */
  async createThread(data: CreateThreadRequest): Promise<ForumThreadWithAuthor> {
    const response = await apiPost<CreateThreadResponse>('/api/v1/forums/threads', data);
    return response.thread;
  },

  // ============================================================================
  // View Tracking
  // ============================================================================

  /**
   * Track a view for a thread
   * @param threadId - Thread ID
   */
  async trackView(threadId: string): Promise<{ view_count: number; new_view: boolean }> {
    return apiPost<{ view_count: number; new_view: boolean }>(
      `/api/v1/forums/threads/${encodeURIComponent(threadId)}/view`,
      {}
    );
  },

  /**
   * Get view statistics for a thread
   * @param threadId - Thread ID
   */
  async getViewStats(threadId: string): Promise<{ total_views: number; unique_views: number }> {
    return apiGet<{ total_views: number; unique_views: number }>(
      `/api/v1/forums/threads/${encodeURIComponent(threadId)}/views`
    );
  },

  // ============================================================================
  // Voting
  // ============================================================================

  /**
   * Vote on a thread
   * @param threadId - Thread ID
   * @param voteType - 'upvote' or 'downvote'
   */
  async voteOnThread(
    threadId: string,
    voteType: 'upvote' | 'downvote'
  ): Promise<{ upvote_count: number; downvote_count: number; user_vote: string | null }> {
    return apiPost(
      `/api/v1/forums/threads/${encodeURIComponent(threadId)}/vote`,
      { vote_type: voteType }
    );
  },

  /**
   * Get user's vote on a thread
   * @param threadId - Thread ID
   */
  async getThreadVote(threadId: string): Promise<{ user_vote: string | null }> {
    return apiGet(`/api/v1/forums/threads/${encodeURIComponent(threadId)}/vote`);
  },

  /**
   * Vote on a reply
   * @param replyId - Reply ID
   * @param voteType - 'upvote' or 'downvote'
   */
  async voteOnReply(
    replyId: string,
    voteType: 'upvote' | 'downvote'
  ): Promise<{ upvote_count: number; downvote_count: number; user_vote: string | null }> {
    return apiPost(
      `/api/v1/forums/replies/${encodeURIComponent(replyId)}/vote`,
      { vote_type: voteType }
    );
  },

  /**
   * Get user's vote on a reply
   * @param replyId - Reply ID
   */
  async getReplyVote(replyId: string): Promise<{ user_vote: string | null }> {
    return apiGet(`/api/v1/forums/replies/${encodeURIComponent(replyId)}/vote`);
  },
};
