/**
 * Forum-related type definitions
 */

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

export interface ForumThread {
  id: string;
  category_id: string;
  user_id: string;
  title: string;
  content: string;
  status: ThreadStatus;
  is_pinned: boolean | number;
  view_count: number;
  reply_count: number;
  upvote_count: number;
  downvote_count: number;
  hot_score: number;
  last_activity_at: number;
  created_at: number;
  updated_at: number;
}

export interface ForumThreadWithAuthor extends ForumThread {
  author_name: string;
  author_email: string;
}

export interface GetThreadsResponse {
  threads: ForumThreadWithAuthor[];
  total: number;
}

export interface GetThreadResponse {
  thread: ForumThreadWithAuthor;
}

export interface CreateThreadRequest {
  category_id: string;
  title: string;
  content: string;
}

export interface ForumReply {
  id: string;
  thread_id: string;
  user_id: string;
  content: string;
  parent_reply_id: string | null;
  is_solution: boolean;
  upvote_count: number;
  downvote_count: number;
  created_at: number;
  updated_at: number;
}

export interface ForumReplyWithAuthor extends ForumReply {
  author_name: string;
  author_email: string;
}

export interface ForumReplyWithNestedReplies extends ForumReplyWithAuthor {
  nested_replies?: ForumReplyWithAuthor[];
}

export interface GetRepliesResponse {
  replies: ForumReplyWithAuthor[];
  total: number;
}

export interface GetReplyResponse {
  reply: ForumReplyWithNestedReplies;
}

export interface CreateReplyRequest {
  content: string;
  parent_reply_id?: string;
}

export interface UpdateReplyRequest {
  content: string;
}

export interface ForumVote {
  id: string;
  votable_type: VotableType;
  votable_id: string;
  user_id: string;
  vote_type: VoteType;
  created_at: number;
}

export interface ForumThreadTag {
  id: string;
  thread_id: string;
  tag_name: string;
  created_at: number;
}

export enum ThreadStatus {
  Open = 'open',
  Solved = 'solved',
  Closed = 'closed',
}

export type VotableType = 'thread' | 'reply';
export type VoteType = 'upvote' | 'downvote';

/**
 * Helper functions
 */

export function getThreadStatusLabel(status: ThreadStatus): string {
  const labels: Record<ThreadStatus, string> = {
    [ThreadStatus.Open]: 'Open',
    [ThreadStatus.Solved]: 'Solved',
    [ThreadStatus.Closed]: 'Closed',
  };
  return labels[status];
}

export function getThreadStatusColor(status: ThreadStatus): string {
  const colors: Record<ThreadStatus, string> = {
    [ThreadStatus.Open]: 'bg-blue-100 text-blue-800',
    [ThreadStatus.Solved]: 'bg-green-100 text-green-800',
    [ThreadStatus.Closed]: 'bg-red-100 text-red-800',
  };
  return colors[status];
}

export function normalizeCategory(category: unknown): ForumCategory {
  const cat = category as Record<string, unknown>;
  return {
    id: cat.id as string,
    name: cat.name as string,
    slug: cat.slug as string,
    description: (cat.description as string | null) || null,
    parent_id: (cat.parent_id as string | null) || null,
    icon: (cat.icon as string | null) || null,
    display_order: Number(cat.display_order) || 0,
    thread_count: Number(cat.thread_count) || 0,
    created_at: Number(cat.created_at) || 0,
  };
}

export function normalizeThread(thread: unknown): ForumThread {
  const t = thread as Record<string, unknown>;
  return {
    id: t.id as string,
    category_id: t.category_id as string,
    user_id: t.user_id as string,
    title: t.title as string,
    content: t.content as string,
    status: (t.status as ThreadStatus) || ThreadStatus.Open,
    is_pinned: Boolean(t.is_pinned),
    view_count: Number(t.view_count) || 0,
    reply_count: Number(t.reply_count) || 0,
    upvote_count: Number(t.upvote_count) || 0,
    downvote_count: Number(t.downvote_count) || 0,
    hot_score: Number(t.hot_score) || 0,
    last_activity_at: Number(t.last_activity_at) || 0,
    created_at: Number(t.created_at) || 0,
    updated_at: Number(t.updated_at) || 0,
  };
}

export function normalizeReply(reply: unknown): ForumReply {
  const r = reply as Record<string, unknown>;
  return {
    id: r.id as string,
    thread_id: r.thread_id as string,
    user_id: r.user_id as string,
    content: r.content as string,
    parent_reply_id: (r.parent_reply_id as string | null) || null,
    is_solution: Boolean(r.is_solution),
    upvote_count: Number(r.upvote_count) || 0,
    downvote_count: Number(r.downvote_count) || 0,
    created_at: Number(r.created_at) || 0,
    updated_at: Number(r.updated_at) || 0,
  };
}
