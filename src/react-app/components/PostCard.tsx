import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
import { getPostTypeName, formatPostTime } from '../../types/post';
import type { Post, PostType } from '../../types/post';

interface PostCardProps {
  post: Post & { author_name?: string };
  onViewDetails?: () => void;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: string) => void;
}

/**
 * PostCard component
 * Displays a single post with optional edit/delete actions
 * Shows: author name, post content, type badge, timestamps, engagement counts
 *
 * Features:
 * - Dropdown menu for author and admins to edit/delete
 * - Post type badge with color coding
 * - Engagement counts (likes and comments placeholders for future slices)
 * - Responsive design
 */
export function PostCard({
  post,
  onViewDetails,
  onEdit,
  onDelete,
}: PostCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const postTypeLabel = getPostTypeName(post.post_type as PostType);
  const timeAgo = formatPostTime(post.created_at);

  // Check if user can edit/delete this post
  const canEdit = user && (user.id === post.user_id || user.role === 'admin');

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

  // Handle click outside dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        triggerRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  const handleDelete = async () => {
    if (window.confirm(t('posts.deleteConfirm'))) {
      try {
        setIsDeleting(true);
        onDelete?.(post.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      {/* Header: Author, Post Type, and Menu */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-base">
              {post.author_name || 'Anonymous'}
            </h3>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {post.post_type && (
              <Badge variant={getBadgeVariant(post.post_type)}>
                {t(`postType.${post.post_type}`, postTypeLabel)}
              </Badge>
            )}
            {canEdit && (
              <div className="relative">
                <Button
                  ref={triggerRef}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                {menuOpen && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 z-50 min-w-[160px] overflow-hidden rounded-md border bg-white p-1 text-foreground shadow-md"
                  >
                    <button
                      onClick={() => {
                        onEdit?.(post);
                        setMenuOpen(false);
                      }}
                      className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100"
                    >
                      <Edit2 className="mr-2 h-4 w-4" />
                      {t('posts.edit')}
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-red-50 focus:bg-red-50 disabled:opacity-50 disabled:pointer-events-none text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('posts.delete')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
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
