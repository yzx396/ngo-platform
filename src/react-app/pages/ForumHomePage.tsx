import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { forumService } from '../services/forumService';
import { ForumCategory } from '../../types/forum';
import CategoryCard from '../components/CategoryCard';
import { ForumControls } from '../components/ForumControls';

/**
 * ForumHomePage Component
 * Displays all forum categories grouped by parent category
 * Similar layout to EventsPage - showing all categories at once without expand/collapse
 */
export default function ForumHomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [allCategories, setAllCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        // Fetch ALL categories at once (parents + children)
        const cats = await forumService.getAllCategories();
        setAllCategories(cats);
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

  // Get translated category name, fallback to database value
  const getCategoryName = (cat: ForumCategory) => {
    const translationKey = `forums.categories.${cat.slug}.name`;
    const translated = t(translationKey, { defaultValue: cat.name });
    return translated === translationKey ? cat.name : translated;
  };

  // Group categories by parent
  const parentCategories = allCategories.filter(c => c.parent_id === null);

  return (
    <div className="space-y-8">
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
      {!loading && !error && allCategories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('forums.noCategoriesFound')}</p>
        </div>
      )}

      {/* Categories Grouped by Parent */}
      {!loading && !error && parentCategories.length > 0 && (
        <div className="space-y-8">
          {parentCategories.map(parent => {
            // Get children for this parent
            const children = allCategories.filter(c => c.parent_id === parent.id);

            return (
              <div key={parent.id} className="space-y-4">
                {/* Parent Category Header */}
                <h2 className="text-2xl font-semibold flex items-center gap-3">
                  {parent.icon && <span className="text-3xl">{parent.icon}</span>}
                  <span>{getCategoryName(parent)}</span>
                </h2>

                {/* Child Categories Grid */}
                {children.length > 0 ? (
                  <div className="grid gap-4">
                    {children.map(child => (
                      <CategoryCard key={child.id} category={child} />
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground pl-12">
                    {t('forums.noSubcategories')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
