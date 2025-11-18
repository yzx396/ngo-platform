import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { forumService } from '../services/forumService';
import { ForumCategory } from '../../types/forum';
import CategoryCard from '../components/CategoryCard';
import { ForumControls } from '../components/ForumControls';

export default function ForumHomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        const cats = await forumService.getCategories();
        setCategories(cats);
      } catch (err) {
        const message = err instanceof Error ? err.message : t('forums.loadError');
        setError(message);
        console.error('Error loading categories:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, [t]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <h1 className="text-3xl font-bold">{t('forums.title')}</h1>
          <p className="text-muted-foreground">{t('forums.subtitle')}</p>
        </div>
      </div>

      {/* Forum Controls: Create Thread Button */}
      <ForumControls isAuthenticated={Boolean(user)} />

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && categories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('forums.noCategoriesFound')}</p>
        </div>
      )}

      {/* Categories List */}
      {!loading && !error && categories.length > 0 && (
        <div className="space-y-4">
          {categories.map(category => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      )}
    </div>
  );
}
