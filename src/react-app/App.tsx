// src/App.tsx

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { MentorBrowse } from './pages/MentorBrowse';
import { MentorProfileSetup } from './pages/MentorProfileSetup';
import { MatchesList } from './pages/MatchesList';

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
      <Router>
        <div className="min-h-screen bg-background">
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/mentors/browse" element={<MentorBrowse />} />
            <Route path="/mentor/profile/setup" element={<MentorProfileSetup />} />
            <Route path="/matches" element={<MatchesList />} />
            {/* TODO: Add more routes:
              - /mentor/profile/edit
              - /mentors/:id (detail view)
            */}
          </Routes>
          <Toaster />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

/**
 * Home/Dashboard page
 * Entry point for the application
 */
function HomePage() {
  return (
    <div className="container py-12">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tighter">
            Welcome to Lead Forward Platform
          </h1>
          <p className="text-xl text-muted-foreground">
            Connect with experienced mentors and grow your skills
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Browse Mentors Card */}
          <div className="bg-card border rounded-lg p-8 space-y-4 hover:shadow-md transition-shadow">
            <div className="text-4xl">🔍</div>
            <h2 className="text-2xl font-bold">Browse Mentors</h2>
            <p className="text-muted-foreground">
              Search and discover mentors by expertise, availability, and rates
            </p>
            <a href="/mentors/browse" className="inline-block">
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90">
                Start Browsing →
              </button>
            </a>
          </div>

          {/* Create Mentor Profile Card */}
          <div className="bg-card border rounded-lg p-8 space-y-4 hover:shadow-md transition-shadow">
            <div className="text-4xl">👤</div>
            <h2 className="text-2xl font-bold">Become a Mentor</h2>
            <p className="text-muted-foreground">
              Create your mentor profile and start helping mentees grow
            </p>
            <a href="/mentor/profile/setup" className="inline-block">
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90">
                Set Up Profile →
              </button>
            </a>
          </div>
        </div>

        {/* Features Section */}
        <div className="space-y-4 pt-8 border-t">
          <h2 className="text-2xl font-bold">Key Features</h2>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="text-2xl">✓</span>
              <span>User-driven matching - search and connect with mentors directly</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-2xl">✓</span>
              <span>Flexible mentoring levels - Entry, Senior, Staff, Management</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-2xl">✓</span>
              <span>Multiple payment methods - Venmo, PayPal, Zelle, Alipay, WeChat, Crypto</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-2xl">✓</span>
              <span>Manage your mentorship matches and track progress</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
