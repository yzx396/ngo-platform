import { describe, it, expect } from 'vitest';
import { isWeChatBrowser } from '../utils/wechatDetection';

describe('WeChat Detection', () => {
  it('should return true for WeChat browser user agent', () => {
    const originalUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.0(0x1800002a) NetType/WIFI Language/zh_CN',
    });

    expect(isWeChatBrowser()).toBe(true);

    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: originalUserAgent,
    });
  });

  it('should return false for non-WeChat browser user agent', () => {
    const originalUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    });

    expect(isWeChatBrowser()).toBe(false);

    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: originalUserAgent,
    });
  });

  it('should return false when micromessenger is not in user agent', () => {
    const originalUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    });

    expect(isWeChatBrowser()).toBe(false);

    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: originalUserAgent,
    });
  });
});
