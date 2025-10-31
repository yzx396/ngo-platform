import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { MoreHorizontal, Edit2, Trash2, Heart } from 'lucide-react';
import { getPostTypeName, formatPostTime } from '../../types/post';
import { likePost, unlikePost } from '../services/postService';
import { handleApiError } from '../services/apiClient';
import type { Post, PostType } from '../../types/post';

interface PostCardProps {
  post: Post & { author_name?: string };
  onViewDetails?: () => void;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: string) => void;
  onLikesChange?: (postId: string, newLikesCount: number) => void;
}

/**
 * PostCard component
 * Displays a single post with optional edit/delete actions
 * Shows: author name, post content, type badge, timestamps, engagement counts
 *
 * Features:
 * - Dropdown menu for author and admins to edit/delete
 * - Post type badge with color coding
 * - Like functionality with optimistic UI updates
 * - Engagement counts (likes and comments)
 * - Responsive design
 */
export function PostCard({
  post,
  onViewDetails,
  onEdit,
  onDelete,
  onLikesChange,
}: PostCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [userHasLiked, setUserHasLiked] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const postTypeLabel = getPostTypeName(post.post_type as PostType);
  const timeAgo = formatPostTime(post.created_at);

  // Check if user can edit/delete this post
  const canEdit = user && (user.id === post.user_id || user.role === 'admin');
  const isAuthenticated = Boolean(user);

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

  const handleLikeClick = useCallback(async () => {
    if (!isAuthenticated || isLiking) return;

    // Optimistic UI update
    const previousLikeState = userHasLiked;
    const previousCount = likesCount;
    const newCount = userHasLiked ? likesCount - 1 : likesCount + 1;

    setUserHasLiked(!userHasLiked);
    setLikesCount(newCount);

    try {
      setIsLiking(true);

      if (userHasLiked) {
        // Unlike the post
        await unlikePost(post.id);
      } else {
        // Like the post
        await likePost(post.id);
      }

      // Notify parent component of likes change
      onLikesChange?.(post.id, newCount);
    } catch {
      // Revert optimistic update on error
      setUserHasLiked(previousLikeState);
      setLikesCount(previousCount);

      const errorMsg = userHasLiked
        ? t('posts.unlikeError', 'Failed to unlike post. Please try again.')
        : t('posts.likeError', 'Failed to like post. Please try again.');

      handleApiError(new Error(errorMsg));
    } finally {
      setIsLiking(false);
    }
  }, [isAuthenticated, isLiking, userHasLiked, likesCount, post.id, onLikesChange, t]);

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

      {/* Footer: Engagement Actions and Counts */}
      <div className="px-6 py-3 border-t bg-muted/50">
        {/* Engagement buttons */}
        <div className="flex items-center gap-2 mb-2">
          {isAuthenticated ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLikeClick}
              disabled={isLiking}
              className="h-8 px-2 text-xs"
              title={userHasLiked ? t('posts.unlike', 'Unlike') : t('posts.like', 'Like')}
            >
              <Heart
                className={`h-4 w-4 mr-1 ${
                  userHasLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
                }`}
              />
              {t('posts.like', 'Like')}
            </Button>
          ) : null}
        </div>

        {/* Engagement counts */}
        <div className="text-xs text-muted-foreground flex gap-4">
          <span>
            {t('posts.likes', { defaultValue: '{{count}} likes', count: likesCount })}
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
      </div>
    </Card>
  );
}
