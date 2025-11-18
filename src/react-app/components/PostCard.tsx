import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { MoreHorizontal, Edit2, Trash2, Heart, MessageSquare, Loader2 } from 'lucide-react';
import { getPostTypeName, formatPostTime } from '../../types/post';
import { likePost, unlikePost } from '../services/postService';
import { handleApiError } from '../services/apiClient';
import { PostComments } from './PostComments';
import { CommentForm } from './CommentForm';
import type { Post, PostType } from '../../types/post';
import { sanitizeHtml } from '../utils/blogUtils';

interface PostCardProps {
  post: Post & { author_name?: string; user_has_liked?: boolean };
  onEdit?: (post: Post) => void;
  onDelete?: (postId: string) => void;
  onLikesChange?: (postId: string, newLikesCount: number) => void;
  showTruncated?: boolean; // Whether to truncate long content
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
 * - Memoized to prevent unnecessary re-renders
 */
function PostCardComponent({
  post,
  onEdit,
  onDelete,
  onLikesChange,
  showTruncated = true,
}: PostCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [userHasLiked, setUserHasLiked] = useState(post.user_has_liked || false);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const [showComments, setShowComments] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Initialize/update like status when post changes
  useEffect(() => {
    setUserHasLiked(post.user_has_liked || false);
  }, [post.id, post.user_has_liked]);

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
    <Card className="group flex flex-col h-full border-l-4 border-l-accent hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      {/* Header: Author, Post Type, and Menu */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-bold text-base text-foreground">
              {post.author_name || 'Anonymous'}
            </h3>
            <p className="text-xs text-muted-foreground font-medium">{timeAgo}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {post.post_type && (
              <Badge variant={getBadgeVariant(post.post_type)} className="font-medium">
                {t(`postType.${post.post_type}`, postTypeLabel)}
              </Badge>
            )}
            {canEdit && (
              <div className="relative">
                <Button
                  ref={triggerRef}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-muted"
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                {menuOpen && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 z-50 min-w-[160px] overflow-hidden rounded-lg border border-border bg-card p-1 text-foreground shadow-lg"
                  >
                    <button
                      onClick={() => {
                        onEdit?.(post);
                        setMenuOpen(false);
                      }}
                      className="relative flex w-full cursor-pointer select-none items-center rounded-md px-2 py-2 text-sm outline-none transition-colors hover:bg-muted focus:bg-muted font-medium"
                    >
                      <Edit2 className="mr-2 h-4 w-4" />
                      {t('posts.edit')}
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="relative flex w-full cursor-pointer select-none items-center rounded-md px-2 py-2 text-sm outline-none transition-colors hover:bg-destructive/10 focus:bg-destructive/10 disabled:opacity-50 disabled:pointer-events-none text-destructive font-medium"
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
        {(() => {
          const TRUNCATE_LENGTH = 300;
          const shouldTruncate = showTruncated && post.content.length > TRUNCATE_LENGTH;
          const displayContent = shouldTruncate
            ? post.content.substring(0, TRUNCATE_LENGTH) + '...'
            : post.content;

          return (
            <div className="space-y-2">
              <div
                className="text-sm text-foreground prose prose-sm max-w-none break-words"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(displayContent) }}
              />
              {shouldTruncate && (
                <button
                  onClick={() => navigate(`/posts/${post.id}`)}
                  className="text-primary hover:underline text-sm font-medium inline-flex items-center"
                >
                  {t('posts.readMore', 'Read more')}
                </button>
              )}
            </div>
          );
        })()}
      </CardContent>

      {/* Footer: Engagement Actions and Counts */}
      <div className="px-6 py-3 border-t border-border/50 bg-muted/30">
        {/* Engagement buttons */}
        <div className="flex items-center gap-3 mb-2">
          {isAuthenticated ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLikeClick}
                disabled={isLiking}
                className="h-8 px-3 text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors"
                title={userHasLiked ? t('comments.unlike', 'Unlike') : t('comments.like', 'Like')}
              >
                {isLiking ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Heart
                    className={`h-4 w-4 mr-1.5 transition-all ${
                      userHasLiked ? 'fill-primary text-primary scale-110' : 'text-muted-foreground'
                    }`}
                  />
                )}
                {t('comments.like', 'Like')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(!showComments)}
                className="h-8 px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                title={t('comments.comment', 'Comment')}
              >
                <MessageSquare className="h-4 w-4 mr-1.5" />
                {t('comments.comment', 'Comment')}
              </Button>
            </>
          ) : null}
        </div>

        {/* Engagement counts */}
        <div className="text-xs text-muted-foreground flex gap-4">
          <span className="font-medium">
            {t('posts.likes', { defaultValue: '{{count}} likes', count: likesCount })}
          </span>
          <button
            onClick={() => setShowComments(!showComments)}
            className="hover:text-foreground cursor-pointer font-medium transition-colors"
          >
            {t('posts.comments', { defaultValue: '{{count}} comments', count: commentsCount })}
          </button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-6 py-4 border-t border-border/50 space-y-4 bg-card">
          {commentsCount > 0 && (
            <PostComments
              postId={post.id}
              onCommentDeleted={() => setCommentsCount((c) => Math.max(0, c - 1))}
            />
          )}
          {isAuthenticated && (
            <div className="bg-background rounded-lg p-3 border border-border/50">
              <CommentForm
                postId={post.id}
                onCommentCreated={() => setCommentsCount((c) => c + 1)}
                placeholder={t('posts.addComment', 'Add a comment...')}
              />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// Export memoized component to prevent unnecessary re-renders
// Only re-render if post, callbacks, or user_has_liked changes
export const PostCard = memo(PostCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.user_has_liked === nextProps.post.user_has_liked &&
    prevProps.post.likes_count === nextProps.post.likes_count &&
    prevProps.post.comments_count === nextProps.post.comments_count &&
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onLikesChange === nextProps.onLikesChange
  );
});
