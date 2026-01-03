import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BlogCard } from '../components/BlogCard';
import { BlogControls } from '../components/BlogControls';
import { useAuth } from '../context/AuthContext';
import { getMyBlogs, likeBlog, unlikeBlog } from '../services/blogService';
import type { BlogWithLikeStatus } from '../../types/blog';

export function MyBlogsPage() {
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
      const response = await getMyBlogs(
        100,
        0,
        filter === 'featured' ? true : undefined
      );
      setBlogs(response.blogs);
    } catch {
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
            ? { ...blog, likes_count: updatedBlog.likes_count, liked_by_user: true }
            : blog
        )
      );
    } catch {
      // Error handled silently
    }
  };

  const handleUnlike = async (blogId: string) => {
    try {
      const updatedBlog = await unlikeBlog(blogId);
      setBlogs((prev) =>
        prev.map((blog) =>
          blog.id === blogId
            ? { ...blog, likes_count: updatedBlog.likes_count, liked_by_user: false }
            : blog
        )
      );
    } catch {
      // Error handled silently
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t('myBlogs.title', 'My Blogs')}</h1>
        <p className="text-muted-foreground">{t('myBlogs.subtitle', 'Manage your blog posts')}</p>
      </div>

      {/* Blog Controls: Filter and Create Button */}
      <BlogControls
        selectedFilter={filter}
        onFilterChange={setFilter}
        isAuthenticated={Boolean(user)}
      />

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && blogs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">{t('blogs.noBlogsFound')}</p>
          {user && (
            <Link
              to="/blogs/create"
              className="inline-block text-primary hover:underline font-medium"
            >
              {t('blogs.createFirst', 'Create your first blog')} →
            </Link>
          )}
        </div>
      )}

      {/* Blogs List */}
      {!loading && !error && blogs.length > 0 && (
        <div className="space-y-4">
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
