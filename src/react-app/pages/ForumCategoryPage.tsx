import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { forumService } from '../services/forumService';
import { ForumCategory, GetThreadsResponse } from '../../types/forum';
import ThreadCard from '../components/ThreadCard';

const THREADS_PER_PAGE = 20;

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
        const message = err instanceof Error ? err.message : 'Failed to load threads';
        setError(message);
        console.error('Error loading category data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [categoryId, currentPage]);

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
      <div className="max-w-6xl mx-auto p-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading category...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Category not found</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(data.total / THREADS_PER_PAGE);

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <Link to="/forums" className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block">
          ← Back to Forums
        </Link>
        <div className="flex items-center gap-3 mb-2">
          {category.icon && <span className="text-3xl">{category.icon}</span>}
          <h1 className="text-4xl font-bold">{getCategoryName(category)}</h1>
        </div>
        {category.description && (
          <p className="text-gray-600 mt-2">{getCategoryDescription(category)}</p>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-gray-600">
          Showing {data.threads.length > 0 ? (currentPage - 1) * THREADS_PER_PAGE + 1 : 0} to{' '}
          {Math.min(currentPage * THREADS_PER_PAGE, data.total)} of {data.total} threads
        </div>
        <button
          onClick={() => navigate(`/forums/category/${categoryId}/create`)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          New Thread
        </button>
      </div>

      {/* Threads */}
      <div className="space-y-4 mb-8">
        {data.threads.length > 0 ? (
          data.threads.map(thread => (
            <ThreadCard key={thread.id} thread={thread} />
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No threads in this category yet</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-2 rounded-lg transition ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'border hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
