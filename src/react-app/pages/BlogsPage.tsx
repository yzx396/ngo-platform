import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BlogCard } from '../components/BlogCard';
import { useAuth } from '../context/AuthContext';
import { getBlogs, likeBlog, unlikeBlog } from '../services/blogService';
import type { BlogWithLikeStatus } from '../../types/blog';

export function BlogsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [blogs, setBlogs] = useState<BlogWithLikeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'featured'>('all');

  const loadBlogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getBlogs(
        100,
        0,
        filter === 'featured' ? true : undefined
      );
      setBlogs(response.blogs);
    } catch (err) {
      console.error('Error loading blogs:', err);
      setError(t('blogs.loadError'));
    } finally {
      setLoading(false);
    }
  }, [filter, t]);

  useEffect(() => {
    loadBlogs();
  }, [loadBlogs]);

  const handleLike = async (blogId: string) => {
    try {
      const updatedBlog = await likeBlog(blogId);
      setBlogs((prev) =>
        prev.map((blog) =>
          blog.id === blogId
            ? { ...blog, likes_count: updatedBlog.likes_count, user_has_liked: true }
            : blog
        )
      );
    } catch (err) {
      console.error('Error liking blog:', err);
    }
  };

  const handleUnlike = async (blogId: string) => {
    try {
      const updatedBlog = await unlikeBlog(blogId);
      setBlogs((prev) =>
        prev.map((blog) =>
          blog.id === blogId
            ? { ...blog, likes_count: updatedBlog.likes_count, user_has_liked: false }
            : blog
        )
      );
    } catch (err) {
      console.error('Error unliking blog:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">{t('blogs.title')}</h1>
        {user && (
          <Link
            to="/blogs/create"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('blogs.create')}
          </Link>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {t('blogs.allBlogs')}
        </button>
        <button
          onClick={() => setFilter('featured')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'featured'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {t('blogs.featuredBlogs')}
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && blogs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">{t('blogs.noBlogsFound')}</p>
          {user && (
            <Link
              to="/blogs/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('blogs.createFirst')}
            </Link>
          )}
        </div>
      )}

      {/* Blogs List */}
      {!loading && !error && blogs.length > 0 && (
        <div className="space-y-6">
          {blogs.map((blog) => (
            <BlogCard
              key={blog.id}
              blog={blog}
              onLike={user ? handleLike : undefined}
              onUnlike={user ? handleUnlike : undefined}
              showActions={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}
