import { nanoid } from 'nanoid';

/**
 * Generate a short, URL-safe ID using nanoid
 * Format: 10-character alphanumeric string (e.g., "xT9m4pQ7nR")
 * Collision probability: ~1 in 1 trillion with default size
 */
export const generateId = (): string => {
  return nanoid(10);
};

/**
 * Generate a unique blog ID
 * Example: "xT9m4pQ7nR"
 */
export const generateBlogId = (): string => {
  return generateId();
};

/**
 * Generate a unique blog like ID
 * Example: "a1B2c3D4e5"
 */
export const generateBlogLikeId = (): string => {
  return generateId();
};

/**
 * Generate a unique blog comment ID
 * Example: "f6G7h8I9j0"
 */
export const generateBlogCommentId = (): string => {
  return generateId();
};

/**
 * Generate a unique forum thread ID
 * Example: "xT9m4pQ7nR"
 */
export const generateThreadId = (): string => {
  return generateId();
};

/**
 * Generate a unique forum reply ID
 * Example: "a1B2c3D4e5"
 */
export const generateReplyId = (): string => {
  return generateId();
};
