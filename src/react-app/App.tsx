// src/App.tsx

import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n from './i18n';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

// Lazy load pages for route-based code splitting
// Each page loads only when the user navigates to that route
// This reduces the initial bundle size significantly
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const OAuthCallbackPage = lazy(() => import('./pages/OAuthCallbackPage').then(m => ({ default: m.OAuthCallbackPage })));
const MentorBrowse = lazy(() => import('./pages/MentorBrowse').then(m => ({ default: m.MentorBrowse })));
const MentorDetailPage = lazy(() => import('./pages/MentorDetailPage').then(m => ({ default: m.MentorDetailPage })));
const MentorProfileSetup = lazy(() => import('./pages/MentorProfileSetup').then(m => ({ default: m.MentorProfileSetup })));
const MatchesList = lazy(() => import('./pages/MatchesList').then(m => ({ default: m.MatchesList })));

/**
 * Loading fallback component for Suspense
 * Displays translated loading message
 */
function LoadingFallback() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center min-h-screen">
      {t('common.loading')}
    </div>
  );
}

/**
 * Main App component with routing
 * Implements navigation between key pages:
 * - Home/Dashboard
 * - Browse Mentors
 * - Create/Edit Mentor Profile
 * - View Matches
 */
function App() {
  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <Router>
            <AppContent />
          </Router>
        </AuthProvider>
      </I18nextProvider>
    </ErrorBoundary>
  );
}

/**
 * Inner component that can use routing hooks
 * Conditionally renders Navbar based on current route
 */
function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/auth/google/callback';

  return (
    <div className="min-h-screen bg-background">
      {!isAuthPage && <Navbar />}
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/google/callback" element={<OAuthCallbackPage />} />

          {/* Home Page - Public but shows different content based on auth state */}
          <Route path="/" element={<HomePage />} />

          {/* Public mentor browsing */}
          <Route path="/mentors/browse" element={<MentorBrowse />} />
          <Route path="/mentors/:id" element={<MentorDetailPage />} />

          {/* Protected Routes */}
          <Route
            path="/mentor/profile/setup"
            element={
              <ProtectedRoute>
                <MentorProfileSetup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/matches"
            element={
              <ProtectedRoute>
                <MatchesList />
              </ProtectedRoute>
            }
          />
          {/* TODO: Add more routes:
            - /mentor/profile/edit
          */}
        </Routes>
      </Suspense>
      <Toaster />
    </div>
  );
}

/**
 * Home/Dashboard page
 * Entry point for the application
 * Kept in App.tsx as inline component since it's critical path
 */
function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="container px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12">
        <div className="space-y-3 sm:space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter">
            {t('home.title')}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground">
            {t('home.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Browse Mentors Card */}
          <div className="bg-card border rounded-lg p-6 sm:p-8 space-y-4 hover:shadow-md transition-shadow">
            <div className="text-3xl sm:text-4xl">🔍</div>
            <h2 className="text-xl sm:text-2xl font-bold">{t('common.browseMentors')}</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              {t('home.feature1')}
            </p>
            <a href="/mentors/browse" className="inline-block">
              <button className="px-4 sm:px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 text-sm sm:text-base">
                {t('home.browseMentorsButton')} →
              </button>
            </a>
          </div>

          {/* Create Mentor Profile Card */}
          <div className="bg-card border rounded-lg p-6 sm:p-8 space-y-4 hover:shadow-md transition-shadow">
            <div className="text-3xl sm:text-4xl">👤</div>
            <h2 className="text-xl sm:text-2xl font-bold">{t('home.becomeMentorButton')}</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              {t('home.feature2')}
            </p>
            <a href="/mentor/profile/setup" className="inline-block">
              <button className="px-4 sm:px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 text-sm sm:text-base">
                {t('home.becomeMentorButton')} →
              </button>
            </a>
          </div>
        </div>

        {/* Features Section */}
        <div className="space-y-4 pt-6 sm:pt-8 border-t">
          <h2 className="text-xl sm:text-2xl font-bold">{t('home.keyFeatures')}</h2>
          <ul className="space-y-2 sm:space-y-3 text-muted-foreground">
            <li className="flex items-start gap-2 sm:gap-3">
              <span className="text-lg sm:text-2xl flex-shrink-0">✓</span>
              <span className="text-sm sm:text-base">{t('home.feature1')}</span>
            </li>
            <li className="flex items-start gap-2 sm:gap-3">
              <span className="text-lg sm:text-2xl flex-shrink-0">✓</span>
              <span className="text-sm sm:text-base">{t('home.feature3')}</span>
            </li>
            <li className="flex items-start gap-2 sm:gap-3">
              <span className="text-lg sm:text-2xl flex-shrink-0">✓</span>
              <span className="text-sm sm:text-base">{t('home.feature2')}</span>
            </li>
            <li className="flex items-start gap-2 sm:gap-3">
              <span className="text-lg sm:text-2xl flex-shrink-0">✓</span>
              <span className="text-sm sm:text-base">{t('home.feature4')}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
