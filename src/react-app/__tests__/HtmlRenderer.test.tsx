import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HtmlRenderer } from '../components/HtmlRenderer';

describe('HtmlRenderer', () => {
  describe('HTML content rendering', () => {
    it('should render HTML content with dangerouslySetInnerHTML', () => {
      const { container } = render(
        <HtmlRenderer content="<p>Test content</p>" />
      );
      expect(container.querySelector('p')).toHaveTextContent('Test content');
    });

    it('should handle plain text by wrapping in paragraphs', () => {
      const { container } = render(
        <HtmlRenderer content="Plain text content" />
      );
      expect(container.querySelector('p')).toHaveTextContent('Plain text content');
    });

    it('should sanitize dangerous HTML', () => {
      const { container } = render(
        <HtmlRenderer content='<p>Safe</p><script>alert("dangerous")</script>' />
      );
      expect(container.textContent).toContain('Safe');
      expect(container.querySelector('script')).not.toBeInTheDocument();
    });

    it('should remove empty <p> tags', () => {
      const { container } = render(
        <HtmlRenderer content="<p></p><p>Content</p><p></p>" />
      );
      const paragraphs = container.querySelectorAll('p');
      // Should only have one paragraph with content (empty ones removed)
      const nonEmptyParagraphs = Array.from(paragraphs).filter(
        p => p.textContent && p.textContent.trim() !== ''
      );
      expect(nonEmptyParagraphs).toHaveLength(1);
      expect(nonEmptyParagraphs[0].textContent).toBe('Content');
    });

    it('should remove empty <div> tags', () => {
      const { container } = render(
        <HtmlRenderer content="<div></div><div><p>Content</p></div>" />
      );
      const divs = container.querySelectorAll('div');
      expect(divs.length).toBeGreaterThan(0);
      // At least one div should have content
      const divsWithContent = Array.from(divs).filter(
        d => d.textContent && d.textContent.trim() !== ''
      );
      expect(divsWithContent.length).toBeGreaterThan(0);
    });
  });

  describe('Text content handling', () => {
    it('should handle multi-paragraph plain text', () => {
      const content = 'First paragraph\n\nSecond paragraph';
      const { container } = render(<HtmlRenderer content={content} />);
      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs.length).toBe(2);
      expect(paragraphs[0]).toHaveTextContent('First paragraph');
      expect(paragraphs[1]).toHaveTextContent('Second paragraph');
    });

    it('should escape HTML entities in plain text', () => {
      const { container } = render(
        <HtmlRenderer content="Text with braces and & ampersands" />
      );
      expect(container.textContent).toContain('braces');
      expect(container.textContent).toContain('&');
    });
  });

  describe('Empty content', () => {
    it('should handle empty string', () => {
      const { container } = render(<HtmlRenderer content="" />);
      expect(container.textContent).toBe('');
    });

    it('should handle content with only whitespace', () => {
      const { container } = render(<HtmlRenderer content="   " />);
      expect(container.textContent.trim()).toBe('');
    });
  });

  describe('Allowed HTML tags', () => {
    it('should allow bold, italic, and underline tags', () => {
      const { container } = render(
        <HtmlRenderer content="<p><strong>Bold</strong> <em>Italic</em> <u>Underline</u></p>" />
      );
      expect(container.querySelector('strong')).toHaveTextContent('Bold');
      expect(container.querySelector('em')).toHaveTextContent('Italic');
      expect(container.querySelector('u')).toHaveTextContent('Underline');
    });

    it('should allow list tags', () => {
      const { container } = render(
        <HtmlRenderer content="<ul><li>Item 1</li><li>Item 2</li></ul>" />
      );
      const listItems = container.querySelectorAll('li');
      expect(listItems).toHaveLength(2);
      expect(listItems[0]).toHaveTextContent('Item 1');
      expect(listItems[1]).toHaveTextContent('Item 2');
    });

    it('should allow links with href attribute', () => {
      const { container } = render(
        <HtmlRenderer content='<a href="https://example.com">Link</a>' />
      );
      const link = container.querySelector('a');
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveTextContent('Link');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <HtmlRenderer content="<p>Text</p>" className="custom-class" />
      );
      const div = container.querySelector('div');
      expect(div).toHaveClass('custom-class');
    });
  });
});
