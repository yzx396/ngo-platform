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
import { FeatureRoute } from './components/FeatureRoute';
import { AuthProvider } from './context/AuthContext';
import { FeatureProvider } from './context/FeatureContext';

// Lazy load pages for route-based code splitting
// Each page loads only when the user navigates to that route
// This reduces the initial bundle size significantly
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const OAuthCallbackPage = lazy(() => import('./pages/OAuthCallbackPage').then(m => ({ default: m.OAuthCallbackPage })));
const FeedPage = lazy(() => import('./pages/FeedPage').then(m => ({ default: m.FeedPage })));
const EventsPage = lazy(() => import('./pages/EventsPage').then(m => ({ default: m.EventsPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage').then(m => ({ default: m.LeaderboardPage })));
const MentorBrowse = lazy(() => import('./pages/MentorBrowse').then(m => ({ default: m.MentorBrowse })));
const MentorDetailPage = lazy(() => import('./pages/MentorDetailPage').then(m => ({ default: m.MentorDetailPage })));
const MentorProfileSetup = lazy(() => import('./pages/MentorProfileSetup').then(m => ({ default: m.MentorProfileSetup })));
const UserProfileEdit = lazy(() => import('./pages/UserProfileEdit').then(m => ({ default: m.UserProfileEdit })));
const MatchesList = lazy(() => import('./pages/MatchesList').then(m => ({ default: m.MatchesList })));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })));
const AdminFeatureTogglePage = lazy(() => import('./pages/AdminFeatureTogglePage').then(m => ({ default: m.AdminFeatureTogglePage })));

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
          <FeatureProvider>
            <Router>
              <AppContent />
            </Router>
          </FeatureProvider>
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
              {/* About Page - Home/default page */}
              <Route path="/" element={<AboutPage />} />

              {/* Feed Page - Main page showing community posts */}
              <Route path="/feed" element={<FeedPage />} />

              {/* Events Page - Upcoming community events */}
              <Route path="/events" element={<EventsPage />} />

              {/* About Page - Community introduction and founders */}
              <Route path="/about" element={<AboutPage />} />

              {/* Leaderboard Page - User rankings by points (feature-gated) */}
              <Route
                path="/leaderboard"
                element={
                  <FeatureRoute featureKey="leaderboard">
                    <LeaderboardPage />
                  </FeatureRoute>
                }
              />

              {/* Protected mentor browsing - requires authentication and mentor_search feature */}
              <Route
                path="/mentors/browse"
                element={
                  <FeatureRoute featureKey="mentor_search">
                    <ProtectedRoute>
                      <MentorBrowse />
                    </ProtectedRoute>
                  </FeatureRoute>
                }
              />
              <Route
                path="/mentors/:id"
                element={
                  <FeatureRoute featureKey="mentor_search">
                    <ProtectedRoute>
                      <MentorDetailPage />
                    </ProtectedRoute>
                  </FeatureRoute>
                }
              />

              {/* Protected Routes */}
              <Route
                path="/profile/edit"
                element={
                  <ProtectedRoute>
                    <UserProfileEdit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mentor/profile/setup"
                element={
                  <FeatureRoute featureKey="mentor_search">
                    <ProtectedRoute>
                      <MentorProfileSetup />
                    </ProtectedRoute>
                  </FeatureRoute>
                }
              />
              <Route
                path="/matches"
                element={
                  <FeatureRoute featureKey="match_requests">
                    <ProtectedRoute>
                      <MatchesList />
                    </ProtectedRoute>
                  </FeatureRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute>
                    <AdminUsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/features"
                element={
                  <ProtectedRoute>
                    <AdminFeatureTogglePage />
                  </ProtectedRoute>
                }
              />
              {/* TODO: Add more routes:
                - /feed
                - /challenges
                - /blogs
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
