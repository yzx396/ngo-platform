import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { createBlogComment } from '../services/blogService';
import { handleApiError } from '../services/apiClient';
import { toast } from 'sonner';
import { RichTextEditor } from './RichTextEditor';
import { getTextLengthFromHtml, isHtmlEmpty } from '../utils/htmlUtils';

interface CommentFormProps {
  blogId: string;
  parentCommentId?: string;
  onCommentCreated?: (content: string) => void;
  placeholder?: string;
  isReply?: boolean;
}

const MAX_COMMENT_LENGTH = 500;

/**
 * CommentForm component
 * Form for users to add comments on blogs or reply to comments
 * Features:
 * - Character limit (500 chars)
 * - Character counter
 * - Loading state
 * - Error handling
 * - Support for nested replies via parentCommentId
 * - Submit button disabled when empty or > max length
 */
export function CommentForm({
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

  const textLength = getTextLengthFromHtml(content);
  const isValid = !isHtmlEmpty(content) && textLength <= MAX_COMMENT_LENGTH;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!isValid || isSubmitting) return;

      try {
        setIsSubmitting(true);
        setError(null);

        await createBlogComment(blogId, content, parentCommentId);

        // Clear form on success
        setContent('');

        // Show points notification (comments earn 5 points)
        const COMMENT_POINTS = 5;
        toast.success(t('points.notifications.commentCreated', { points: COMMENT_POINTS.toString() }));

        // Notify parent component
        onCommentCreated?.(content);
      } catch (err) {
        const errorMsg = t('comments.error', 'Failed to create comment. Please try again.');
        setError(errorMsg);
        handleApiError(err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [blogId, parentCommentId, content, isValid, isSubmitting, onCommentCreated, t]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="space-y-1">
        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder={placeholder || t('comments.add', 'Add a comment...')}
          minHeight={isReply ? '100px' : '120px'}
          disabled={isSubmitting}
        />
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>
            {t('posts.charLimit', {
              defaultValue: '{{current}}/{{max}} characters',
              current: textLength,
              max: MAX_COMMENT_LENGTH,
            })}
          </span>
          {textLength > MAX_COMMENT_LENGTH && (
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
              : t('comments.submit', 'Submit')}
        </Button>
      </div>
    </form>
  );
}
