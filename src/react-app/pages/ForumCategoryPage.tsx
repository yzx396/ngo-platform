import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { forumService } from '../services/forumService';
import { ForumCategory, GetThreadsResponse } from '../../types/forum';
import ThreadCard from '../components/ThreadCard';

const THREADS_PER_PAGE = 20;

/**
 * ForumCategoryPage Component
 * Displays threads in a specific forum category
 * Styling matches EventsPage layout
 */
export default function ForumCategoryPage() {
  const { t } = useTranslation();
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();

  const [category, setCategory] = useState<ForumCategory | null>(null);
  const [data, setData] = useState<GetThreadsResponse>({
    threads: [],
    total: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!categoryId) return;

      try {
        setLoading(true);
        setError(null);

        // Load category
        const cat = await forumService.getCategory(categoryId);
        setCategory(cat);

        // Load threads
        const offset = (currentPage - 1) * THREADS_PER_PAGE;
        const result = await forumService.getThreads(categoryId, THREADS_PER_PAGE, offset);
        setData(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : t('forums.errorLoadingCategory');
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [categoryId, currentPage, t]);

  // Get translated category name and description, fallback to database values
  const getCategoryName = (cat: ForumCategory) => {
    const translationKey = `forums.categories.${cat.slug}.name`;
    const translated = t(translationKey, { defaultValue: cat.name });
    return translated === translationKey ? cat.name : translated;
  };

  const getCategoryDescription = (cat: ForumCategory) => {
    if (!cat.description) return '';
    const translationKey = `forums.categories.${cat.slug}.description`;
    const translated = t(translationKey, { defaultValue: cat.description });
    return translated === translationKey ? cat.description : translated;
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{t('forums.errorPrefix')} {error}</p>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('forums.categoryNotFound')}</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(data.total / THREADS_PER_PAGE);
  const startIndex = data.threads.length > 0 ? (currentPage - 1) * THREADS_PER_PAGE + 1 : 0;
  const endIndex = Math.min(currentPage * THREADS_PER_PAGE, data.total);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Link 
          to="/forums" 
          className="text-primary hover:text-primary/80 text-sm inline-block mb-2 transition-colors"
        >
          ← {t('forums.backToForums')}
        </Link>
        <div className="flex items-center gap-3">
          {category.icon && <span className="text-3xl">{category.icon}</span>}
          <h1 className="text-3xl font-bold">{getCategoryName(category)}</h1>
        </div>
        {category.description && (
          <p className="text-muted-foreground">{getCategoryDescription(category)}</p>
        )}
      </div>

      {/* Stats and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="text-sm text-muted-foreground">
          {t('forums.showingThreads', {
            start: startIndex,
            end: endIndex,
            total: data.total,
          })}
        </div>
        <button
          onClick={() => navigate(`/forums/category/${categoryId}/create`)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          {t('forums.newThread')}
        </button>
      </div>

      {/* Threads Grid */}
      <div className="grid gap-4">
        {data.threads.length > 0 ? (
          data.threads.map(thread => (
            <ThreadCard key={thread.id} thread={thread} />
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t('forums.noThreadsYet')}</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('forums.previous')}
          </button>

          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  currentPage === page
                    ? 'bg-primary text-primary-foreground'
                    : 'border hover:bg-accent'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('forums.next')}
          </button>
        </div>
      )}
    </div>
  );
}
