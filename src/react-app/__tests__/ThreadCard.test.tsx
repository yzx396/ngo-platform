import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ThreadCard from '../components/ThreadCard';
import { ForumThreadWithAuthor } from '../../types/forum';

// Mock the translation hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

const createMockThread = (overrides?: Partial<ForumThreadWithAuthor>): ForumThreadWithAuthor => ({
  id: 'thread_123',
  category_id: 'cat_career',
  user_id: 'user_1',
  title: 'Test Thread',
  content: '<p>Test content</p>',
  status: 'open',
  is_pinned: 0,
  view_count: 10,
  reply_count: 5,
  upvote_count: 3,
  downvote_count: 0,
  hot_score: 100,
  author_name: 'John Doe',
  author_email: 'john@example.com',
  created_at: 1700000000,
  updated_at: 1700000000,
  last_activity_at: 1700100000,
  ...overrides,
});

describe('ThreadCard', () => {
  const renderThreadCard = (thread: ForumThreadWithAuthor) => {
    return render(
      <BrowserRouter>
        <ThreadCard thread={thread} />
      </BrowserRouter>
    );
  };

  describe('Content Preview', () => {
    it('should strip HTML tags from content preview', () => {
      const thread = createMockThread({
        content: '<p>This is a test</p>',
      });

      renderThreadCard(thread);
      expect(screen.getByText('This is a test')).toBeInTheDocument();
      // Ensure no HTML tags are visible
      expect(screen.queryByText(/^<p>/)).not.toBeInTheDocument();
    });

    it('should handle multiple HTML tags', () => {
      const thread = createMockThread({
        content: '<p><strong>Bold text</strong> and <em>italic text</em></p>',
      });

      renderThreadCard(thread);
      expect(screen.getByText(/Bold text and italic text/)).toBeInTheDocument();
    });

    it('should decode HTML entities', () => {
      const thread = createMockThread({
        content: '<p>&lt;script&gt; &amp; &quot;test&quot;</p>',
      });

      renderThreadCard(thread);
      expect(screen.getByText(/<script> & "test"/)).toBeInTheDocument();
    });

    it('should handle empty content', () => {
      const thread = createMockThread({
        content: '',
      });

      renderThreadCard(thread);
      // Should not error and render the card
      expect(screen.getByText('Test Thread')).toBeInTheDocument();
    });

    it('should handle content with only HTML tags', () => {
      const thread = createMockThread({
        content: '<p></p><div></div>',
      });

      renderThreadCard(thread);
      // Should show empty or whitespace only
      expect(screen.getByText('Test Thread')).toBeInTheDocument();
    });

    it('should limit preview to 2 lines with line-clamp-2', () => {
      const thread = createMockThread({
        content: '<p>Line 1</p><p>Line 2</p><p>Line 3 should be hidden</p>',
      });

      const { container } = renderThreadCard(thread);
      const preview = container.querySelector('.line-clamp-2');
      expect(preview).toBeInTheDocument();
    });
  });

  describe('Thread Information', () => {
    it('should display thread title', () => {
      const thread = createMockThread({ title: 'My Test Title' });
      renderThreadCard(thread);
      expect(screen.getByText('My Test Title')).toBeInTheDocument();
    });

    it('should display author name', () => {
      const thread = createMockThread({ author_name: 'Jane Smith' });
      renderThreadCard(thread);
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should display view count', () => {
      const thread = createMockThread({ view_count: 150 });
      renderThreadCard(thread);
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    it('should display reply count', () => {
      const thread = createMockThread({ reply_count: 12 });
      renderThreadCard(thread);
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('should display upvote count', () => {
      const thread = createMockThread({ upvote_count: 25 });
      renderThreadCard(thread);
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('should not display downvote count when zero', () => {
      const thread = createMockThread({ downvote_count: 0 });
      const { container } = renderThreadCard(thread);
      expect(container.textContent).not.toMatch(/^0$/m);
    });

    it('should display downvote count when greater than zero', () => {
      const thread = createMockThread({ reply_count: 0, upvote_count: 0, downvote_count: 7 });
      renderThreadCard(thread);
      expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('should show pinned emoji when is_pinned is true', () => {
      const thread = createMockThread({ is_pinned: 1 });
      const { container } = renderThreadCard(thread);
      expect(container.textContent).toContain('📌');
    });

    it('should not show pinned emoji when is_pinned is false', () => {
      const thread = createMockThread({ is_pinned: 0 });
      const { container } = renderThreadCard(thread);
      const emoji = container.textContent.match(/📌/);
      expect(emoji).not.toBeInTheDocument();
    });
  });

  describe('Status Badge', () => {
    it('should not show badge for open status', () => {
      const thread = createMockThread({ status: 'open' });
      const { container } = renderThreadCard(thread);
      expect(container.textContent).not.toContain('Open');
    });

    it('should show solved badge', () => {
      const thread = createMockThread({ status: 'solved' });
      renderThreadCard(thread);
      expect(screen.getByText('Solved')).toBeInTheDocument();
    });

    it('should show closed badge', () => {
      const thread = createMockThread({ status: 'closed' });
      renderThreadCard(thread);
      expect(screen.getByText('Closed')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should link to thread detail page', () => {
      const thread = createMockThread({ id: 'thread_abc123' });
      const { container } = renderThreadCard(thread);
      const link = container.querySelector('a');
      expect(link).toHaveAttribute('href', '/forums/threads/thread_abc123');
    });
  });
});
