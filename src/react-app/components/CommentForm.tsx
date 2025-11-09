import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { createComment } from '../services/postService';
import { createBlogComment } from '../services/blogService';
import { handleApiError } from '../services/apiClient';
import { toast } from 'sonner';

interface CommentFormProps {
  postId?: string;
  blogId?: string;
  parentCommentId?: string;
  onCommentCreated?: (content: string) => void;
  placeholder?: string;
  isReply?: boolean;
}

const MAX_COMMENT_LENGTH = 500;

/**
 * CommentForm component
 * Form for users to add comments on posts/blogs or reply to comments
 * Features:
 * - Character limit (500 chars)
 * - Character counter
 * - Loading state
 * - Error handling
 * - Support for nested replies via parentCommentId
 * - Support for both post and blog comments
 * - Submit button disabled when empty or > max length
 */
export function CommentForm({
  postId,
  blogId,
  parentCommentId,
  onCommentCreated,
  placeholder,
  isReply = false,
}: CommentFormProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = content.trim().length > 0 && content.length <= MAX_COMMENT_LENGTH;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!isValid || isSubmitting) return;
      if (!postId && !blogId) {
        setError('Either postId or blogId must be provided');
        return;
      }

      try {
        setIsSubmitting(true);
        setError(null);

        if (postId) {
          await createComment(postId, content.trim(), parentCommentId);
        } else if (blogId) {
          await createBlogComment(blogId, content.trim(), parentCommentId);
        }

        // Clear form on success
        setContent('');

        // Show points notification (comments earn 5 points)
        const COMMENT_POINTS = 5;
        toast.success(t('points.notifications.commentCreated', { points: COMMENT_POINTS.toString() }));

        // Notify parent component
        onCommentCreated?.(content.trim());
      } catch (err) {
        const errorMsg = t('comments.error', 'Failed to create comment. Please try again.');
        setError(errorMsg);
        handleApiError(err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [postId, blogId, parentCommentId, content, isValid, isSubmitting, onCommentCreated, t]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="space-y-1">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder || t('posts.addComment', 'Add a comment...')}
          className={isReply ? 'min-h-20 resize-none' : 'min-h-24 resize-none'}
          disabled={isSubmitting}
        />
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>
            {t('posts.charLimit', {
              defaultValue: '{{current}}/{{max}} characters',
              current: content.length,
              max: MAX_COMMENT_LENGTH,
            })}
          </span>
          {content.length > MAX_COMMENT_LENGTH && (
            <span className="text-red-500">
              {t('posts.charLimitExceeded', 'Character limit exceeded')}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-500">{error}</div>
      )}

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={!isValid || isSubmitting}
          size="sm"
          className={isReply ? 'flex-1' : 'w-full'}
        >
          {isSubmitting
            ? t('common.loading', 'Loading...')
            : isReply
              ? t('comments.submitReply', 'Reply')
              : t('posts.submitComment', 'Submit')}
        </Button>
      </div>
    </form>
  );
}
