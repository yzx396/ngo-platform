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
      escapeValue: false, // React already handles XSS
      prefix: '{{',
      suffix: '}}'
    },
    detection: {
      // Language detection order:
      // 1. sessionStorage (user preference for current session)
      // 2. HTML lang attribute
      // 3. navigator language
      // 4. fallback to zh-CN
      order: ['sessionStorage', 'htmlTag', 'navigator'],
      caches: ['sessionStorage']
    }
  });

export default i18n;
