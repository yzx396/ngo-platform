import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/button';

/**
 * Navbar component
 * Main navigation header for the application
 * Shows active route and navigation links
 * Responsive design with mobile hamburger menu
 */
export function Navbar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/mentors/browse', label: 'Browse Mentors' },
    { href: '/matches', label: 'My Matches' },
    { href: '/mentor/profile/setup', label: 'My Profile' },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Logo/Brand */}
        <Link
          to="/"
          className="flex items-center gap-2 font-bold text-base sm:text-lg hover:opacity-80 flex-shrink-0"
          onClick={() => setIsOpen(false)}
        >
          <span className="text-primary">🚀</span>
          <span className="hidden sm:inline">Lead Forward</span>
        </Link>

        {/* Navigation Links - Hidden on mobile, visible on sm+ */}
        <div className="hidden sm:flex items-center gap-1 flex-1 justify-center">
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

        {/* Auth Buttons - Hidden on mobile, visible on sm+ */}
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm">
            Login
          </Button>
          <Button size="sm">
            Sign Up
          </Button>
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
            {navLinks.slice(1).map((link) => (
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
              <Button variant="outline" size="sm" className="w-full">
                Login
              </Button>
              <Button size="sm" className="w-full">
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
