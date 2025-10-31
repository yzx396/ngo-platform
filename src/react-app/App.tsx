// src/App.tsx

import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n from './i18n';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

// Lazy load pages for route-based code splitting
// Each page loads only when the user navigates to that route
// This reduces the initial bundle size significantly
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const OAuthCallbackPage = lazy(() => import('./pages/OAuthCallbackPage').then(m => ({ default: m.OAuthCallbackPage })));
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
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
 * Conditionally renders Navbar and Layout based on current route
 */
function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/auth/google/callback';

  return (
    <div className="min-h-screen bg-background">
      {!isAuthPage && <Navbar />}
      <Suspense fallback={<LoadingFallback />}>
        {!isAuthPage && (
          <Layout>
            <Routes>
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
                - /feed
                - /challenges
                - /blogs
                - /leaderboard
              */}
            </Routes>
          </Layout>
        )}
        {isAuthPage && (
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/google/callback" element={<OAuthCallbackPage />} />
          </Routes>
        )}
      </Suspense>
      <Toaster />
    </div>
  );
}

export default App;
