import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ForumPostListItem } from '../components/ForumPostListItem';
import { Button } from '../components/ui/button';
import { ForumCategory, ForumSortBy } from '../../types/post';
import type { PostWithAuthor } from '../../types/post';
import { ApiError } from '../services/apiClient';
import { toast } from 'sonner';
import { Plus, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const POSTS_PER_PAGE = 30;

/**
 * ForumPage Component
 * Displays posts in forum-style list view (inspired by 1Point3Acres)
 * Features: Category filtering, sorting (latest/hot/most_replies/most_views), pagination
 */
export function ForumPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>(ForumSortBy.Hot);

  // Fetch posts when filters change
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query params
        const params = new URLSearchParams();
        params.append('limit', String(POSTS_PER_PAGE));
        params.append('offset', String(offset));
        params.append('sortBy', sortBy);

        if (selectedCategory !== 'all') {
          params.append('category', selectedCategory);
        }

        const url = `/api/v1/posts?${params.toString()}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Failed to load forum posts');
        }

        const data = await response.json();
        setPosts(data.posts || []);
        setTotal(data.total || 0);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to load forum posts';
        setError(message);
        toast.error(message);
        console.error('Error loading forum posts:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [offset, selectedCategory, sortBy]);

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

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setOffset(0); // Reset to first page
  };

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    setOffset(0); // Reset to first page
  };

  const handleCreatePost = () => {
    navigate('/forum/create');
  };

  // Render loading state
  if (loading && posts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t('forum.title', 'Forum')}</h1>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && posts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t('forum.title', 'Forum')}</h1>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <p className="text-destructive">{error}</p>
          <Button onClick={() => setOffset(0)}>
            {t('common.tryAgain', 'Try Again')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('forum.title', 'Forum')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('forum.subtitle', 'Join the discussion and share your thoughts')}
          </p>
        </div>
        {user && (
          <Button onClick={handleCreatePost}>
            <Plus className="w-4 h-4 mr-2" />
            {t('forum.createPost', 'New Post')}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-lg border">
        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t('forum.category.label', 'Category')}:</span>
          <div className="flex gap-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleCategoryChange('all')}
            >
              {t('forum.category.all', 'All')}
            </Button>
            {Object.values(ForumCategory).map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleCategoryChange(category)}
              >
                {t(`forum.category.${category}`, category)}
              </Button>
            ))}
          </div>
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm font-medium">{t('forum.sortBy', 'Sort by')}:</span>
          <div className="flex gap-2">
            <Button
              variant={sortBy === ForumSortBy.Hot ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortChange(ForumSortBy.Hot)}
            >
              {t('forum.sort.hot', 'Hot')}
            </Button>
            <Button
              variant={sortBy === ForumSortBy.Latest ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortChange(ForumSortBy.Latest)}
            >
              {t('forum.sort.latest', 'Latest')}
            </Button>
            <Button
              variant={sortBy === ForumSortBy.MostReplies ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortChange(ForumSortBy.MostReplies)}
            >
              {t('forum.sort.mostReplies', 'Most Replies')}
            </Button>
            <Button
              variant={sortBy === ForumSortBy.MostViews ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortChange(ForumSortBy.MostViews)}
            >
              {t('forum.sort.mostViews', 'Most Views')}
            </Button>
          </div>
        </div>
      </div>

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className="flex items-center justify-center min-h-[400px] bg-white rounded-lg border">
          <p className="text-muted-foreground">{t('forum.noPosts', 'No posts yet')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          {posts.map((post) => (
            <ForumPostListItem key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {total > POSTS_PER_PAGE && (
        <div className="flex items-center justify-between gap-4 pt-6">
          <div className="text-sm text-muted-foreground">
            {t('forum.pageInfo', 'Showing {{start}}-{{end}} of {{total}}', {
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
              {t('forum.previous', 'Previous')}
            </Button>
            <Button
              onClick={handleNextPage}
              disabled={!hasNextPage || loading}
            >
              {t('forum.next', 'Next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ForumPage;
