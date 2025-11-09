import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { getBlogComments } from '../services/blogService';
import { handleApiError } from '../services/apiClient';
import { buildBlogCommentTree } from '../../types/blog';
import type { BlogCommentWithAuthor, BlogCommentWithReplies } from '../../types/blog';
import { BlogThreadedComment } from './BlogThreadedComment';

interface BlogCommentsProps {
  blogId: string;
  initialComments?: BlogCommentWithAuthor[];
  onCommentDeleted?: (commentId: string) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  compactMode?: boolean;
  limit?: number;
}

/**
 * BlogComments component
 * Displays a list of comments for a blog
 * Features:
 * - Pagination support
 * - Delete button for author/admin
 * - Loading states
 * - Empty state
 * - Hierarchical threading
 */
export function BlogComments({
  blogId,
  initialComments = [],
  onCommentDeleted,
  onLoadingChange,
  compactMode = false,
  limit: customLimit = 20,
}: BlogCommentsProps) {
  const { t } = useTranslation();
  const [flatComments, setFlatComments] = useState<BlogCommentWithAuthor[]>(initialComments);
  const [treeComments, setTreeComments] = useState<BlogCommentWithReplies[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  // In compact mode, use custom limit; otherwise use default 20
  const limit = compactMode ? customLimit : 20;

  // Build tree structure whenever flat comments change
  useEffect(() => {
    const tree = buildBlogCommentTree(flatComments);
    setTreeComments(tree);
  }, [flatComments]);

  // Fetch comments on mount
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getBlogComments(blogId, limit, 0);
        setFlatComments(response.comments);
        setTotal(response.total);
        setOffset(0);
      } catch (err) {
        setError(t('blogs.loadCommentsError', 'Failed to load comments'));
        handleApiError(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchComments();
  }, [blogId, limit, t]);

  // Notify parent of loading state
  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  const loadComments = async (newOffset: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getBlogComments(blogId, limit, newOffset);
      setFlatComments(response.comments);
      setTotal(response.total);
      setOffset(newOffset);
    } catch (err) {
      setError(t('blogs.loadCommentsError', 'Failed to load comments'));
      handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommentDeleted = (commentId: string) => {
    // Remove comment from flat list
    setFlatComments((prev) => prev.filter((c) => c.id !== commentId));
    setTotal((prev) => Math.max(0, prev - 1));
    onCommentDeleted?.(commentId);
  };

  const handleReplyCreated = () => {
    // Refresh comments to get the new reply
    loadComments(offset);
  };

  if (isLoading && flatComments.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">
          {t('common.loading', 'Loading...')}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-red-500">{error}</p>
        <Button
          onClick={() => loadComments(0)}
          variant="outline"
          size="sm"
          className="mt-2"
        >
          {t('common.tryAgain', 'Try Again')}
        </Button>
      </div>
    );
  }

  if (flatComments.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">
          {t('blogs.noComments', 'No comments yet')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {treeComments.map((comment) => (
        <BlogThreadedComment
          key={comment.id}
          comment={comment}
          blogId={blogId}
          onCommentDeleted={handleCommentDeleted}
          onReplyCreated={handleReplyCreated}
        />
      ))}

      {/* Pagination (not shown in compact mode) */}
      {!compactMode && total > limit && (
        <div className="flex justify-between items-center gap-2 pt-2">
          <Button
            onClick={() => loadComments(Math.max(0, offset - limit))}
            disabled={offset === 0 || isLoading}
            variant="outline"
            size="sm"
          >
            {t('blogs.previous', 'Previous')}
          </Button>

          <span className="text-xs text-muted-foreground">
            {t('blogs.pageInfo', {
              defaultValue: 'Showing {{start}}-{{end}} of {{total}}',
              start: offset + 1,
              end: Math.min(offset + limit, total),
              total,
            })}
          </span>

          <Button
            onClick={() => loadComments(offset + limit)}
            disabled={offset + limit >= total || isLoading}
            variant="outline"
            size="sm"
          >
            {t('blogs.next', 'Next')}
          </Button>
        </div>
      )}
    </div>
  );
}
