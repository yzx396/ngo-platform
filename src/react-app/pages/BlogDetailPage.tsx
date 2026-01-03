import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Heart, Loader2, ArrowLeft, Star, Edit, Trash2, MessageCircle, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { BlogComments } from '../components/BlogComments';
import { CommentForm } from '../components/CommentForm';
import {
  getBlogById,
  likeBlog,
  unlikeBlog,
  deleteBlog,
  featureBlog,
} from '../services/blogService';
import type { BlogWithAuthor } from '../../types/blog';
import { sanitizeHtml } from '../utils/blogUtils';

export function BlogDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [blog, setBlog] = useState<BlogWithAuthor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [userHasLiked, setUserHasLiked] = useState(false);

  const loadBlog = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getBlogById(id);
      setBlog(data);
      setUserHasLiked(false); // Will be set properly when loading with user context
    } catch {
      setError(t('blogs.loadError'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    if (id) {
      loadBlog();
    }
  }, [id, loadBlog]);

  // Auto-expand comments section when URL contains #comments hash
  useEffect(() => {
    if (location.hash === '#comments') {
      setShowComments(true);
    }
  }, [location.hash]);

  const handleLike = async () => {
    if (!id || !blog) return;
    try {
      const updated = await likeBlog(id);
      setBlog({ ...blog, likes_count: updated.likes_count });
      setUserHasLiked(true);
    } catch {
      // Error handled silently - UI already reflects attempt
    }
  };

  const handleUnlike = async () => {
    if (!id || !blog) return;
    try {
      const updated = await unlikeBlog(id);
      setBlog({ ...blog, likes_count: updated.likes_count });
      setUserHasLiked(false);
    } catch {
      // Error handled silently - UI already reflects attempt
    }
  };

  const handleCommentCreated = () => {
    if (blog) {
      setBlog({ ...blog, comments_count: blog.comments_count + 1 });
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm(t('blogs.confirmDelete'))) return;
    try {
      await deleteBlog(id);
      navigate('/blogs');
    } catch {
      // Error handled silently
    }
  };

  const handleFeature = async () => {
    if (!id || !blog) return;
    try {
      const response = await featureBlog(id, !blog.featured);
      setBlog({ ...blog, featured: response.blog.featured });
    } catch {
      // Error handled silently
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error || t('blogs.notFound')}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAuthor = user?.id === blog.user_id;
  const isAdmin = user?.role === 'admin';
  const canEdit = isAuthor;
  const canDelete = isAuthor || isAdmin;
  const canFeature = isAdmin;
  const isLocked = blog.requires_auth && !user;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/blogs')}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('blogs.backToBlogs')}
      </Button>

      {/* Blog Content Card */}
      <Card className="flex flex-col hover:shadow-md transition-shadow">
        {/* Header: Title and Featured Badge */}
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-3xl font-bold">{blog.title}</h1>
            {blog.featured && (
              <Badge variant="secondary" className="flex-shrink-0 gap-1">
                <Star className="w-3 h-3 fill-current" />
                {t('blogs.featured')}
              </Badge>
            )}
          </div>
          {/* Author and Date */}
          <div className="text-xs text-muted-foreground mt-2">
            <span className="font-medium">{blog.author_name}</span>
            <span className="mx-2">•</span>
            <span>{new Date(blog.created_at * 1000).toLocaleDateString()}</span>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="flex-1 pb-3">
          {isLocked ? (
            <div className="space-y-4">
              {/* Preview Content */}
              <div className="prose prose-sm max-w-none text-foreground break-words">
                <p className="text-muted-foreground italic">{blog.content}</p>
              </div>

              {/* Locked Content CTA */}
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="rounded-full bg-primary/10 p-3">
                      <Lock className="w-8 h-8 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">
                        {t('blogs.membersOnlyContent', 'Members-Only Content')}
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        {t('blogs.signInToRead', 'Sign in to read the full blog post and join our community of learners and mentors.')}
                      </p>
                    </div>
                    <Button
                      onClick={() => navigate('/login', { state: { from: location.pathname } })}
                      size="lg"
                      className="mt-2"
                    >
                      {t('auth.signIn', t('common.signIn', 'Sign In'))}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div
              className="prose prose-sm max-w-none text-foreground break-words"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(blog.content) }}
            />
          )}
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
                title={userHasLiked ? t('blogs.unlike', 'Unlike') : t('blogs.like', 'Like')}
              >
                <Heart
                  className={`h-4 w-4 mr-1 ${
                    userHasLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
                  }`}
                />
                {t('blogs.like', 'Like')}
              </Button>
            )}
            {!user && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Heart className="h-4 w-4" />
                <span>{blog.likes_count}</span>
              </div>
            )}
          </div>

          {/* Engagement Counts */}
          <div className="text-xs text-muted-foreground flex gap-4">
            <span>
              {t('blogs.likes', { defaultValue: '{{count}} likes', count: blog.likes_count })}
            </span>
            <span>
              {t('blogs.comments', { defaultValue: '{{count}} comments', count: blog.comments_count })}
            </span>
          </div>

          {/* Admin Controls */}
          {(canEdit || canDelete || canFeature) && (
            <div className="flex items-center gap-2 pt-2 border-t">
              {canFeature && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFeature}
                >
                  {blog.featured ? t('blogs.unfeature') : t('blogs.feature')}
                </Button>
              )}
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/blogs/${id}/edit`)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {t('blogs.edit')}
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('blogs.delete')}
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
              {t('blogs.comments', { defaultValue: '{{count}} comments', count: blog?.comments_count || 0 })}
            </h2>
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(!showComments)}
              >
                {showComments ? t('blogs.hideComments', 'Hide') : t('blogs.showComments', 'Show')}
              </Button>
            )}
          </div>
        </CardHeader>

        {showComments && (
          <CardContent className="flex-1 space-y-6 border-t">
            {/* Comments List */}
            {id && <BlogComments blogId={id} />}

            {/* Comment Form */}
            {user && id && (
              <CommentForm
                blogId={id!}
                onCommentCreated={handleCommentCreated}
              />
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
