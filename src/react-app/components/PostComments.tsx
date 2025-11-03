import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { getComments } from '../services/postService';
import { handleApiError } from '../services/apiClient';
import { buildCommentTree } from '../../types/post';
import type { PostCommentWithAuthor, PostCommentWithReplies } from '../../types/post';
import { ThreadedComment } from './ThreadedComment';

interface PostCommentsProps {
  postId: string;
  initialComments?: PostCommentWithAuthor[];
  onCommentDeleted?: (commentId: string) => void;
  onLoadingChange?: (isLoading: boolean) => void;
}

/**
 * PostComments component
 * Displays a list of comments for a post
 * Features:
 * - Pagination support
 * - Delete button for author/admin
 * - Loading states
 * - Empty state
 */
export function PostComments({
  postId,
  initialComments = [],
  onCommentDeleted,
  onLoadingChange,
}: PostCommentsProps) {
  const { t } = useTranslation();
  const [flatComments, setFlatComments] = useState<PostCommentWithAuthor[]>(initialComments);
  const [treeComments, setTreeComments] = useState<PostCommentWithReplies[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Build tree structure whenever flat comments change
  useEffect(() => {
    const tree = buildCommentTree(flatComments);
    setTreeComments(tree);
  }, [flatComments]);

  // Fetch comments on mount
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getComments(postId, limit, 0);
        setFlatComments(response.comments);
        setTotal(response.total);
        setOffset(0);
      } catch (err) {
        setError(t('posts.loadCommentsError', 'Failed to load comments'));
        handleApiError(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchComments();
  }, [postId, limit, t]);

  // Notify parent of loading state
  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  const loadComments = async (newOffset: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getComments(postId, limit, newOffset);
      setFlatComments(response.comments);
      setTotal(response.total);
      setOffset(newOffset);
    } catch (err) {
      setError(t('posts.loadCommentsError', 'Failed to load comments'));
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
          {t('posts.noComments', 'No comments yet')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {treeComments.map((comment) => (
        <ThreadedComment
          key={comment.id}
          comment={comment}
          postId={postId}
          onCommentDeleted={handleCommentDeleted}
          onReplyCreated={handleReplyCreated}
        />
      ))}

      {/* Pagination */}
      {total > limit && (
        <div className="flex justify-between items-center gap-2 pt-2">
          <Button
            onClick={() => loadComments(Math.max(0, offset - limit))}
            disabled={offset === 0 || isLoading}
            variant="outline"
            size="sm"
          >
            {t('posts.previous', 'Previous')}
          </Button>

          <span className="text-xs text-muted-foreground">
            {t('posts.pageInfo', {
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
            {t('posts.next', 'Next')}
          </Button>
        </div>
      )}
    </div>
  );
}
