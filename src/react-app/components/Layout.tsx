import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  /**
   * Main content to display in the center column
   */
  children: ReactNode;
}

/**
 * Layout Component
 * Two-column layout with sidebar navigation and main content area
 * Responsive design:
 * - Desktop: Fixed sidebar (240px) + scrollable main content
 * - Mobile: Hidden sidebar, hamburger menu in Navbar
 */
export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Sidebar - Hidden on mobile, visible on md+ */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="container px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export default Layout;
