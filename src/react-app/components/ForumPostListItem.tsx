import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Eye, Pin } from 'lucide-react';
import { Badge } from './ui/badge';
import { getCategoryName, formatPostTime } from '../../types/post';
import type { PostWithAuthor } from '../../types/post';

interface ForumPostListItemProps {
  post: PostWithAuthor;
}

/**
 * ForumPostListItem Component
 * Displays a forum post in compact list view (1Point3Acres style)
 * Shows: title, author, category, replies, views, last reply info, pinned status
 */
export function ForumPostListItem({ post }: ForumPostListItemProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const categoryName = post.category ? getCategoryName(post.category) : 'General';
  const timeAgo = formatPostTime(post.created_at);
  const lastReplyTime = post.last_reply_at ? formatPostTime(post.last_reply_at) : null;

  const handleClick = () => {
    navigate(`/posts/${post.id}`);
  };

  // Get category badge color
  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'announcements':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'career':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'mentorship':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'technology':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'learning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div
      onClick={handleClick}
      className="flex items-center gap-4 p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors"
    >
      {/* Left: Category Badge */}
      <div className="flex-shrink-0 w-24">
        <Badge
          variant="outline"
          className={`text-xs ${getCategoryColor(post.category)} whitespace-nowrap`}
        >
          {t(`forum.category.${post.category}`, categoryName)}
        </Badge>
      </div>

      {/* Center: Post Info */}
      <div className="flex-1 min-w-0">
        {/* Title Row */}
        <div className="flex items-center gap-2 mb-1">
          {post.is_pinned && (
            <Pin className="w-4 h-4 text-red-500 flex-shrink-0" />
          )}
          <h3 className="font-medium text-base truncate hover:text-primary">
            {post.title || post.content.substring(0, 60) + (post.content.length > 60 ? '...' : '')}
          </h3>
        </div>

        {/* Meta Info Row */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="truncate">{post.author_name || 'Anonymous'}</span>
          <span>•</span>
          <span>{timeAgo}</span>
        </div>
      </div>

      {/* Right: Stats */}
      <div className="flex items-center gap-6 flex-shrink-0 text-sm">
        {/* Replies */}
        <div className="flex items-center gap-1 text-muted-foreground">
          <MessageSquare className="w-4 h-4" />
          <span>{post.comments_count || 0}</span>
        </div>

        {/* Views */}
        <div className="flex items-center gap-1 text-muted-foreground">
          <Eye className="w-4 h-4" />
          <span>{post.views || 0}</span>
        </div>

        {/* Last Reply */}
        {lastReplyTime && (
          <div className="text-right min-w-[120px]">
            <div className="text-xs text-muted-foreground">
              {t('forum.lastReply', 'Last reply')}
            </div>
            <div className="text-xs font-medium">
              {post.last_reply_user_name || 'Unknown'}
            </div>
            <div className="text-xs text-muted-foreground">
              {lastReplyTime}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
