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
    <Card className="group flex flex-col h-full border-l-4 border-l-secondary hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      {/* Header: Title and Featured Badge */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <Link
            to={`/blogs/${blog.id}`}
            className="text-lg font-bold hover:text-primary transition-colors flex-1 leading-tight"
          >
            {blog.title}
          </Link>
          <div className="flex gap-2 flex-shrink-0">
            {blog.requires_auth && (
              <Badge variant="outline" className="gap-1 text-xs font-medium border-muted-foreground/30">
                <Lock className="w-3 h-3" />
                {t('blogs.membersOnly', 'Members')}
              </Badge>
            )}
            {blog.featured && (
              <Badge variant="secondary" className="gap-1 text-xs font-medium bg-accent/10 text-accent-foreground border-accent/20">
                <Star className="w-3 h-3 fill-current" />
                {t('blogs.featured')}
              </Badge>
            )}
          </div>
        </div>
        {/* Author and Date */}
        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
          <span className="font-semibold text-foreground">{blog.author_name}</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
          <span>{formattedDate}</span>
        </div>
      </CardHeader>

      {/* Content Preview */}
      <CardContent className="flex-1 pb-3">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
          {previewContent}
        </p>
      </CardContent>

      {/* Footer: Engagement Actions and Counts */}
      {showActions && (
        <div className="px-6 py-3 border-t border-border/50 bg-muted/30 space-y-3">
          {/* Row 1: Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLikeClick}
              className="h-8 px-3 text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors"
              title={blog.liked_by_user ? t('comments.unlike', 'Unlike') : t('comments.like', 'Like')}
            >
              <Heart
                className={`h-4 w-4 mr-1.5 transition-all ${
                  blog.liked_by_user ? 'fill-primary text-primary scale-110' : 'text-muted-foreground'
                }`}
              />
              {t('comments.like', 'Like')}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="h-8 px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <MessageCircle className="h-4 w-4 mr-1.5" />
              {t('comments.comment', 'Comment')}
            </Button>
          </div>

          {/* Row 2: Engagement Counts and Read More */}
          <div className="text-xs text-muted-foreground flex gap-4 items-center">
            <span className="font-medium">
              {t('blogs.likes', { defaultValue: '{{count}} likes', count: blog.likes_count })}
            </span>
            <span className="font-medium">
              {t('blogs.comments', { defaultValue: '{{count}} comments', count: commentCount })}
            </span>
            <Link
              to={`/blogs/${blog.id}`}
              className="text-primary hover:text-primary/80 font-semibold ml-auto inline-flex items-center gap-1 transition-colors"
            >
              {t('blogs.readMore', 'Read More')}
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
          </div>

          {/* Comments section */}
          {showComments && (
            <div className="pt-3 border-t border-border/50 space-y-3 animate-in fade-in duration-300">
              <div>
                <BlogComments blogId={blog.id} compactMode={true} limit={10} />
              </div>
              {commentCount > 10 && (
                <Link
                  to={`/blogs/${blog.id}#comments`}
                  className="text-xs text-primary hover:text-primary/80 font-medium block text-center py-2 transition-colors"
                >
                  {t('blogs.viewAllComments', 'View all comments')} →
                </Link>
              )}
              {user && (
                <div className="bg-background rounded-lg p-3 border border-border/50">
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
