import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ForumCategory, PostType } from '../../types/post';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

/**
 * ForumCreatePostPage Component
 * Page for creating new forum posts with title, category, and content
 */
export function ForumCreatePostPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>(ForumCategory.General);
  const [postType, setPostType] = useState<PostType>(PostType.Discussion);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error(t('forum.create.titleRequired', 'Title is required'));
      return;
    }

    if (!content.trim()) {
      toast.error(t('forum.create.contentRequired', 'Content is required'));
      return;
    }

    try {
      setIsSubmitting(true);

      // Create post with forum fields
      const response = await fetch('/api/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          title,
          content,
          category,
          post_type: postType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create post');
      }

      const post = await response.json();

      toast.success(t('forum.create.success', 'Post created successfully'));
      navigate(`/posts/${post.id}`);
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(
        error instanceof Error ? error.message : t('forum.create.error', 'Failed to create post')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/forum');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={handleCancel} className="mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('forum.create.backToForum', 'Back to Forum')}
      </Button>

      {/* Create Post Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('forum.create.title', 'Create New Post')}</CardTitle>
          <CardDescription>
            {t('forum.create.description', 'Share your thoughts, questions, or insights with the community')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                {t('forum.create.titleLabel', 'Title')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('forum.create.titlePlaceholder', 'Enter a descriptive title...')}
                maxLength={200}
                required
              />
              <p className="text-xs text-muted-foreground">
                {title.length}/200 {t('common.characters', 'characters')}
              </p>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">
                {t('forum.create.categoryLabel', 'Category')} <span className="text-red-500">*</span>
              </Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                required
              >
                {Object.values(ForumCategory).map((cat) => (
                  <option key={cat} value={cat}>
                    {t(`forum.category.${cat}`, cat)}
                  </option>
                ))}
              </select>
            </div>

            {/* Post Type */}
            <div className="space-y-2">
              <Label htmlFor="postType">
                {t('forum.create.typeLabel', 'Post Type')}
              </Label>
              <select
                id="postType"
                value={postType}
                onChange={(e) => setPostType(e.target.value as PostType)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value={PostType.General}>
                  {t('postType.general', 'General')}
                </option>
                <option value={PostType.Discussion}>
                  {t('postType.discussion', 'Discussion')}
                </option>
              </select>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">
                {t('forum.create.contentLabel', 'Content')} <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('forum.create.contentPlaceholder', 'Write your post content here...')}
                rows={12}
                maxLength={2000}
                required
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {content.length}/2000 {t('common.characters', 'characters')}
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('common.submitting', 'Submitting...') : t('forum.create.submit', 'Create Post')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default ForumCreatePostPage;
