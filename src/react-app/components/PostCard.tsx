import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { getPostTypeName, formatPostTime } from '../../types/post';
import type { Post, PostType } from '../../types/post';

interface PostCardProps {
  post: Post & { author_name?: string };
  onViewDetails?: () => void;
}

/**
 * PostCard component
 * Displays a single post in read-only format for the feed
 * Shows: author name, post content, type badge, timestamps
 *
 * Layout: Header with metadata, content area, footer with actions
 */
export function PostCard({
  post,
  onViewDetails,
}: PostCardProps) {
  const { t } = useTranslation();
  const postTypeLabel = getPostTypeName(post.post_type as PostType);
  const timeAgo = formatPostTime(post.created_at);

  // Get badge color based on post type
  const getBadgeVariant = (postType: string) => {
    switch (postType) {
      case 'announcement':
        return 'default'; // Prominent styling for announcements
      case 'discussion':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      {/* Header: Author and Post Type */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-base">
              {post.author_name || 'Anonymous'}
            </h3>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
          {post.post_type && (
            <Badge variant={getBadgeVariant(post.post_type)} className="flex-shrink-0">
              {t(`postType.${post.post_type}`, postTypeLabel)}
            </Badge>
          )}
        </div>
      </CardHeader>

      {/* Content Section */}
      <CardContent className="flex-1 pb-3">
        {/* Post Content */}
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
          {post.content}
        </p>
      </CardContent>

      {/* Footer: Engagement Counts */}
      <div className="px-6 py-3 border-t bg-muted/50 text-xs text-muted-foreground flex gap-4">
        <span>
          {t('posts.likes', { defaultValue: '{{count}} likes', count: post.likes_count })}
        </span>
        <span>
          {t('posts.comments', { defaultValue: '{{count}} comments', count: post.comments_count })}
        </span>
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="text-primary hover:underline ml-auto"
          >
            {t('common.view', 'View')}
          </button>
        )}
      </div>
    </Card>
  );
}
