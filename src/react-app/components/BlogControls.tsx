import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BlogControlsProps {
  selectedFilter: 'all' | 'featured';
  onFilterChange: (filter: 'all' | 'featured') => void;
  isAuthenticated: boolean;
}

/**
 * BlogControls Component
 * Encapsulates the filter dropdown and create blog button
 * Reduces duplication across different blog page states
 */
export function BlogControls({
  selectedFilter,
  onFilterChange,
  isAuthenticated,
}: BlogControlsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      {/* Filter Section */}
      <div className="flex items-center gap-2">
        <label htmlFor="blog-filter" className="text-sm font-medium whitespace-nowrap">
          {t('blogs.filterLabel', 'Filter')}
        </label>
        <select
          id="blog-filter"
          value={selectedFilter}
          onChange={(e) => onFilterChange(e.target.value as 'all' | 'featured')}
          className="rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">{t('blogs.allBlogs', 'All Blogs')}</option>
          <option value="featured">{t('blogs.featuredBlogs', 'Featured Blogs')}</option>
        </select>
      </div>

      {/* Create Blog Button */}
      {isAuthenticated && (
        <Button onClick={() => navigate('/blogs/create')}>
          <Plus className="w-4 h-4 mr-2" />
          {t('blogs.create', 'Create Blog')}
        </Button>
      )}
    </div>
  );
}
