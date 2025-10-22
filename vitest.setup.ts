import '@testing-library/jest-dom';
import i18n from './src/react-app/i18n';
import { vi } from 'vitest';

// Initialize i18n for tests
i18n.init().catch((err) => {
  console.warn('i18n initialization in tests:', err);
});

// Set language to English for consistent test behavior
i18n.changeLanguage('en');

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
