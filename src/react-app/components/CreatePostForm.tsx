import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { PostType } from '../../types/post';
import { createPost } from '../services/postService';
import { ApiError } from '../services/apiClient';
import { toast } from 'sonner';
import { RichTextEditor } from './RichTextEditor';
import { getTextLengthFromHtml, isHtmlEmpty } from '../utils/htmlUtils';

interface CreatePostFormProps {
  onPostCreated?: () => void; // Callback when post is successfully created
  onCancel?: () => void; // Callback when user clicks cancel button
}

const MAX_CONTENT_LENGTH = 2000;

/**
 * CreatePostForm Component
 * Allows authenticated users to create new posts
 * Features:
 * - Textarea for content input with character counter
 * - Post type selector (general/discussion/announcement for admins)
 * - Form validation and error handling
 * - Loading state during submission
 */
export function CreatePostForm({ onPostCreated, onCancel }: CreatePostFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>(PostType.General);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get points for post type (matching POINTS_SYSTEM.md)
  const getPointsForPostType = (type: PostType): number => {
    switch (type) {
      case PostType.Discussion:
        return 15;
      case PostType.General:
        return 10;
      case PostType.Announcement:
        return 0; // No points for announcements
      default:
        return 10;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset error
    setError(null);

    // Validation
    if (isHtmlEmpty(content)) {
      setError(t('posts.validationRequired'));
      return;
    }

    const textLength = getTextLengthFromHtml(content);
    if (textLength > MAX_CONTENT_LENGTH) {
      setError(t('posts.validationTooLong'));
      return;
    }

    // Check authorization for announcements
    if (postType === PostType.Announcement && user?.role !== 'admin') {
      setError(t('posts.announcementAdminOnly'));
      return;
    }

    try {
      setLoading(true);
      await createPost(content, postType);

      // Success - show base success toast
      toast.success(t('posts.createSuccess'));

      // Show points earned toast (unless it's an announcement with 0 points)
      const points = getPointsForPostType(postType);
      if (points > 0) {
        // Determine which notification key to use based on post type
        let notificationKey = 'points.notifications.postCreated';
        if (postType === PostType.Discussion) {
          notificationKey = 'points.notifications.discussionCreated';
        }

        toast.success(t(notificationKey, { points: points.toString() }));
      }

      setContent('');
      setPostType(PostType.General);

      // Call callback to refresh feed
      onPostCreated?.();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('posts.createError');
      setError(message);
      toast.error(message);
      console.error('Error creating post:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{t('posts.whatOnYourMind')}</CardTitle>
        <CardDescription>{t('posts.contentPlaceholder')}</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Content Rich Text Editor */}
          <div className="space-y-2">
            <label htmlFor="post-content" className="text-sm font-medium">
              {t('posts.contentLabel')}
            </label>
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder={t('posts.contentPlaceholder')}
              disabled={loading}
              minHeight="150px"
            />

            {/* Character counter */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {t('posts.charLimit', { current: getTextLengthFromHtml(content) })}
              </p>
              {getTextLengthFromHtml(content) > MAX_CONTENT_LENGTH * 0.9 && (
                <p className="text-xs text-orange-500">
                  {t('posts.validationTooLong')}
                </p>
              )}
            </div>
          </div>

          {/* Post Type Selector */}
          <div className="space-y-2">
            <label htmlFor="post-type" className="text-sm font-medium">
              {t('posts.postTypeLabel')}
            </label>
            <select
              id="post-type"
              value={postType}
              onChange={(e) => setPostType(e.target.value as PostType)}
              disabled={loading}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value={PostType.General}>
                {t(`postType.${PostType.General}`)}
              </option>
              <option value={PostType.Discussion}>
                {t(`postType.${PostType.Discussion}`)}
              </option>
              {user?.role === 'admin' && (
                <option value={PostType.Announcement}>
                  {t(`postType.${PostType.Announcement}`)}
                </option>
              )}
            </select>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={loading || isHtmlEmpty(content)}
              className="flex-1"
            >
              {loading ? t('common.loading') : t('posts.create')}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => {
                setContent('');
                setPostType(PostType.General);
                setError(null);
                onCancel?.();
              }}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
