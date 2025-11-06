import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { useFeatures } from '../context/FeatureContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { UserRoleBadge } from './UserRoleBadge';

/**
 * Navbar component
 * Main navigation header for the application
 * Shows active route and navigation links
 * Responsive design with mobile hamburger menu
 */
export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { isFeatureEnabled } = useFeatures();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { href: '/', label: t('common.home') },
    { href: '/feed', label: t('navigation.feed') },
    { href: '/events', label: t('events.title', 'Events') },
    ...(isFeatureEnabled('leaderboard')
      ? [{ href: '/leaderboard', label: t('navigation.leaderboard', 'Leaderboard') }]
      : []),
  ];

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/', { replace: true });
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Logo/Brand */}
        <Link
          to="/"
          className="flex items-center hover:opacity-80 flex-shrink-0"
          onClick={() => setIsOpen(false)}
          aria-label="Lead Forward Home"
        >
          <img
            src="/logo.svg"
            alt="Lead Forward"
            className="h-20 w-20 sm:h-24 sm:w-24 object-contain"
          />
        </Link>

        {/* Navigation Links - Hidden on mobile, visible on sm+ */}
        <div className="hidden sm:flex items-center gap-1 flex-1 justify-center">
          {navLinks.map((link) => (
            <Link key={link.href} to={link.href}>
              <Button
                variant={isActive(link.href) ? 'default' : 'ghost'}
                size="sm"
              >
                {link.label}
              </Button>
            </Link>
          ))}
        </div>

        {/* Auth Section - Hidden on mobile, visible on sm+ */}
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <LanguageSwitcher />
          {isAuthenticated && user ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{user.name}</span>
                {user.role && <UserRoleBadge role={user.role} />}
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                {t('common.signOut')}
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button size="sm">
                {t('common.signIn')}
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="sm:hidden p-2 hover:bg-accent rounded-md ml-auto"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
            />
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="sm:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container px-4 py-2 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setIsOpen(false)}
              >
                <Button
                  variant={isActive(link.href) ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start"
                >
                  {link.label}
                </Button>
              </Link>
            ))}
            <div className="pt-2 border-t space-y-2">
              <div className="flex items-center justify-between px-2 py-2">
                <LanguageSwitcher />
              </div>
              {isAuthenticated && user ? (
                <>
                  <div className="px-2 py-2 space-y-2">
                    <div className="text-sm">
                      {t('common.signedInAs', { name: user.name })}
                    </div>
                    {user.role && <UserRoleBadge role={user.role} />}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleLogout}
                  >
                    {t('common.signOut')}
                  </Button>
                </>
              ) : (
                <Link to="/login" className="w-full block">
                  <Button size="sm" className="w-full">
                    {t('common.signIn')}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
