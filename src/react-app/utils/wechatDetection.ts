/**
 * Detects if the current browser is WeChat's built-in browser
 * @returns true if running in WeChat, false otherwise
 */
export function isWeChatBrowser(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return /micromessenger/.test(ua);
}
