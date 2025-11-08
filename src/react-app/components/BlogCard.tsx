import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BlogWithLikeStatus } from '../../types/blog';

interface BlogCardProps {
  blog: BlogWithLikeStatus;
  onLike?: (blogId: string) => void;
  onUnlike?: (blogId: string) => void;
  showActions?: boolean;
}

export function BlogCard({ blog, onLike, onUnlike, showActions = true }: BlogCardProps) {
  const { t } = useTranslation();

  const handleLikeClick = () => {
    if (blog.liked_by_user) {
      onUnlike?.(blog.id);
    } else {
      onLike?.(blog.id);
    }
  };

  // Truncate content for preview
  const previewContent = blog.content.length > 200
    ? blog.content.substring(0, 200) + '...'
    : blog.content;

  const formattedDate = new Date(blog.created_at * 1000).toLocaleDateString();

  return (
    <div className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Link
            to={`/blogs/${blog.id}`}
            className="text-2xl font-bold hover:text-blue-600 transition-colors"
          >
            {blog.title}
          </Link>
          {blog.featured && (
            <span className="inline-flex items-center gap-1 ml-3 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
              <Star className="w-3 h-3 fill-current" />
              {t('blogs.featured')}
            </span>
          )}
        </div>
      </div>

      {/* Author and Date */}
      <div className="text-sm text-gray-600 mb-3">
        <span className="font-medium">{blog.author_name}</span>
        <span className="mx-2">•</span>
        <span>{formattedDate}</span>
      </div>

      {/* Content Preview */}
      <p className="text-gray-700 mb-4 whitespace-pre-wrap">{previewContent}</p>

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-6 text-sm text-gray-600">
          {/* Like Button */}
          <button
            onClick={handleLikeClick}
            className={`flex items-center gap-1 hover:text-red-600 transition-colors ${
              blog.liked_by_user ? 'text-red-600' : ''
            }`}
          >
            <Heart
              className={`w-4 h-4 ${blog.liked_by_user ? 'fill-current' : ''}`}
            />
            <span>{blog.likes_count}</span>
          </button>

          {/* Comments */}
          <div className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            <span>{blog.comments_count}</span>
          </div>

          {/* Read More Link */}
          <Link
            to={`/blogs/${blog.id}`}
            className="ml-auto text-blue-600 hover:text-blue-800 font-medium"
          >
            {t('blogs.readMore')} →
          </Link>
        </div>
      )}
    </div>
  );
}
