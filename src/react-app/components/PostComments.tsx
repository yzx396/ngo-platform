import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Trash2 } from 'lucide-react';
import { getComments, deleteComment } from '../services/postService';
import { handleApiError } from '../services/apiClient';
import { formatPostTime } from '../../types/post';
import type { PostCommentWithAuthor } from '../../types/post';

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
  const { user } = useAuth();
  const [comments, setComments] = useState<PostCommentWithAuthor[]>(initialComments);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Fetch comments on mount
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getComments(postId, limit, 0);
        setComments(response.comments);
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
      setComments(response.comments);
      setTotal(response.total);
      setOffset(newOffset);
    } catch (err) {
      setError(t('posts.loadCommentsError', 'Failed to load comments'));
      handleApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm(t('posts.deleteCommentConfirm', 'Delete this comment?'))) {
      return;
    }

    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setTotal((prev) => Math.max(0, prev - 1));
      onCommentDeleted?.(commentId);
    } catch (err) {
      handleApiError(err);
    }
  };

  const canDelete = (comment: PostCommentWithAuthor) => {
    if (!user) return false;
    return user.id === comment.user_id || user.role === 'admin';
  };

  if (isLoading && comments.length === 0) {
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

  if (comments.length === 0) {
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
      {comments.map((comment) => (
        <div
          key={comment.id}
          className="border rounded-lg p-3 space-y-2 hover:bg-muted/50 transition-colors"
        >
          {/* Comment Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm font-medium">
                {comment.author_name || 'Anonymous'}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatPostTime(comment.created_at)}
              </p>
            </div>
            {canDelete(comment) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(comment.id)}
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                title={t('posts.delete', 'Delete')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Comment Content */}
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
            {comment.content}
          </p>
        </div>
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
