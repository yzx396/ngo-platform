import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PostCard } from '../components/PostCard';
import { Button } from '../components/ui/button';
import { getPosts } from '../services/postService';
import type { Post } from '../../types/post';
import { ApiError } from '../services/apiClient';
import { toast } from 'sonner';

const POSTS_PER_PAGE = 20;

/**
 * FeedPage Component
 * Displays a paginated feed of community posts
 * Users can view posts and pagination controls
 */
export function FeedPage() {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<(Post & { author_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  // Fetch posts when offset changes
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getPosts(POSTS_PER_PAGE, offset);
        setPosts(response.posts);
        setTotal(response.total);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to load posts';
        setError(message);
        toast.error(message);
        console.error('Error loading posts:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [offset]);

  // Calculate pagination info
  const hasNextPage = offset + POSTS_PER_PAGE < total;
  const hasPreviousPage = offset > 0;

  const handleNextPage = () => {
    setOffset((prev) => prev + POSTS_PER_PAGE);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePreviousPage = () => {
    setOffset((prev) => Math.max(prev - POSTS_PER_PAGE, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Render loading state
  if (loading && posts.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{t('posts.title', 'Community Feed')}</h1>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && posts.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{t('posts.title', 'Community Feed')}</h1>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <p className="text-destructive">{error}</p>
          <Button onClick={() => setOffset(0)}>
            {t('common.tryAgain', 'Try Again')}
          </Button>
        </div>
      </div>
    );
  }

  // Render empty state
  if (posts.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{t('posts.title', 'Community Feed')}</h1>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">{t('posts.noPosts', 'No posts yet')}</p>
        </div>
      </div>
    );
  }

  // Render feed
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t('posts.title', 'Community Feed')}</h1>
        <p className="text-muted-foreground">
          {t('posts.subtitle', 'See what the community is sharing')}
        </p>
      </div>

      {/* Posts Grid */}
      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onViewDetails={() => {
              // TODO: Navigate to post detail page in future slices
            }}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {total > POSTS_PER_PAGE && (
        <div className="flex items-center justify-between gap-4 pt-6 border-t">
          <div className="text-sm text-muted-foreground">
            {t('posts.pageInfo', 'Showing {{start}}-{{end}} of {{total}}', {
              start: offset + 1,
              end: Math.min(offset + POSTS_PER_PAGE, total),
              total,
            })}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePreviousPage}
              disabled={!hasPreviousPage || loading}
            >
              {t('posts.previous', 'Previous')}
            </Button>
            <Button
              onClick={handleNextPage}
              disabled={!hasNextPage || loading}
            >
              {t('posts.next', 'Next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeedPage;
