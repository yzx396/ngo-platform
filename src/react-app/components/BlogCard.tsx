import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star, MessageCircle, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { BlogComments } from './BlogComments';
import { CommentForm } from './CommentForm';
import type { BlogWithLikeStatus } from '../../types/blog';
import { getTruncatedText } from '../utils/blogUtils';

interface BlogCardProps {
  blog: BlogWithLikeStatus;
  onLike?: (blogId: string) => void;
  onUnlike?: (blogId: string) => void;
  showActions?: boolean;
}

export function BlogCard({ blog, onLike, onUnlike, showActions = true }: BlogCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(blog.comments_count);

  const handleLikeClick = () => {
    if (blog.liked_by_user) {
      onUnlike?.(blog.id);
    } else {
      onLike?.(blog.id);
    }
  };

  const handleCommentCreated = () => {
    setCommentCount((prev) => prev + 1);
  };

  // Truncate content for preview (strip HTML and truncate text)
  const previewContent = getTruncatedText(blog.content, 200);

  const formattedDate = new Date(blog.created_at * 1000).toLocaleDateString();

  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      {/* Header: Title and Featured Badge */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <Link
            to={`/blogs/${blog.id}`}
            className="text-lg font-semibold hover:text-primary transition-colors flex-1"
          >
            {blog.title}
          </Link>
          <div className="flex gap-2 flex-shrink-0">
            {blog.requires_auth && (
              <Badge variant="outline" className="gap-1">
                <Lock className="w-3 h-3" />
                {t('blogs.membersOnly', 'Members')}
              </Badge>
            )}
            {blog.featured && (
              <Badge variant="secondary" className="gap-1">
                <Star className="w-3 h-3 fill-current" />
                {t('blogs.featured')}
              </Badge>
            )}
          </div>
        </div>
        {/* Author and Date */}
        <div className="text-xs text-muted-foreground mt-2">
          <span className="font-medium">{blog.author_name}</span>
          <span className="mx-2">•</span>
          <span>{formattedDate}</span>
        </div>
      </CardHeader>

      {/* Content Preview */}
      <CardContent className="flex-1 pb-3">
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
          {previewContent}
        </p>
      </CardContent>

      {/* Footer: Engagement Actions and Counts */}
      {showActions && (
        <div className="px-6 py-3 border-t bg-muted/50 space-y-3">
          {/* Row 1: Action Buttons */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLikeClick}
              className="h-8 px-2 text-xs"
              title={blog.liked_by_user ? t('comments.unlike', 'Unlike') : t('comments.like', 'Like')}
            >
              <Heart
                className={`h-4 w-4 mr-1 ${
                  blog.liked_by_user ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
                }`}
              />
              {t('comments.like', 'Like')}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              {t('comments.comment', 'Comment')}
            </Button>
          </div>

          {/* Row 2: Engagement Counts and Read More */}
          <div className="text-xs text-muted-foreground flex gap-4 items-center">
            <span>
              {t('blogs.likes', { defaultValue: '{{count}} likes', count: blog.likes_count })}
            </span>
            <span>
              {t('blogs.comments', { defaultValue: '{{count}} comments', count: commentCount })}
            </span>
            <Link
              to={`/blogs/${blog.id}`}
              className="text-primary hover:underline ml-auto"
            >
              {t('blogs.readMore', 'Read More')} →
            </Link>
          </div>

          {/* Comments section */}
          {showComments && (
            <div className="pt-3 border-t space-y-3 animate-in fade-in duration-300">
              <div>
                <BlogComments blogId={blog.id} compactMode={true} limit={10} />
              </div>
              {commentCount > 10 && (
                <Link
                  to={`/blogs/${blog.id}#comments`}
                  className="text-xs text-primary hover:underline block text-center py-2"
                >
                  {t('blogs.viewAllComments', 'View all comments')} →
                </Link>
              )}
              {user && (
                <div className="bg-background rounded p-3">
                  <CommentForm
                    blogId={blog.id}
                    onCommentCreated={handleCommentCreated}
                    placeholder={t('posts.addComment', 'Add a comment...')}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
