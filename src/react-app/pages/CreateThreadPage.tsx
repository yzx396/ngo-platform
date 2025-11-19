import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { RichTextEditor } from '../components/RichTextEditor';
import { forumService } from '../services/forumService';
import { ForumCategory } from '../../types/forum';

export default function CreateThreadPage() {
  const { t } = useTranslation();
  const { categoryId: urlCategoryId } = useParams<{ categoryId?: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(urlCategoryId || '');
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Fetch categories for the dropdown
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const cats = await forumService.getAllCategories();
        setCategories(cats);
        // Auto-select if categoryId is provided
        if (urlCategoryId) {
          setSelectedCategoryId(urlCategoryId);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : t('forums.loadError');
        setError(message);
        console.error('Error loading categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, [urlCategoryId, t]);

  // Get translated category name, fallback to database value
  const getCategoryName = (cat: ForumCategory) => {
    const translationKey = `forums.categories.${cat.slug}.name`;
    const translated = t(translationKey, { defaultValue: cat.name });
    return translated === translationKey ? cat.name : translated;
  };

  // Strip HTML tags for character counter (like blogs)
  const getTextLength = (html: string) => {
    const plainText = html.replace(/<[^>]*>/g, '');
    return plainText.length;
  };

  // Group categories by parent for hierarchical display
  const groupedCategories = categories.reduce(
    (acc, cat) => {
      if (cat.parent_id === null) {
        // Parent category
        acc.parents.push(cat);
      } else {
        // Child category
        if (!acc.childrenByParent[cat.parent_id]) {
          acc.childrenByParent[cat.parent_id] = [];
        }
        acc.childrenByParent[cat.parent_id].push(cat);
      }
      return acc;
    },
    { parents: [], childrenByParent: {} } as {
      parents: ForumCategory[];
      childrenByParent: Record<string, ForumCategory[]>;
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCategoryId) {
      setError(t('forums.categoryRequired'));
      return;
    }

    if (!title.trim()) {
      setError(t('forums.titleRequired'));
      return;
    }

    if (!content.trim()) {
      setError(t('forums.contentRequired'));
      return;
    }

    try {
      setSubmitting(true);

      await forumService.createThread({
        category_id: selectedCategoryId,
        title: title.trim(),
        content: content.trim(),
      });

      // Navigate back to the category page
      navigate(`/forums/category/${selectedCategoryId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create thread';
      setError(message);
      console.error('Error creating thread:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCategories) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/forums')}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('forums.backToForums')}
      </Button>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t('forums.createNewThread')}</h1>
        <p className="text-muted-foreground">{t('forums.createDescription')}</p>
      </div>

      {/* Form Card */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category Selection */}
            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-medium">
                {t('forums.categoryLabel')} <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                disabled={submitting}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{t('forums.categoryPlaceholder')}</option>
                {groupedCategories.parents
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((parent) => {
                    const children = groupedCategories.childrenByParent[parent.id] || [];
                    return (
                      <optgroup key={parent.id} label={getCategoryName(parent)}>
                        {children
                          .sort((a, b) => a.display_order - b.display_order)
                          .map((child) => (
                            <option key={child.id} value={child.id}>
                              {getCategoryName(child)}
                            </option>
                          ))}
                      </optgroup>
                    );
                  })}
              </select>
              {categories.length === 0 && !loadingCategories && (
                <p className="text-xs text-red-500 mt-1">{t('forums.noCategoriesFound')}</p>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                {t('forums.titleLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('forums.titlePlaceholder')}
                maxLength={255}
                disabled={submitting}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                {title.length}/255 {t('forums.characters')}
              </p>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('forums.contentLabel')} <span className="text-red-500">*</span>
              </label>
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder={t('forums.contentPlaceholder')}
                disabled={submitting}
                minHeight="250px"
              />
              <p className="text-xs text-muted-foreground">
                {getTextLength(content)} {t('forums.characters')}
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={submitting || !title.trim() || !content.trim() || !selectedCategoryId}
                className="flex-1"
              >
                {submitting ? t('forums.creating') : t('forums.createThread')}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => navigate('/forums')}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
