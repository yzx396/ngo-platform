import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CategoryCard from '../CategoryCard';
import { ForumCategory } from '../../../types/forum';

// Mock useTranslation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => {
      const translations: Record<string, string> = {
        'forums.threads': 'threads',
      };
      return options?.defaultValue || translations[key] || key;
    },
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

const mockCategory: ForumCategory = {
  id: 'cat_test',
  name: 'Test Category',
  slug: 'test-category',
  description: 'This is a test category',
  parent_id: 'cat_parent',
  icon: '🎯',
  display_order: 1,
  thread_count: 42,
  created_at: 1700000000,
};

describe('CategoryCard', () => {
  it('should render category name', () => {
    renderWithRouter(<CategoryCard category={mockCategory} />);
    
    expect(screen.getByText('Test Category')).toBeInTheDocument();
  });

  it('should render category description', () => {
    renderWithRouter(<CategoryCard category={mockCategory} />);
    
    expect(screen.getByText('This is a test category')).toBeInTheDocument();
  });

  it('should render category icon', () => {
    renderWithRouter(<CategoryCard category={mockCategory} />);
    
    expect(screen.getByText('🎯')).toBeInTheDocument();
  });

  it('should render thread count', () => {
    renderWithRouter(<CategoryCard category={mockCategory} />);

    expect(screen.getByText('42')).toBeInTheDocument();
    // With responsive layout, "threads" appears in both mobile and desktop versions
    const threadsElements = screen.getAllByText('threads');
    expect(threadsElements.length).toBeGreaterThan(0);
  });

  it('should render as a link to the category page', () => {
    renderWithRouter(<CategoryCard category={mockCategory} />);
    
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/forums/category/cat_test');
  });

  it('should have proper hover styling classes', () => {
    renderWithRouter(<CategoryCard category={mockCategory} />);
    
    const link = screen.getByRole('link');
    expect(link).toHaveClass('hover:shadow-md');
    expect(link).toHaveClass('hover:border-primary/50');
  });

  it('should handle category without icon', () => {
    const categoryWithoutIcon = { ...mockCategory, icon: null };
    renderWithRouter(<CategoryCard category={categoryWithoutIcon} />);
    
    expect(screen.getByText('Test Category')).toBeInTheDocument();
    expect(screen.queryByText('🎯')).not.toBeInTheDocument();
  });

  it('should handle category without description', () => {
    const categoryWithoutDesc = { ...mockCategory, description: null };
    renderWithRouter(<CategoryCard category={categoryWithoutDesc} />);
    
    expect(screen.getByText('Test Category')).toBeInTheDocument();
    expect(screen.queryByText('This is a test category')).not.toBeInTheDocument();
  });

  it('should display zero thread count when none exist', () => {
    const categoryWithNoThreads = { ...mockCategory, thread_count: 0 };
    renderWithRouter(<CategoryCard category={categoryWithNoThreads} />);

    expect(screen.getByText('0')).toBeInTheDocument();
    // With responsive layout, "threads" appears in both mobile and desktop versions
    const threadsElements = screen.getAllByText('threads');
    expect(threadsElements.length).toBeGreaterThan(0);
  });

  it('should use responsive flex layout', () => {
    const { container } = renderWithRouter(<CategoryCard category={mockCategory} />);

    // Check for responsive flex layout with mobile and desktop variants
    const mainFlex = container.querySelector('.flex');
    expect(mainFlex).toBeInTheDocument();
    expect(mainFlex).toHaveClass('flex-col', 'md:flex-row');
  });

  it('should render with proper border and rounded styling', () => {
    renderWithRouter(<CategoryCard category={mockCategory} />);
    
    const link = screen.getByRole('link');
    expect(link).toHaveClass('rounded-lg');
    expect(link).toHaveClass('border');
  });

  it('should show title with hover effect', () => {
    renderWithRouter(<CategoryCard category={mockCategory} />);
    
    const title = screen.getByText('Test Category');
    expect(title).toHaveClass('hover:text-primary');
  });
});
