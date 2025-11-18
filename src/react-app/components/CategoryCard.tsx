import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ForumCategory } from '../../types/forum';

interface CategoryCardProps {
  category: ForumCategory;
}

/**
 * CategoryCard Component
 * A simple, clickable card that displays a forum category
 * Clicking the card navigates to the category page
 * 
 * Design matches EventCard styling from EventsPage
 */
const CategoryCard = memo(function CategoryCard({ category }: CategoryCardProps) {
  const { t } = useTranslation();

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
    <Link
      to={`/forums/category/${category.id}`}
      className="block rounded-lg border overflow-hidden transition-all hover:shadow-md hover:border-primary/50"
    >
      <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left side: Icon, Name, Description */}
        <div className="flex-1 flex items-start gap-3">
          {category.icon && (
            <span className="text-2xl flex-shrink-0">{category.icon}</span>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 hover:text-primary transition-colors mb-1">
              {getCategoryName(category)}
            </h3>
            {category.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {getCategoryDescription(category)}
              </p>
            )}
          </div>
        </div>

        {/* Right side: Thread count */}
        <div className="flex-shrink-0 text-right">
          <div className="text-2xl font-bold text-primary">
            {category.thread_count || 0}
          </div>
          <div className="text-xs text-muted-foreground">
            {t('forums.threads')}
          </div>
        </div>
      </div>
    </Link>
  );
});

export default CategoryCard;
