import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Lightbulb, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BlogCard } from '../components/BlogCard';
import { BlogControls } from '../components/BlogControls';
import { BlogPointsInfoDialog } from '../components/BlogPointsInfoDialog';
import { useAuth } from '../context/AuthContext';
import { getBlogs, likeBlog, unlikeBlog } from '../services/blogService';
import type { BlogWithLikeStatus } from '../../types/blog';

// Cookie utility functions
const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
};

const setCookie = (name: string, value: string, days: number = 365) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

export function BlogsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [blogs, setBlogs] = useState<BlogWithLikeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'featured'>('all');
  const [pointsInfoDialogOpen, setPointsInfoDialogOpen] = useState(false);
  const [showPointsBanner, setShowPointsBanner] = useState(() => {
    // Check cookie to see if user has dismissed the banner
    const dismissed = getCookie('blogPointsBannerDismissed');
    return !dismissed;
  });

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
            ? { ...blog, likes_count: updatedBlog.likes_count, liked_by_user: true }
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
            ? { ...blog, likes_count: updatedBlog.likes_count, liked_by_user: false }
            : blog
        )
      );
    } catch (err) {
      console.error('Error unliking blog:', err);
    }
  };

  // Handle banner dismissal
  const handleDismissBanner = () => {
    setShowPointsBanner(false);
    setCookie('blogPointsBannerDismissed', 'true', 365); // Persist for 1 year
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t('blogs.title')}</h1>
        <p className="text-muted-foreground">{t('blogs.subtitle', 'Read and share blogs from the community')}</p>
      </div>

      {/* Points Info Banner */}
      {showPointsBanner && user && (
        <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
              {t('points.earnPoints', 'Earn Points')}
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {t('blogs.description', 'Create blogs and engage with content to earn points and climb the leaderboard!')}{' '}
              <button
                onClick={() => setPointsInfoDialogOpen(true)}
                className="font-semibold underline hover:no-underline cursor-pointer"
              >
                {t('points.howToEarn', 'Learn how')}
              </button>
            </p>
          </div>
          <button
            onClick={handleDismissBanner}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

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
              {t('blogs.createFirst', 'Create the first blog')} →
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

      {/* Blog Points Info Dialog */}
      <BlogPointsInfoDialog
        open={pointsInfoDialogOpen}
        onOpenChange={setPointsInfoDialogOpen}
      />
    </div>
  );
}
