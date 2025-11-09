import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Trash2, MessageCircle, X } from 'lucide-react';
import { deleteBlogComment } from '../services/blogService';
import { handleApiError } from '../services/apiClient';
import { formatPostTime } from '../../types/post';
import type { BlogCommentWithReplies } from '../../types/blog';
import { CommentForm } from './CommentForm';

interface BlogThreadedCommentProps {
  comment: BlogCommentWithReplies;
  blogId: string;
  depth?: number;
  maxDepth?: number;
  onCommentDeleted?: (commentId: string) => void;
  onReplyCreated?: () => void;
}

const MAX_DEPTH = 5;

/**
 * BlogThreadedComment component
 * Recursively renders a comment and its nested replies
 * Features:
 * - Vertical thread lines for visual hierarchy
 * - Indentation based on nesting depth
 * - Reply button to start composing a reply
 * - Delete button for author/admin
 * - Soft delete display ('[deleted]' content)
 * - Maximum nesting depth enforcement
 */
export function BlogThreadedComment({
  comment,
  blogId,
  depth = 0,
  maxDepth = MAX_DEPTH,
  onCommentDeleted,
  onReplyCreated,
}: BlogThreadedCommentProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isDeleted = comment.content === '[deleted]';
  const canDelete = user && (user.id === comment.user_id || user.role === 'admin');
  const canReply = !isDeleted && depth < maxDepth;

  const handleDelete = async () => {
    if (!window.confirm(t('blogs.deleteCommentConfirm', 'Delete this comment?'))) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteBlogComment(comment.id);
      onCommentDeleted?.(comment.id);
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReplyCreated = () => {
    setIsReplying(false);
    onReplyCreated?.();
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        {/* Thread line for nested comments */}
        {depth > 0 && (
          <div
            className="absolute -left-3 top-0 bottom-0 border-l-2 border-gray-300 dark:border-gray-700"
            aria-hidden="true"
          />
        )}

        {/* Comment content with indentation */}
        <div
          className="ml-0 relative"
          style={{
            marginLeft: `${depth * 16}px`,
            paddingLeft: depth > 0 ? '12px' : '0',
          }}
        >
          <div className="border rounded-lg p-3 space-y-2 hover:bg-muted/50 transition-colors">
            {/* Comment Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">
                    {comment.author_name || 'Anonymous'}
                  </p>
                  {isDeleted && (
                    <span className="text-xs text-muted-foreground italic">
                      {t('blogs.deleted', 'deleted')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatPostTime(comment.created_at)}
                </p>
              </div>

              {/* Delete button */}
              {canDelete && !isDeleted && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  title={t('blogs.delete', 'Delete')}
                  aria-label={t('blogs.deleteComment', 'Delete comment')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {/* Comment Content */}
            <p
              className={`text-sm whitespace-pre-wrap break-words ${
                isDeleted ? 'text-muted-foreground italic' : 'text-foreground'
              }`}
            >
              {comment.content}
            </p>

            {/* Reply button */}
            {canReply && (
              <div className="flex gap-2">
                {!isReplying && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsReplying(true)}
                    className="text-xs h-7 px-2"
                  >
                    <MessageCircle className="h-3.5 w-3.5 mr-1" />
                    {t('comments.reply', 'Reply')}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Reply form */}
          {isReplying && (
            <div className="mt-3 space-y-2 border-l-2 border-blue-300 dark:border-blue-700 pl-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {t('comments.replyingTo', {
                    defaultValue: 'Replying to {{name}}',
                    name: comment.author_name || 'user',
                  })}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsReplying(false)}
                  className="h-5 w-5 p-0"
                  title={t('comments.cancelReply', 'Cancel reply')}
                  aria-label={t('comments.cancelReply', 'Cancel reply')}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              <CommentForm
                blogId={blogId}
                parentCommentId={comment.id}
                onCommentCreated={handleReplyCreated}
                placeholder={t('comments.replyPlaceholder', 'Write a reply...')}
                isReply
              />
            </div>
          )}
        </div>
      </div>

      {/* Recursively render replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-2">
          {comment.replies.map((reply) => (
            <BlogThreadedComment
              key={reply.id}
              comment={reply}
              blogId={blogId}
              depth={depth + 1}
              maxDepth={maxDepth}
              onCommentDeleted={onCommentDeleted}
              onReplyCreated={onReplyCreated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
