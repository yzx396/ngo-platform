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

export interface BlogCommentWithReplies extends BlogCommentWithAuthor {
  replies?: BlogCommentWithReplies[]; // Nested replies (recursive structure)
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

/**
 * Build hierarchical comment tree from flat array
 * Converts flat array of comments into a nested tree structure
 * for displaying threaded comments with proper hierarchy
 *
 * @param comments - Flat array of comments from API response
 * @param maxDepth - Maximum nesting depth (default 5)
 * @returns Array of root comments with nested replies
 */
export function buildBlogCommentTree(
  comments: BlogCommentWithAuthor[],
  maxDepth: number = 5
): BlogCommentWithReplies[] {
  // Create a map of comments by ID for O(1) lookup
  const commentMap = new Map<string, BlogCommentWithReplies>();

  // Initialize all comments as potential root comments
  for (const comment of comments) {
    commentMap.set(comment.id, {
      ...comment,
      replies: [],
    });
  }

  // Root comments (no parent)
  const rootComments: BlogCommentWithReplies[] = [];

  // Build tree structure
  for (const comment of comments) {
    const treeComment = commentMap.get(comment.id)!;

    if (!comment.parent_comment_id) {
      // This is a root comment
      rootComments.push(treeComment);
    } else {
      // This is a reply - find parent and add as child
      const parent = commentMap.get(comment.parent_comment_id);
      if (parent) {
        // Calculate depth of parent comment
        const parentDepth = calculateBlogCommentDepth(comment.parent_comment_id, commentMap);
        // Child will be at parentDepth + 1
        const childDepth = parentDepth + 1;

        if (childDepth < maxDepth) {
          // Only add if child depth is within max depth
          parent.replies!.push(treeComment);
        } else {
          // If beyond max depth, treat as root (flatten)
          rootComments.push(treeComment);
        }
      } else {
        // Parent comment doesn't exist (orphaned comment) - treat as root
        rootComments.push(treeComment);
      }
    }
  }

  // Sort root comments by creation time
  rootComments.sort((a, b) => a.created_at - b.created_at);

  // Recursively sort replies
  const sortReplies = (comment: BlogCommentWithReplies) => {
    if (comment.replies && comment.replies.length > 0) {
      comment.replies.sort((a, b) => a.created_at - b.created_at);
      comment.replies.forEach(sortReplies);
    }
  };

  rootComments.forEach(sortReplies);

  return rootComments;
}

/**
 * Helper function to calculate the depth of a blog comment in the tree
 * Traverses up the parent chain to count nesting level
 *
 * @param commentId - ID of the comment to calculate depth for
 * @param commentMap - Map of all comments by ID
 * @returns Depth level (0 = root, 1 = first reply, etc.)
 */
function calculateBlogCommentDepth(
  commentId: string,
  commentMap: Map<string, BlogCommentWithReplies>
): number {
  const comment = commentMap.get(commentId);
  if (!comment || !comment.parent_comment_id) {
    return 0;
  }
  return 1 + calculateBlogCommentDepth(comment.parent_comment_id, commentMap);
}
