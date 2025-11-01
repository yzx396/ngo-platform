import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { ExternalLink } from 'lucide-react';

/**
 * EventsPage Component
 * Displays upcoming community events from Luma
 * Uses Luma's official event calendar and registration
 * Opens Luma calendar in a new tab for event browsing and registration
 */
export function EventsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          {t('events.title')}
        </h1>
        <p className="text-muted-foreground">
          {t('events.subtitle')}
        </p>
      </div>

      {/* Events Info Card */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">{t('events.calendarTitle')}</h2>
          <p className="text-muted-foreground">
            {t('events.calendarDescription')}
          </p>
        </div>

        {/* Open Luma Button */}
        <Button
          onClick={() => window.open('https://luma.com/leadforward', '_blank')}
          className="w-full sm:w-auto flex items-center gap-2"
          size="lg"
        >
          {t('events.viewEventsButton')}
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>

      {/* Features List */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4 space-y-2">
          <div className="text-2xl">📅</div>
          <h3 className="font-semibold">{t('events.browseEventsTitle')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('events.browseEventsDesc')}
          </p>
        </div>
        <div className="rounded-lg border p-4 space-y-2">
          <div className="text-2xl">✍️</div>
          <h3 className="font-semibold">{t('events.registerTitle')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('events.registerDesc')}
          </p>
        </div>
        <div className="rounded-lg border p-4 space-y-2">
          <div className="text-2xl">🔔</div>
          <h3 className="font-semibold">{t('events.remindersTitle')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('events.remindersDesc')}
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 space-y-2">
        <p className="text-sm font-medium">
          {t('events.lumaManaged')}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('events.lumaDescription')}
        </p>
      </div>
    </div>
  );
}

export default EventsPage;
