import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Allows only safe HTML tags and attributes
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      'h2',
      'h3',
      'ul',
      'ol',
      'li',
      'a',
      'blockquote',
      'code',
      'pre',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Strip HTML tags and get plain text content
 * Useful for previews and character counting
 */
export function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

/**
 * Get truncated plain text from HTML content
 * @param html - HTML content
 * @param maxLength - Maximum length of text to return
 * @param suffix - Suffix to add if truncated (default: '...')
 */
export function getTruncatedText(
  html: string,
  maxLength: number,
  suffix = '...'
): string {
  const text = stripHtml(html);
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength).trim() + suffix;
}
