import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useFeatures } from '../context/FeatureContext';
import { Button } from './ui/button';
import { UserRole } from '../../types/role';

interface NavLink {
  href: string;
  label: string;
  icon?: string;
  requiresAuth?: boolean;
}

interface NavSectionProps {
  title?: string;
  links: NavLink[];
  isActive: (path: string) => boolean;
  isAuthenticated: boolean;
}

/**
 * Navigation section component - moved outside to avoid recreation on render
 */
function NavSection({
  title,
  links,
  isActive,
  isAuthenticated,
}: NavSectionProps) {
  return (
    <div className="space-y-1">
      {title && (
        <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h3>
      )}
      <div className="space-y-1">
        {links
          .filter((link) => !link.requiresAuth || isAuthenticated)
          .map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="block"
            >
              <Button
                variant={isActive(link.href) ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start"
                aria-current={isActive(link.href) ? 'page' : undefined}
              >
                {link.icon && <span className="mr-2">{link.icon}</span>}
                <span className="truncate">{link.label}</span>
              </Button>
            </Link>
          ))}
      </div>
    </div>
  );
}

/**
 * Sidebar Navigation Component
 * Displays organized navigation with three sections:
 * - Feed (public, always visible)
 * - Member Area (authenticated only)
 * - Links (public, always visible)
 */
export function Sidebar() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { isFeatureEnabled } = useFeatures();
  const { t } = useTranslation();

  const isActive = (path: string) => location.pathname === path;
  const isAdmin = user?.role === UserRole.Admin;

  // Feed section - filtered by feature flags
  const feedLinks: NavLink[] = [
    {
      href: '/feed',
      label: t('navigation.feed', 'Feed'),
      icon: '📰',
    },
    ...(isFeatureEnabled('challenges')
      ? [
          {
            href: '/challenges',
            label: t('navigation.challenges', 'Challenges'),
            icon: '🎯',
          },
        ]
      : []),
    ...(isFeatureEnabled('blogs')
      ? [
          {
            href: '/blogs',
            label: t('navigation.blogs', 'Blogs'),
            icon: '📝',
          },
        ]
      : []),
  ];

  // Member Area section - filtered by feature flags
  const memberAreaLinks: NavLink[] = [
    {
      href: '/profile/edit',
      label: t('common.myProfile', 'My Profile'),
      icon: '👥',
      requiresAuth: true,
    },
    ...(isFeatureEnabled('mentor_search')
      ? [
          {
            href: '/mentors/browse',
            label: t('common.browseMentors', 'Browse Mentors'),
            icon: '🔍',
            requiresAuth: true,
          },
          {
            href: '/mentor/profile/setup',
            label: t('navigation.becomeMentor', 'Become a Mentor'),
            icon: '👤',
            requiresAuth: true,
          },
        ]
      : []),
    ...(isFeatureEnabled('match_requests')
      ? [
          {
            href: '/matches',
            label: t('navigation.mentorshipRequests', 'Mentorship Requests'),
            icon: '🤝',
            requiresAuth: true,
          },
        ]
      : []),
    ...(isFeatureEnabled('challenges')
      ? [
          {
            href: '/my-challenges',
            label: t('navigation.myChallenges', 'My Challenges'),
            icon: '✅',
            requiresAuth: true,
          },
        ]
      : []),
    ...(isFeatureEnabled('blogs')
      ? [
          {
            href: '/my-blogs',
            label: t('navigation.myBlogs', 'My Blogs'),
            icon: '✍️',
            requiresAuth: true,
          },
        ]
      : []),
  ];

  // Admin section - admin only
  const adminLinks: NavLink[] = [
    {
      href: '/admin/users',
      label: t('navigation.admin.users', 'User Management'),
      icon: '👥',
      requiresAuth: true,
    },
    {
      href: '/admin/features',
      label: t('navigation.admin.features', 'Feature Toggles'),
      icon: '⚙️',
      requiresAuth: true,
    },
  ];

  // Links section - filtered by feature flags
  const linksSection: NavLink[] = [
    {
      href: '/events',
      label: t('navigation.events', 'Events'),
      icon: '📅',
    },
    ...(isFeatureEnabled('leaderboard')
      ? [
          {
            href: '/leaderboard',
            label: t('navigation.leaderboard', 'Leaderboard'),
            icon: '🏆',
          },
        ]
      : []),
  ];

  return (
    <aside className="w-64 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0 hidden md:flex flex-col overflow-y-auto">
      <nav className="flex-1 space-y-4 px-2 py-4">
        {/* Feed Section */}
        <NavSection links={feedLinks} isActive={isActive} isAuthenticated={isAuthenticated} />

        {/* Member Area Section - Only show if authenticated */}
        {isAuthenticated && (
          <>
            <div className="border-t" />
            <NavSection
              title={t('navigation.memberArea', 'Member Area')}
              links={memberAreaLinks}
              isActive={isActive}
              isAuthenticated={isAuthenticated}
            />
          </>
        )}

        {/* Admin Section - Only show if admin */}
        {isAuthenticated && isAdmin && (
          <>
            <div className="border-t" />
            <NavSection
              title={t('navigation.admin.title', 'Admin')}
              links={adminLinks}
              isActive={isActive}
              isAuthenticated={isAuthenticated}
            />
          </>
        )}

        {/* Links Section */}
        <>
          <div className="border-t" />
          <NavSection links={linksSection} isActive={isActive} isAuthenticated={isAuthenticated} />
        </>
      </nav>
    </aside>
  );
}

export default Sidebar;
