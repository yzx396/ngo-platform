import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Loader2, ArrowLeft, Star, Edit, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || t('blogs.notFound')}
        </div>
      </div>
    );
  }

  const isAuthor = user?.id === blog.user_id;
  const isAdmin = user?.role === 'admin';
  const canEdit = isAuthor;
  const canDelete = isAuthor || isAdmin;
  const canFeature = isAdmin;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/blogs')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('blogs.backToBlogs')}
      </button>

      {/* Blog Content */}
      <article className="bg-white rounded-lg shadow-md p-8 mb-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <h1 className="text-3xl font-bold mb-2">{blog.title}</h1>
            {blog.featured && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded">
                <Star className="w-4 h-4 fill-current" />
                {t('blogs.featured')}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">{blog.author_name}</span>
            <span className="mx-2">•</span>
            <span>{new Date(blog.created_at * 1000).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Content */}
        <div className="prose max-w-none mb-6 whitespace-pre-wrap">
          {blog.content}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-6 pt-6 border-t">
          {/* Like Button */}
          {user && (
            <button
              onClick={userHasLiked ? handleUnlike : handleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                userHasLiked
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Heart className={`w-5 h-5 ${userHasLiked ? 'fill-current' : ''}`} />
              <span>{blog.likes_count}</span>
            </button>
          )}
          {!user && (
            <div className="flex items-center gap-2 text-gray-600">
              <Heart className="w-5 h-5" />
              <span>{blog.likes_count}</span>
            </div>
          )}

          {/* Comments Count */}
          <div className="flex items-center gap-2 text-gray-600">
            <MessageCircle className="w-5 h-5" />
            <span>{blog.comments_count}</span>
          </div>

          {/* Edit/Delete/Feature Buttons */}
          <div className="ml-auto flex items-center gap-2">
            {canFeature && (
              <button
                onClick={handleFeature}
                className="px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors"
              >
                {blog.featured ? t('blogs.unfeature') : t('blogs.feature')}
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => navigate(`/blogs/${id}/edit`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Edit className="w-4 h-4" />
                {t('blogs.edit')}
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {t('blogs.delete')}
              </button>
            )}
          </div>
        </div>
      </article>

      {/* Comments Section */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6">
          {t('blogs.comments')} ({comments.length})
        </h2>

        {/* Comment Form */}
        {user && (
          <form onSubmit={handleSubmitComment} className="mb-8">
            <textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder={t('blogs.addComment')}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
            <button
              type="submit"
              disabled={submittingComment || !commentContent.trim()}
              className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {submittingComment ? t('blogs.submitting') : t('blogs.submit')}
            </button>
          </form>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="border-l-4 border-gray-200 pl-4 py-2">
              <div className="text-sm text-gray-600 mb-1">
                <span className="font-medium">{comment.author_name}</span>
                <span className="mx-2">•</span>
                <span>{new Date(comment.created_at * 1000).toLocaleDateString()}</span>
              </div>
              <p className="text-gray-800 whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-gray-600 text-center py-8">{t('blogs.noComments')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
