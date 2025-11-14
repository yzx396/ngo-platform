import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Heart, Loader2, ArrowLeft, Edit, Trash2, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { PostComments } from '../components/PostComments';
import { CommentForm } from '../components/CommentForm';
import {
  getPostById,
  likePost,
  unlikePost,
  deletePost,
} from '../services/postService';
import type { Post, PostType } from '../../types/post';
import { getPostTypeName } from '../../types/post';
import { sanitizeHtml } from '../utils/blogUtils';

interface PostWithAuthorAndLike extends Post {
  author_name?: string;
  user_has_liked?: boolean;
}

export function PostDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [post, setPost] = useState<PostWithAuthorAndLike | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [userHasLiked, setUserHasLiked] = useState(false);

  const loadPost = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getPostById(id);
      setPost(data as PostWithAuthorAndLike);
      setUserHasLiked((data as PostWithAuthorAndLike).user_has_liked || false);
    } catch (err) {
      console.error('Error loading post:', err);
      setError(t('posts.loadPostError', 'Failed to load post'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    if (id) {
      loadPost();
    }
  }, [id, loadPost]);

  // Auto-expand comments section when URL contains #comments hash
  useEffect(() => {
    if (location.hash === '#comments') {
      setShowComments(true);
    }
  }, [location.hash]);

  const handleLike = async () => {
    if (!id || !post) return;
    try {
      const updated = await likePost(id);
      setPost({ ...post, likes_count: updated.likes_count });
      setUserHasLiked(true);
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const handleUnlike = async () => {
    if (!id || !post) return;
    try {
      const updated = await unlikePost(id);
      setPost({ ...post, likes_count: updated.likes_count });
      setUserHasLiked(false);
    } catch (err) {
      console.error('Error unliking post:', err);
    }
  };

  const handleCommentCreated = () => {
    if (post) {
      setPost({ ...post, comments_count: post.comments_count + 1 });
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm(t('posts.deleteConfirm'))) return;
    try {
      await deletePost(id);
      navigate('/feed');
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  const handleEdit = () => {
    // Navigate to feed page and trigger edit mode
    // We'll pass the post data via location state
    navigate('/feed', { state: { editPost: post } });
  };

  // Get badge color based on post type
  const getBadgeVariant = (postType: string) => {
    switch (postType) {
      case 'announcement':
        return 'default';
      case 'discussion':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error || t('posts.postNotFound', 'Post not found')}
            </div>
            <div className="mt-4">
              <Button onClick={() => navigate('/feed')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('posts.backToFeed', 'Back to Feed')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAuthor = user?.id === post.user_id;
  const isAdmin = user?.role === 'admin';
  const canEdit = isAuthor;
  const canDelete = isAuthor || isAdmin;

  const postTypeLabel = getPostTypeName(post.post_type as PostType);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/feed')}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('posts.backToFeed', 'Back to Feed')}
      </Button>

      {/* Post Content Card */}
      <Card className="flex flex-col hover:shadow-md transition-shadow">
        {/* Header: Author and Post Type */}
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h1 className="font-semibold text-xl">
                {post.author_name || 'Anonymous'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(post.created_at * 1000).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            {post.post_type && (
              <Badge variant={getBadgeVariant(post.post_type)} className="flex-shrink-0">
                {t(`postType.${post.post_type}`, postTypeLabel)}
              </Badge>
            )}
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="flex-1 pb-3">
          <div
            className="prose prose-sm max-w-none text-foreground break-words"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
          />
        </CardContent>

        {/* Footer: Engagement Actions and Admin Controls */}
        <div className="px-6 py-3 border-t bg-muted/50 space-y-4">
          {/* Like Button and Counts */}
          <div className="flex items-center gap-2">
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={userHasLiked ? handleUnlike : handleLike}
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
            )}
            {!user && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Heart className="h-4 w-4" />
                <span>{post.likes_count}</span>
              </div>
            )}
          </div>

          {/* Engagement Counts */}
          <div className="text-xs text-muted-foreground flex gap-4">
            <span>
              {t('posts.likes', { defaultValue: '{{count}} likes', count: post.likes_count })}
            </span>
            <span>
              {t('posts.comments', { defaultValue: '{{count}} comments', count: post.comments_count })}
            </span>
          </div>

          {/* Admin Controls */}
          {(canEdit || canDelete) && (
            <div className="flex items-center gap-2 pt-2 border-t">
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {t('posts.edit', 'Edit Post')}
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('posts.delete', 'Delete Post')}
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Comments Section */}
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              {t('posts.comments', { defaultValue: '{{count}} comments', count: post?.comments_count || 0 })}
            </h2>
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(!showComments)}
              >
                {showComments ? t('posts.hideComments', 'Hide') : t('posts.showComments', 'Show')}
              </Button>
            )}
          </div>
        </CardHeader>

        {showComments && (
          <CardContent className="flex-1 space-y-6 border-t">
            {/* Comments List */}
            {id && (
              <PostComments
                postId={id}
                onCommentDeleted={() => {
                  if (post) {
                    setPost({ ...post, comments_count: Math.max(0, post.comments_count - 1) });
                  }
                }}
              />
            )}

            {/* Comment Form */}
            {user && (
              <CommentForm
                postId={id}
                onCommentCreated={handleCommentCreated}
              />
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
