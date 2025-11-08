// Blog types

export interface Blog {
  id: string;
  user_id: string;
  title: string;
  content: string;
  featured: boolean;
  likes_count: number;
  comments_count: number;
  created_at: number; // Unix timestamp
  updated_at: number; // Unix timestamp
}

export interface BlogWithAuthor extends Blog {
  author_name: string;
  author_email: string;
}

export interface BlogWithLikeStatus extends BlogWithAuthor {
  liked_by_user: boolean;
}

export interface BlogLike {
  id: string;
  blog_id: string;
  user_id: string;
  created_at: number;
}

export interface BlogComment {
  id: string;
  blog_id: string;
  user_id: string;
  content: string;
  parent_comment_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface BlogCommentWithAuthor extends BlogComment {
  author_name: string;
  author_email: string;
}

/**
 * Normalize blog from database result
 * SQLite stores booleans as INTEGER (0 or 1)
 */
export function normalizeBlog(blog: unknown): Blog {
  const dbBlog = blog as Record<string, unknown>;
  return {
    id: String(dbBlog.id),
    user_id: String(dbBlog.user_id),
    title: String(dbBlog.title),
    content: String(dbBlog.content),
    featured: Boolean(dbBlog.featured),
    likes_count: Number(dbBlog.likes_count) || 0,
    comments_count: Number(dbBlog.comments_count) || 0,
    created_at: Number(dbBlog.created_at),
    updated_at: Number(dbBlog.updated_at),
  };
}

/**
 * Normalize blog with author from database result
 */
export function normalizeBlogWithAuthor(blog: unknown): BlogWithAuthor {
  const dbBlog = blog as Record<string, unknown>;
  return {
    ...normalizeBlog(blog),
    author_name: String(dbBlog.author_name),
    author_email: String(dbBlog.author_email),
  };
}

/**
 * Normalize blog like from database result
 */
export function normalizeBlogLike(like: unknown): BlogLike {
  const dbLike = like as Record<string, unknown>;
  return {
    id: String(dbLike.id),
    blog_id: String(dbLike.blog_id),
    user_id: String(dbLike.user_id),
    created_at: Number(dbLike.created_at),
  };
}

/**
 * Normalize blog comment from database result
 */
export function normalizeBlogComment(comment: unknown): BlogComment {
  const dbComment = comment as Record<string, unknown>;
  return {
    id: String(dbComment.id),
    blog_id: String(dbComment.blog_id),
    user_id: String(dbComment.user_id),
    content: String(dbComment.content),
    parent_comment_id: dbComment.parent_comment_id ? String(dbComment.parent_comment_id) : null,
    created_at: Number(dbComment.created_at),
    updated_at: Number(dbComment.updated_at),
  };
}

/**
 * Normalize blog comment with author from database result
 */
export function normalizeBlogCommentWithAuthor(comment: unknown): BlogCommentWithAuthor {
  const dbComment = comment as Record<string, unknown>;
  return {
    ...normalizeBlogComment(comment),
    author_name: String(dbComment.author_name),
    author_email: String(dbComment.author_email),
  };
}
