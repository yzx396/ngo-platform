import { useTranslation } from 'react-i18next';

/**
 * LanguageSwitcher component
 * Allows users to switch between Chinese (默认/default) and English
 * Saves preference to localStorage for persistence
 */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const newLanguage = i18n.language === 'zh-CN' ? 'en' : 'zh-CN';
    i18n.changeLanguage(newLanguage);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors"
      title={t('language.selectLanguage')}
      aria-label="Toggle language"
    >
      {i18n.language === 'zh-CN' ? '中文' : 'EN'}
    </button>
  );
}
