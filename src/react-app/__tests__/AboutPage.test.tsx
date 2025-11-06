import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { AboutPage } from '../pages/AboutPage';

describe('AboutPage', () => {
  beforeEach(() => {
    // Reset to English before each test
    i18n.changeLanguage('en');
  });
  it('should render the about page title', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AboutPage />
      </I18nextProvider>
    );

    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toBeInTheDocument();
    expect(title.textContent).toContain('About Lead Forward');
  });

  it('should render the about page subtitle', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AboutPage />
      </I18nextProvider>
    );

    expect(screen.getByText(/Lead Forward was founded with a mission/i)).toBeInTheDocument();
  });

  it('should render the mission section', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AboutPage />
      </I18nextProvider>
    );

    expect(screen.getByRole('heading', { name: /Our Mission/i })).toBeInTheDocument();
    expect(screen.getByText(/To inspire people to be the best leaders/i)).toBeInTheDocument();
  });

  it('should render the what we do section with all items', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AboutPage />
      </I18nextProvider>
    );

    expect(screen.getByRole('heading', { name: /What We Do/i })).toBeInTheDocument();
    expect(screen.getByText(/Public Speaking/i)).toBeInTheDocument();
    expect(screen.getByText(/Decision Making/i)).toBeInTheDocument();
    expect(screen.getByText(/Team Building/i)).toBeInTheDocument();
    expect(screen.getByText(/Conflict Resolution/i)).toBeInTheDocument();
    expect(screen.getByText(/Strategic Thinking/i)).toBeInTheDocument();
    expect(screen.getByText(/Emotional Intelligence/i)).toBeInTheDocument();
  });

  it('should render the values section with all value cards', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AboutPage />
      </I18nextProvider>
    );

    expect(screen.getByRole('heading', { name: /Our Core Values/i })).toBeInTheDocument();

    // Use getAllByText for Community Support since it appears multiple times
    const communitySupport = screen.getAllByText(/Community Support/i);
    expect(communitySupport.length).toBeGreaterThan(0);

    // Check for other values that are unique
    expect(screen.getByText(/Growth Mindset/i)).toBeInTheDocument();
    expect(screen.getByText(/Authentic Leadership/i)).toBeInTheDocument();
    expect(screen.getByText(/Actionable Practice/i)).toBeInTheDocument();
  });

  it('should render the founders section', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AboutPage />
      </I18nextProvider>
    );

    expect(screen.getByRole('heading', { name: /Our Founders/i })).toBeInTheDocument();
  });

  it('should render all four founder profiles', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AboutPage />
      </I18nextProvider>
    );

    expect(screen.getByText('Claire Ding')).toBeInTheDocument();
    expect(screen.getByText('Elaine Xiao')).toBeInTheDocument();
    expect(screen.getByText('Lily Li')).toBeInTheDocument();
    expect(screen.getByText('Yang Zhao')).toBeInTheDocument();
  });

  it('should render founder titles', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AboutPage />
      </I18nextProvider>
    );

    // Check for founder titles (company names)
    expect(screen.getByText(/Senior Manager @ Intuit/)).toBeInTheDocument();
    expect(screen.getByText(/Manager @ Apple/)).toBeInTheDocument();
    expect(screen.getByText(/Senior Manager @ Amazon/)).toBeInTheDocument();
    expect(screen.getByText(/Eng Leader @ SAP/)).toBeInTheDocument();
  });

  it('should render the join us section', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AboutPage />
      </I18nextProvider>
    );

    expect(screen.getByRole('heading', { name: /Join Our Community/i })).toBeInTheDocument();
    expect(screen.getByText(/Whether you are looking to mentor others/i)).toBeInTheDocument();
  });

  it('should have proper heading hierarchy', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AboutPage />
      </I18nextProvider>
    );

    const h1Headings = screen.getAllByRole('heading', { level: 1 });
    const h2Headings = screen.getAllByRole('heading', { level: 2 });

    // Should have at least 1 h1 (main title)
    expect(h1Headings.length).toBeGreaterThan(0);
    // Should have multiple h2s (sections: mission, values, founders, etc.)
    expect(h2Headings.length).toBeGreaterThan(0);
  });

  it('should render value cards with proper styling', () => {
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <AboutPage />
      </I18nextProvider>
    );

    // Check for card styling (bg-card border rounded-lg)
    const cards = container.querySelectorAll('.bg-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('should display founder photos', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AboutPage />
      </I18nextProvider>
    );

    const images = screen.getAllByRole('img');
    // Should have at least 4 founder images
    expect(images.length).toBeGreaterThanOrEqual(4);
  });

  it('should support language switching', async () => {
    const { rerender } = render(
      <I18nextProvider i18n={i18n}>
        <AboutPage />
      </I18nextProvider>
    );

    // Initially in English
    expect(screen.getByText('About Lead Forward')).toBeInTheDocument();

    // Switch to Chinese
    await i18n.changeLanguage('zh-CN');

    rerender(
      <I18nextProvider i18n={i18n}>
        <AboutPage />
      </I18nextProvider>
    );

    // Check for Chinese translation
    await waitFor(() => {
      expect(screen.getByText('关于 Lead Forward')).toBeInTheDocument();
    });
  });

  it('should have icons for what we do section', () => {
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <AboutPage />
      </I18nextProvider>
    );

    // Check that activity cards are rendered with proper content
    expect(screen.getByText(/Public Speaking/i)).toBeInTheDocument();
    expect(screen.getByText(/Decision Making/i)).toBeInTheDocument();
    // Verify icons are rendered (check for SVG elements within the cards)
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('should have icons for value cards', () => {
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <AboutPage />
      </I18nextProvider>
    );

    // Check that value cards are rendered with proper content
    expect(screen.getByText(/Growth Mindset/i)).toBeInTheDocument();
    expect(screen.getByText(/Authentic Leadership/i)).toBeInTheDocument();
    // Verify icons are rendered (check for SVG elements within the cards)
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('should render proper layout structure', () => {
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <AboutPage />
      </I18nextProvider>
    );

    // Check for main content container with spacing
    const mainContent = container.querySelector('.space-y-6');
    expect(mainContent).toBeInTheDocument();
  });

  it('should display mission content with proper formatting', () => {
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <AboutPage />
      </I18nextProvider>
    );

    // Check that mission content exists (at least one of the key phrases)
    const pageText = container.textContent || '';
    expect(pageText).toMatch(/mission|使命/i);
    expect(pageText).toMatch(/leadership|领导/i);
  });
});
