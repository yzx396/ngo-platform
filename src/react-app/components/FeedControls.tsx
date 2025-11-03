import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { CreatePostForm } from './CreatePostForm';
import { PenSquare } from 'lucide-react';
import type { PostType } from '../../types/post';

interface FeedControlsProps {
  selectedType: PostType | 'all';
  onTypeChange: (type: PostType | 'all') => void;
  showCreateForm: boolean;
  onShowCreateFormChange: (show: boolean) => void;
  onPostCreated: () => void;
  isAuthenticated: boolean;
}

/**
 * FeedControls Component
 * Encapsulates the filter dropdown and create post button to reduce duplication
 * across different feed states (loading, error, empty, normal)
 */
export function FeedControls({
  selectedType,
  onTypeChange,
  showCreateForm,
  onShowCreateFormChange,
  onPostCreated,
  isAuthenticated,
}: FeedControlsProps) {
  const { t } = useTranslation();

  // Close form when Escape key is pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showCreateForm) {
        onShowCreateFormChange(false);
      }
    };

    if (showCreateForm) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [showCreateForm, onShowCreateFormChange]);

  return (
    <>
      {/* Filter Dropdown and Create Post Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Filter Section */}
        <div className="flex items-center gap-2">
          <label htmlFor="post-type-filter" className="text-sm font-medium whitespace-nowrap">
            {t('posts.filterLabel', 'Filter by type')}
          </label>
          <select
            id="post-type-filter"
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value as PostType | 'all')}
            className="rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">{t('posts.filterAll', 'All Posts')}</option>
            <option value="announcement">{t('posts.filterAnnouncements', 'Announcements')}</option>
            <option value="discussion">{t('posts.filterDiscussions', 'Discussions')}</option>
            <option value="general">{t('posts.filterGeneral', 'General')}</option>
          </select>
        </div>

        {/* Create Post Button */}
        {isAuthenticated && !showCreateForm && (
          <Button onClick={() => onShowCreateFormChange(true)}>
            <PenSquare className="w-4 h-4 mr-2" />
            {t('posts.createButton', 'Create Post')}
          </Button>
        )}
      </div>

      {/* Create Post Form (if visible) */}
      {showCreateForm && (
        <CreatePostForm
          onPostCreated={() => {
            onPostCreated();
            onShowCreateFormChange(false);
          }}
          onCancel={() => onShowCreateFormChange(false)}
        />
      )}
    </>
  );
}
