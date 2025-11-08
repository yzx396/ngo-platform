import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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

  useEffect(() => {
    if (isEditing && id) {
      loadBlog();
    }
  }, [id]);

  const loadBlog = async () => {
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
  };

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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/blogs')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('blogs.backToBlogs')}
      </button>

      {/* Header */}
      <h1 className="text-3xl font-bold mb-8">
        {isEditing ? t('blogs.editBlog') : t('blogs.createNew')}
      </h1>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
        {/* Title */}
        <div className="mb-6">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            {t('blogs.titleLabel')}
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('blogs.titlePlaceholder')}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={200}
          />
          <p className="text-sm text-gray-500 mt-1">
            {title.length}/200 {t('blogs.characters')}
          </p>
        </div>

        {/* Content */}
        <div className="mb-6">
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
            {t('blogs.contentLabel')}
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('blogs.contentPlaceholder')}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={15}
          />
          <p className="text-sm text-gray-500 mt-1">
            {content.length} {t('blogs.characters')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {submitting
              ? t('blogs.saving')
              : isEditing
              ? t('blogs.update')
              : t('blogs.publish')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/blogs')}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
