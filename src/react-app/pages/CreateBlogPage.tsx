import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { createBlog, getBlogById, updateBlog } from '../services/blogService';

export function CreateBlogPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBlog = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const blog = await getBlogById(id);
      setTitle(blog.title);
      setContent(blog.content);
    } catch (err) {
      console.error('Error loading blog:', err);
      setError(t('blogs.loadError'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    if (isEditing && id) {
      loadBlog();
    }
  }, [isEditing, id, loadBlog]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError(t('blogs.titleRequired'));
      return;
    }

    if (!content.trim()) {
      setError(t('blogs.contentRequired'));
      return;
    }

    try {
      setSubmitting(true);

      if (isEditing && id) {
        await updateBlog(id, title, content);
        navigate(`/blogs/${id}`);
      } else {
        const newBlog = await createBlog(title, content);
        navigate(`/blogs/${newBlog.id}`);
      }
    } catch (err) {
      console.error('Error saving blog:', err);
      setError(isEditing ? t('blogs.updateError') : t('blogs.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/blogs')}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('blogs.backToBlogs')}
      </Button>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          {isEditing ? t('blogs.editBlog') : t('blogs.createNew')}
        </h1>
        <p className="text-muted-foreground">
          {isEditing
            ? t('blogs.editDescription', 'Update your blog post')
            : t('blogs.createDescription', 'Share your thoughts with the community')}
        </p>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? t('blogs.editBlogContent') : t('blogs.newBlogPost')}</CardTitle>
          <CardDescription>
            {isEditing ? t('blogs.editBlogDesc') : t('blogs.createBlogDesc')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                {t('blogs.titleLabel')}
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('blogs.titlePlaceholder')}
                disabled={submitting}
                maxLength={200}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {title.length}/200 {t('blogs.characters')}
                </p>
                {title.length > 200 * 0.9 && (
                  <p className="text-xs text-orange-500">{t('blogs.titleTooLong', 'Title is getting long')}</p>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-medium">
                {t('blogs.contentLabel')}
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('blogs.contentPlaceholder')}
                disabled={submitting}
                rows={15}
                className="min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                {content.length} {t('blogs.characters')}
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={submitting || !title.trim() || !content.trim()}
                className="flex-1"
              >
                {submitting
                  ? t('blogs.saving')
                  : isEditing
                  ? t('blogs.update')
                  : t('blogs.publish')}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => navigate('/blogs')}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
