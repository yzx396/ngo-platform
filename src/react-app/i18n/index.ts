import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import zhCN from './locales/zh-CN/translation.json';
import en from './locales/en/translation.json';

const resources = {
  'zh-CN': { translation: zhCN },
  en: { translation: en }
};

i18n
  // Load language detector plugin
  .use(LanguageDetector)
  // Load react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources,
    fallbackLng: 'zh-CN', // Default to Simplified Chinese
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false // React already handles XSS
    },
    detection: {
      // Language detection order:
      // 1. localStorage (user preference)
      // 2. sessionStorage
      // 3. HTML lang attribute
      // 4. navigator language
      // 5. fallback to zh-CN
      order: ['localStorage', 'sessionStorage', 'htmlTag', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
