import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/button';

/**
 * Navbar component
 * Main navigation header for the application
 * Shows active route and navigation links
 */
export function Navbar() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/mentors/browse', label: 'Browse Mentors' },
    { href: '/matches', label: 'My Matches' },
    { href: '/mentor/profile/setup', label: 'My Profile' },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container h-14 flex items-center justify-between">
        {/* Logo/Brand */}
        <Link to="/" className="flex items-center gap-2 font-bold text-lg hover:opacity-80">
          <span className="text-primary">🚀</span>
          <span>Lead Forward</span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-1">
          {navLinks.slice(1).map((link) => (
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

        {/* Auth Buttons (TODO: Implement actual auth) */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Login
          </Button>
          <Button size="sm">
            Sign Up
          </Button>
        </div>
      </div>
    </nav>
  );
}
