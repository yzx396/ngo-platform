import { useTranslation } from 'react-i18next';

export function WeChatLoginWarning() {
  const { t } = useTranslation();

  return (
    <div className="wechat-warning">
      <div className="wechat-warning-icon">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="32" fill="#09BB07"/>
          <path d="M32 16C21.5 16 13 22.7 13 31.2C13 36.3 16.2 40.7 20.5 43.2C19.1 44.8 18.9 46.1 19.5 48.2C20.1 50.3 22.2 52.2 25 52.2C27.8 52.2 30.9 50.6 33.5 48.2C35.1 47 36 45.5 36 44V43.2C40.3 40.7 43.5 36.3 43.5 31.2C43.5 22.7 35 16 24.5 16L32 16ZM24 36C22.3 36 21 34.7 21 33C21 31.3 22.3 30 24 30C25.7 30 27 31.3 27 33C27 34.7 25.7 36 24 36ZM32 36C30.3 36 29 34.7 29 33C29 31.3 30.3 30 32 30C33.7 30 35 31.3 35 33C35 34.7 33.7 36 32 36Z" fill="white"/>
        </svg>
      </div>

      <h2 className="wechat-warning-title">{t('auth.wechatLoginWarning')}</h2>

      <div className="wechat-warning-content">
        <p className="wechat-warning-message">
          {t('auth.wechatLoginMessage1')}
        </p>
        <p className="wechat-warning-message">
          {t('auth.wechatLoginMessage2')}
        </p>
      </div>

      <div className="wechat-browser-icon">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="8" width="36" height="28" rx="4" stroke="#666" strokeWidth="2" fill="none"/>
          <rect x="8" y="10" width="32" height="20" rx="2" fill="#E8E8E8" stroke="#999" strokeWidth="1"/>
          <circle cx="12" cy="14" r="1" fill="#999"/>
          <rect x="15" y="13" width="20" height="2" rx="1" fill="#999"/>
          <rect x="8" y="33" width="32" height="2" rx="1" fill="#666"/>
          <rect x="18" y="35" width="12" height="4" rx="1" fill="#999"/>
        </svg>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="6" width="40" height="32" rx="8" stroke="#0066CC" strokeWidth="3" fill="none"/>
          <circle cx="24" cy="22" r="6" fill="#0066CC"/>
          <path d="M24 14v16M14 22h20" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>

      <div className="wechat-tip">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 2L14 14H2L8 2Z" fill="#09BB07"/>
        </svg>
        <p>{t('auth.wechatLoginTip')}</p>
      </div>
    </div>
  );
}
