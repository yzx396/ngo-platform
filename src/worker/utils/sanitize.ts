/**
 * Sanitizes HTML content to prevent XSS attacks
 * Allows common formatting tags (bold, italic, lists, links, paragraphs, headings)
 *
 * @param html - Raw HTML content from editor
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // Define allowed tags
  const allowedTags = [
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
  ];

  // Simple HTML sanitization: remove script tags and event handlers
  let sanitized = html
    // Remove script tags and their contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove iframe tags and their contents
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove on* event handlers
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')
    // Remove style tags and their contents
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Additional pass: strip disallowed tags but keep content
  const allowedTagsRegex = new RegExp(
    `</?(?!${allowedTags.join('|')}|\\s|br/)\\w+[^>]*>`,
    'gi'
  );
  sanitized = sanitized.replace(allowedTagsRegex, '');

  // Remove disallowed attributes from allowed tags
  sanitized = sanitized.replace(/<a\s+[^>]*>/gi, (match) => {
    const href = match.match(/href=["']?([^"'\s>]+)["']?/i)?.[1] || '';
    const title = match.match(/title=["']?([^"']*)["']?/i)?.[1] || '';
    const target = match.match(/target=["']?([^"']*)["']?/i)?.[1] || '';
    const rel = match.match(/rel=["']?([^"']*)["']?/i)?.[1] || '';

    let result = '<a';
    if (href) result += ` href="${escapeAttr(href)}"`;
    if (title) result += ` title="${escapeAttr(title)}"`;
    if (target) result += ` target="${escapeAttr(target)}"`;
    if (rel) result += ` rel="${escapeAttr(rel)}"`;
    result += '>';
    return result;
  });

  return sanitized.trim();
}

/**
 * Escapes HTML attribute values
 */
function escapeAttr(str: string): string {
  const map: Record<string, string> = {
    '"': '&quot;',
    "'": '&#039;',
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
  };
  return str.replace(/["'&<>]/g, (char) => map[char]);
}

/**
 * Detects if content is plain text (not HTML) and wraps it in <p> tags
 * for backward compatibility with existing plain text forum content
 *
 * @param content - Content that may be plain text or HTML
 * @returns HTML wrapped in <p> tags if it was plain text, otherwise returns as-is
 */
export function normalizeContent(content: string): string {
  if (!content) return '';

  const trimmed = content.trim();

  // Check if content looks like HTML (contains common HTML tags)
  const htmlPattern = /<(p|br|strong|em|u|h[1-6]|ul|ol|li|a|blockquote)[^>]*>/i;

  if (htmlPattern.test(trimmed)) {
    // Already HTML, return as-is
    return trimmed;
  }

  // Plain text - wrap each line in <p> tags for proper rendering
  return trimmed
    .split('\n\n')
    .map((paragraph) => {
      const cleaned = paragraph.trim();
      return cleaned ? `<p>${escapeHtml(cleaned)}</p>` : '';
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Escapes HTML special characters in plain text
 * Prevents content from being interpreted as HTML tags
 *
 * @param text - Plain text to escape
 * @returns Escaped HTML
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
