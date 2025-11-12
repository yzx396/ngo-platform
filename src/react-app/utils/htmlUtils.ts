/**
 * HTML utility functions for rich text content
 * Used for character counting, validation, and text extraction
 */

/**
 * Get plain text length from HTML content
 * Strips all HTML tags and counts characters
 * Useful for enforcing character limits on rich text
 */
export function getTextLengthFromHtml(html: string): number {
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').trim().length;
}

/**
 * Get plain text from HTML (for previews and validation)
 * This is a re-export from blogUtils for convenience
 */
export function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').trim();
}

/**
 * Check if HTML content is effectively empty
 * Returns true if content is empty or contains only whitespace/empty tags
 */
export function isHtmlEmpty(html: string): boolean {
  const text = stripHtml(html);
  return text.length === 0;
}

/**
 * Validate HTML content for dangerous patterns
 * Returns true if content appears safe
 */
export function isHtmlSafe(html: string): boolean {
  // Check for script tags
  if (html.includes('<script') || html.includes('</script>')) {
    return false;
  }
  
  // Check for javascript: protocol
  if (html.includes('javascript:')) {
    return false;
  }
  
  // Check for event handlers
  const eventHandlers = ['onclick', 'onerror', 'onload', 'onmouseover'];
  for (const handler of eventHandlers) {
    if (html.toLowerCase().includes(handler)) {
      return false;
    }
  }
  
  return true;
}
