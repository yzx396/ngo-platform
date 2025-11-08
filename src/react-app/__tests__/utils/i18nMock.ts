/**
 * i18n Mock Utilities
 *
 * Centralizes react-i18next mocking for component tests.
 * Eliminates repeated i18n mock definitions across test files.
 *
 * Usage:
 * ```typescript
 * import { i18nMock } from '../utils/i18nMock';
 *
 * vi.mock('react-i18next', i18nMock);
 * ```
 */

import { vi } from 'vitest';

// ============================================================================
// Translation Map
// ============================================================================

const translationMap: Record<string, string> = {
  // Common
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.success': 'Success',
  'common.yes': 'Yes',
  'common.no': 'No',

  // Auth
  'auth.login': 'Login',
  'auth.logout': 'Logout',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.signInWithGoogle': 'Sign in with Google',
  'auth.signOut': 'Sign Out',

  // User
  'user.profile': 'Profile',
  'user.editProfile': 'Edit Profile',
  'user.name': 'Name',
  'user.email': 'Email',
  'user.createdAt': 'Created',
  'user.updatedAt': 'Updated',

  // Mentor
  'mentor.profile': 'Mentor Profile',
  'mentor.browse': 'Browse Mentors',
  'mentor.nickName': 'Nickname',
  'mentor.bio': 'Bio',
  'mentor.hourlyRate': 'Hourly Rate',
  'mentor.availability': 'Availability',
  'mentor.paymentTypes': 'Payment Types',
  'mentor.linkedInUrl': 'LinkedIn Profile',
  'mentor.createProfile': 'Create Mentor Profile',
  'mentor.editProfile': 'Edit Mentor Profile',
  'mentor.deleteProfile': 'Delete Mentor Profile',
  'mentor.requestMentorship': 'Request Mentorship',

  // Match
  'match.mentorship': 'Mentorship',
  'match.request': 'Request Mentorship',
  'match.introduction': 'Introduction',
  'match.preferredTime': 'Preferred Time',
  'match.status': 'Status',
  'match.pending': 'Pending',
  'match.accepted': 'Accepted',
  'match.active': 'Active',
  'match.completed': 'Completed',
  'match.rejected': 'Rejected',
  'match.respond': 'Respond',
  'match.accept': 'Accept',
  'match.reject': 'Reject',
  'match.complete': 'Complete',

  // Post
  'post.create': 'Create Post',
  'post.content': 'Content',
  'post.type': 'Type',
  'post.like': 'Like',
  'post.unlike': 'Unlike',
  'post.comment': 'Comment',
  'post.comments': 'Comments',

  // Navigation
  'nav.home': 'Home',
  'nav.browse': 'Browse',
  'nav.matches': 'Matches',
  'nav.posts': 'Posts',
  'nav.leaderboard': 'Leaderboard',
  'nav.profile': 'Profile',

  // Errors
  'error.required': 'This field is required',
  'error.invalidEmail': 'Invalid email address',
  'error.network': 'Network error',
  'error.unauthorized': 'You must be logged in',
  'error.forbidden': 'You do not have permission',
  'error.notFound': 'Not found',
  'error.server': 'Server error',
};

// ============================================================================
// Mock Implementation
// ============================================================================

/**
 * Creates the react-i18next mock
 */
export const i18nMock = {
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => {
      // Return translation if exists, otherwise return the key or default
      if (translationMap[key]) {
        return translationMap[key];
      }
      return defaultValue || key;
    },
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
      t: (key: string) => translationMap[key] || key,
    },
  }),
  init: vi.fn(),
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
};

// ============================================================================
// Translation Helper
// ============================================================================

/**
 * Adds a custom translation
 */
export function addTranslation(key: string, value: string) {
  translationMap[key] = value;
}

/**
 * Adds multiple translations
 */
export function addTranslations(translations: Record<string, string>) {
  Object.assign(translationMap, translations);
}

/**
 * Clears all custom translations
 */
export function clearTranslations() {
  Object.keys(translationMap).forEach(key => {
    if (!key.startsWith('common.') && !key.startsWith('auth.') && !key.startsWith('user.')) {
      delete translationMap[key];
    }
  });
}

/**
 * Sets the language
 */
export function setLanguage(_language: 'en' | 'zh') {
  // In tests, we don't actually change languages
  // This is just for compatibility with components that check the language
  void _language;
}

/**
 * Gets a translation
 */
export function getTranslation(key: string): string {
  return translationMap[key] || key;
}

/**
 * Checks if a translation exists
 */
export function hasTranslation(key: string): boolean {
  return key in translationMap;
}
