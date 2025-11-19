import { useMemo } from 'react';
import DOMPurify from 'dompurify';

interface HtmlRendererProps {
  content: string;
  className?: string;
}

/**
 * Safely renders HTML content with DOMPurify sanitization and backward compatibility
 * for existing plain text content. Detects if content is HTML and renders accordingly.
 */
export function HtmlRenderer({ content, className = '' }: HtmlRendererProps) {
  const sanitizedHtml = useMemo(() => {
    if (!content) return '';

    // Check if content looks like HTML (contains common HTML tags)
    const htmlPattern = /<(p|br|strong|em|u|h[1-6]|ul|ol|li|a|blockquote)[^>]*>/i;

    let htmlToRender = content;

    if (!htmlPattern.test(content.trim())) {
      // Plain text - wrap in <p> tags for proper rendering
      htmlToRender = content
        .split('\n\n')
        .map((paragraph) => {
          const cleaned = paragraph.trim();
          return cleaned ? `<p>${escapeHtml(cleaned)}</p>` : '';
        })
        .filter(Boolean)
        .join('\n');
    }

    // Sanitize HTML to prevent XSS
    const config = {
      ALLOWED_TAGS: [
        'p',
        'br',
        'strong',
        'em',
        'u',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'ul',
        'ol',
        'li',
        'a',
        'blockquote',
      ],
      ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    };

    let sanitized = DOMPurify.sanitize(htmlToRender, config);

    // Remove empty block-level tags that TipTap might generate
    // This prevents displays of empty <p></p> tags
    sanitized = sanitized
      .replace(/<p><\/p>/gi, '')
      .replace(/<div><\/div>/gi, '')
      .replace(/(\n\s*)+/g, '\n')
      .trim();

    return sanitized;
  }, [content]);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}

/**
 * Escapes HTML special characters in plain text
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
