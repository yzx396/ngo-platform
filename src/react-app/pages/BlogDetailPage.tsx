import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, Loader2, ArrowLeft, Star, Edit, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  getBlogById,
  likeBlog,
  unlikeBlog,
  deleteBlog,
  getBlogComments,
  createBlogComment,
  featureBlog,
} from '../services/blogService';
import type { BlogWithAuthor, BlogCommentWithAuthor } from '../../types/blog';

export function BlogDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [blog, setBlog] = useState<BlogWithAuthor | null>(null);
  const [comments, setComments] = useState<BlogCommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [userHasLiked, setUserHasLiked] = useState(false);

  const loadBlog = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getBlogById(id);
      setBlog(data);
      setUserHasLiked(false); // Will be set properly when loading with user context
    } catch (err) {
      console.error('Error loading blog:', err);
      setError(t('blogs.loadError'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  const loadComments = useCallback(async () => {
    if (!id) return;
    try {
      const response = await getBlogComments(id, 100, 0);
      setComments(response.comments);
    } catch (err) {
      console.error('Error loading comments:', err);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadBlog();
      loadComments();
    }
  }, [id, loadBlog, loadComments]);

  const handleLike = async () => {
    if (!id || !blog) return;
    try {
      const updated = await likeBlog(id);
      setBlog({ ...blog, likes_count: updated.likes_count });
      setUserHasLiked(true);
    } catch (err) {
      console.error('Error liking blog:', err);
    }
  };

  const handleUnlike = async () => {
    if (!id || !blog) return;
    try {
      const updated = await unlikeBlog(id);
      setBlog({ ...blog, likes_count: updated.likes_count });
      setUserHasLiked(false);
    } catch (err) {
      console.error('Error unliking blog:', err);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !commentContent.trim()) return;

    try {
      setSubmittingComment(true);
      const newComment = await createBlogComment(id, commentContent);
      setComments([...comments, newComment]);
      setCommentContent('');
      if (blog) {
        setBlog({ ...blog, comments_count: blog.comments_count + 1 });
      }
    } catch (err) {
      console.error('Error creating comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm(t('blogs.confirmDelete'))) return;
    try {
      await deleteBlog(id);
      navigate('/blogs');
    } catch (err) {
      console.error('Error deleting blog:', err);
    }
  };

  const handleFeature = async () => {
    if (!id || !blog) return;
    try {
      const response = await featureBlog(id, !blog.featured);
      setBlog({ ...blog, featured: response.blog.featured });
    } catch (err) {
      console.error('Error featuring blog:', err);
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
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
            {blog.content}
          </p>
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
          <h2 className="text-2xl font-bold">
            {t('blogs.comments')} ({comments.length})
          </h2>
        </CardHeader>

        <CardContent className="flex-1 space-y-6">
          {/* Comment Form */}
          {user && (
            <form onSubmit={handleSubmitComment} className="space-y-2">
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder={t('blogs.addComment')}
                className="w-full px-3 py-2 rounded-md border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
              />
              <Button
                type="submit"
                disabled={submittingComment || !commentContent.trim()}
                size="sm"
              >
                {submittingComment ? t('blogs.submitting') : t('blogs.submit')}
              </Button>
            </form>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="border-l-4 border-muted pl-4 py-2">
                <div className="text-xs text-muted-foreground mb-1">
                  <span className="font-medium">{comment.author_name}</span>
                  <span className="mx-2">•</span>
                  <span>{new Date(comment.created_at * 1000).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                {t('blogs.noComments')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
