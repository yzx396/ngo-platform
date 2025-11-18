import { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ForumCategory } from '../../types/forum';
import { forumService } from '../services/forumService';

interface CategoryCardProps {
  category: ForumCategory;
}

const CategoryCard = memo(function CategoryCard({ category }: CategoryCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(false);

  const handleExpand = async () => {
    if (!expanded && children.length === 0) {
      try {
        setLoading(true);
        const childCategories = await forumService.getCategories(category.id);
        setChildren(childCategories);
      } catch (err) {
        console.error('Error loading child categories:', err);
      } finally {
        setLoading(false);
      }
    }
    setExpanded(!expanded);
  };

  // Get translated name and description, fallback to database values
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

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div
        className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer flex justify-between items-start transition-colors"
        onClick={handleExpand}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {category.icon && <span className="text-2xl">{category.icon}</span>}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{getCategoryName(category)}</h3>
              {category.description && (
                <p className="text-sm text-gray-600 mt-1">{getCategoryDescription(category)}</p>
              )}
            </div>
          </div>
        </div>
        <div className="text-right ml-4 flex-shrink-0">
          <div className="text-2xl font-bold text-blue-600">{category.thread_count}</div>
          <div className="text-xs text-gray-600">{t('forums.threads')}</div>
        </div>
      </div>

      {expanded && (
        <div className="border-t bg-white">
          {loading ? (
            <div className="p-4 text-center text-gray-500">{t('forums.loadingSubcategories')}</div>
          ) : children.length > 0 ? (
            <div className="divide-y">
              {children.map(child => (
                <Link
                  key={child.id}
                  to={`/forums/category/${child.id}`}
                  className="p-4 hover:bg-blue-50 flex justify-between items-start group transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {child.icon && <span>{child.icon}</span>}
                      <h4 className="font-medium text-gray-900 group-hover:text-blue-600">
                        {getCategoryName(child)}
                      </h4>
                    </div>
                    {child.description && (
                      <p className="text-sm text-gray-600 mt-1">{getCategoryDescription(child)}</p>
                    )}
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <div className="text-lg font-semibold text-gray-700">
                      {child.thread_count}
                    </div>
                    <div className="text-xs text-gray-600">{t('forums.threads')}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">{t('forums.noSubcategories')}</div>
          )}
        </div>
      )}
    </div>
  );
});

export default CategoryCard;
