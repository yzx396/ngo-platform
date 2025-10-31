import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { describe, it, expect } from 'vitest';
import i18n from '../../i18n';
import { AuthProvider } from '../../context/AuthContext';
import { Layout } from '../Layout';

/**
 * Test suite for Layout component
 */
describe('Layout', () => {
  const renderLayout = (children = 'Test Content') => {
    return render(
      <AuthProvider>
        <I18nextProvider i18n={i18n}>
          <Router>
            <Layout>{children}</Layout>
          </Router>
        </I18nextProvider>
      </AuthProvider>
    );
  };

  it('should render main content area', () => {
    renderLayout('Test Main Content');

    const mainElement = screen.getByRole('main');
    expect(mainElement).toBeInTheDocument();
  });

  it('should render children in main content area', () => {
    const testContent = 'This is test content for layout';
    renderLayout(testContent);

    expect(screen.getByText(testContent)).toBeInTheDocument();
  });

  it('should render with flex layout structure', () => {
    const { container } = renderLayout('Test Content');

    const layoutDiv = container.querySelector('.flex');
    expect(layoutDiv).toHaveClass('flex');
    // Check for h-[calc(100vh-56px)] class - Tailwind arbitrary values use brackets
    expect(layoutDiv).toHaveClass('h-[calc(100vh-56px)]');
  });

  it('should have main content with flex-1 to fill available space', () => {
    const { container } = renderLayout('Test Content');

    const mainElement = container.querySelector('main');
    expect(mainElement).toHaveClass('flex-1');
  });

  it('should have scrollable main content area', () => {
    const { container } = renderLayout('Test Content');

    const mainElement = container.querySelector('main');
    expect(mainElement).toHaveClass('overflow-y-auto');
  });

  it('should render Sidebar component', () => {
    renderLayout();

    // Sidebar should be present in the DOM
    const asideElement = document.querySelector('aside');
    expect(asideElement).toBeInTheDocument();
  });

  it('should have container with padding and max-width', () => {
    const { container } = renderLayout('Test Content');

    const contentDiv = container.querySelector('.container');
    expect(contentDiv).toHaveClass('px-4', 'py-8');
  });

  it('should support React components as children', () => {
    const TestComponent = () => <div>React Component Content</div>;
    renderLayout(<TestComponent />);

    expect(screen.getByText('React Component Content')).toBeInTheDocument();
  });

  it('should have proper responsive design classes', () => {
    const { container } = renderLayout();

    const contentDiv = container.querySelector('.container');
    expect(contentDiv).toHaveClass('sm:px-6', 'lg:px-8', 'sm:py-12');
  });

  it('should render with proper main content max-width', () => {
    const { container } = renderLayout();

    const contentDiv = container.querySelector('.container');
    expect(contentDiv).toHaveClass('max-w-7xl', 'mx-auto');
  });

  it('should work with different language settings', () => {
    i18n.changeLanguage('zh-CN');
    renderLayout();

    // Sidebar should still render properly with Chinese language
    const asideElement = document.querySelector('aside');
    expect(asideElement).toBeInTheDocument();
  });
});
