import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { PostCard } from '../components/PostCard';
import { EditPostDialog } from '../components/EditPostDialog';
import { FeedControls } from '../components/FeedControls';
import { Button } from '../components/ui/button';
import { getPosts, deletePost } from '../services/postService';
import type { Post, PostType } from '../../types/post';
import { ApiError } from '../services/apiClient';
import { toast } from 'sonner';

const POSTS_PER_PAGE = 20;

/**
 * FeedPage Component
 * Displays a paginated feed of community posts
 * Users can view posts, create posts (authenticated), and filter by post type
 */
export function FeedPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [posts, setPosts] = useState<(Post & { author_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedType, setSelectedType] = useState<PostType | 'all'>('all');
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Fetch posts when offset, filter, or refetch trigger changes
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        const postType = selectedType === 'all' ? undefined : selectedType;
        const response = await getPosts(POSTS_PER_PAGE, offset, postType);
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
  }, [offset, selectedType, refetchTrigger]);

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

  // Handle post creation - show new post to user
  const handlePostCreated = () => {
    setShowCreateForm(false); // Close the form after successful creation

    // If on first page, refetch to show new post
    // Otherwise, show toast notification to let user know new post is available
    if (offset === 0) {
      setRefetchTrigger((prev) => prev + 1); // Trigger refetch via useEffect
    } else {
      toast.info(t('posts.newPostAtTop', 'New post added at the top! Scroll up to see it.'));
    }
  };

  // Handle filter type change - reset to first page
  const handleFilterChange = (newType: PostType | 'all') => {
    setSelectedType(newType);
    setOffset(0); // Reset to first page when filter changes
  };

  // Handle edit button click
  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setEditDialogOpen(true);
  };

  // Handle delete button click
  const handleDeletePost = async (postId: string) => {
    try {
      await deletePost(postId);
      toast.success(t('posts.deleteSuccess'));
      // Remove the post from the list
      setPosts(posts.filter((p) => p.id !== postId));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('posts.deleteError');
      toast.error(message);
      console.error('Error deleting post:', err);
    }
  };

  // Handle post update from edit dialog
  const handlePostUpdated = () => {
    setEditDialogOpen(false);
    setRefetchTrigger((prev) => prev + 1); // Refetch current page to show updated post
  };

  // Render loading state
  if (loading && posts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{t('posts.title', 'Community Feed')}</h1>
          <p className="text-muted-foreground">
            {t('posts.subtitle', 'See what the community is sharing')}
          </p>
        </div>
        <FeedControls
          selectedType={selectedType}
          onTypeChange={handleFilterChange}
          showCreateForm={showCreateForm}
          onShowCreateFormChange={setShowCreateForm}
          onPostCreated={handlePostCreated}
          isAuthenticated={!!user}
        />
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
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{t('posts.title', 'Community Feed')}</h1>
          <p className="text-muted-foreground">
            {t('posts.subtitle', 'See what the community is sharing')}
          </p>
        </div>

        <FeedControls
          selectedType={selectedType}
          onTypeChange={handleFilterChange}
          showCreateForm={showCreateForm}
          onShowCreateFormChange={setShowCreateForm}
          onPostCreated={handlePostCreated}
          isAuthenticated={!!user}
        />

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
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{t('posts.title', 'Community Feed')}</h1>
          <p className="text-muted-foreground">
            {t('posts.subtitle', 'See what the community is sharing')}
          </p>
        </div>

        <FeedControls
          selectedType={selectedType}
          onTypeChange={handleFilterChange}
          showCreateForm={showCreateForm}
          onShowCreateFormChange={setShowCreateForm}
          onPostCreated={handlePostCreated}
          isAuthenticated={!!user}
        />

        {/* Empty state message */}
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

      <FeedControls
        selectedType={selectedType}
        onTypeChange={handleFilterChange}
        showCreateForm={showCreateForm}
        onShowCreateFormChange={setShowCreateForm}
        onPostCreated={handlePostCreated}
        isAuthenticated={!!user}
      />

      {/* Posts Grid */}
      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onViewDetails={() => {
              // TODO: Navigate to post detail page in future slices
            }}
            onEdit={handleEditPost}
            onDelete={handleDeletePost}
          />
        ))}
      </div>

      {/* Edit Post Dialog */}
      <EditPostDialog
        post={editingPost}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onPostUpdated={handlePostUpdated}
      />

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
