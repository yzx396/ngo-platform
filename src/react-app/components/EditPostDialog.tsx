import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { PostType } from '../../types/post';
import { updatePost, deletePost } from '../services/postService';
import { ApiError } from '../services/apiClient';
import { toast } from 'sonner';
import type { Post } from '../../types/post';
import { RichTextEditor } from './RichTextEditor';
import { getTextLengthFromHtml, isHtmlEmpty } from '../utils/htmlUtils';

interface EditPostDialogProps {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostUpdated?: () => void;
}

const MAX_CONTENT_LENGTH = 2000;

/**
 * EditPostDialog Component
 * Modal dialog for editing an existing post
 * Features:
 * - Edit content and post type
 * - Save/Cancel actions
 * - Delete button (integrated)
 * - Validation and error handling
 */
export function EditPostDialog({
  post,
  open,
  onOpenChange,
  onPostUpdated,
}: EditPostDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>(PostType.General);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when post changes
  useEffect(() => {
    if (post) {
      setContent(post.content);
      setPostType(post.post_type as PostType);
      setError(null);
    }
  }, [post, open]);

  if (!post) return null;

  // Handle form submission
  const handleSave = async () => {
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

      // Only send changed fields
      const updates: Record<string, unknown> = {};
      if (content !== post.content) {
        updates.content = content;
      }
      if (postType !== post.post_type) {
        updates.post_type = postType;
      }

      // If nothing changed, just close
      if (Object.keys(updates).length === 0) {
        onOpenChange(false);
        return;
      }

      await updatePost(post.id, updates.content as string | undefined, updates.post_type as PostType | undefined);

      toast.success(t('posts.updateSuccess'));
      onOpenChange(false);
      onPostUpdated?.();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('posts.updateError');
      setError(message);
      toast.error(message);
      console.error('Error updating post:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('posts.deleteConfirm'))) {
      return;
    }

    try {
      setDeleting(true);
      await deletePost(post.id);
      toast.success(t('posts.deleteSuccess'));
      onOpenChange(false);
      onPostUpdated?.();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('posts.deleteError');
      setError(message);
      toast.error(message);
      console.error('Error deleting post:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('posts.editTitle')}</DialogTitle>
          <DialogDescription>
            {t('posts.contentPlaceholder')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Content Rich Text Editor */}
          <div className="space-y-2">
            <label htmlFor="edit-post-content" className="text-sm font-medium">
              {t('posts.contentLabel')}
            </label>
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder={t('posts.contentPlaceholder')}
              disabled={loading || deleting}
              minHeight="150px"
            />

            {/* Character counter */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {t('posts.charLimit', { current: getTextLengthFromHtml(content) })}
              </p>
            </div>
          </div>

          {/* Post Type Selector */}
          <div className="space-y-2">
            <label htmlFor="edit-post-type" className="text-sm font-medium">
              {t('posts.postTypeLabel')}
            </label>
            <select
              id="edit-post-type"
              value={postType}
              onChange={(e) => setPostType(e.target.value as PostType)}
              disabled={loading || deleting}
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
              onClick={handleSave}
              disabled={loading || deleting || isHtmlEmpty(content)}
              className="flex-1"
            >
              {loading ? t('common.loading') : t('common.save')}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || deleting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading || deleting}
            >
              {deleting ? t('common.loading') : t('posts.delete')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
