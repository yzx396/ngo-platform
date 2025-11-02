import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { events } from '../data/events';
import {
  formatEventDate,
  formatEventTime,
  formatPrice,
  isUpcomingEvent,
  type Event,
} from '../../types/event';

/**
 * EventsPage Component
 * Displays upcoming and past community events from Luma
 * Shows upcoming events at the top, past events below
 * Clicking an event opens the Luma event page in a new tab
 */
export function EventsPage() {
  const { t } = useTranslation();

  // Separate upcoming and past events
  const upcomingEvents = events.filter((event) => isUpcomingEvent(event.start_at));
  const pastEvents = events.filter((event) => !isUpcomingEvent(event.start_at));

  // Sort by date (upcoming: earliest first, past: most recent first)
  upcomingEvents.sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );
  pastEvents.sort(
    (a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime()
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t('events.title', 'Events')}</h1>
        <p className="text-muted-foreground">
          {t('events.subtitle', 'Discover and join our community events')}
        </p>
      </div>

      {/* Upcoming Events Section */}
      {upcomingEvents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">{t('events.upcomingEvents', 'Upcoming Events')}</h2>
          <div className="grid gap-4">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}

      {/* Past Events Section */}
      {pastEvents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">{t('events.pastEvents', 'Past Events')}</h2>
          <div className="grid gap-4">
            {pastEvents.map((event) => (
              <EventCard key={event.id} event={event} isPast />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {upcomingEvents.length === 0 && pastEvents.length === 0 && (
        <div className="flex items-center justify-center min-h-[300px]">
          <p className="text-muted-foreground">{t('events.noEvents', 'No events found')}</p>
        </div>
      )}
    </div>
  );
}

interface EventCardProps {
  event: Event;
  isPast?: boolean;
}

function EventCard({ event, isPast }: EventCardProps) {
  const { t } = useTranslation();

  const handleClick = () => {
    window.open(event.luma_url, '_blank');
  };

  return (
    <div
      onClick={handleClick}
      className={`
        cursor-pointer rounded-lg border overflow-hidden
        transition-all hover:shadow-md hover:border-primary/50
        ${isPast ? 'opacity-75' : 'bg-card'}
      `}
    >
      <div className="flex flex-col md:flex-row">
        {/* Image */}
        {event.cover_image_url && (
          <div className="md:w-48 md:h-48 flex-shrink-0">
            <img
              src={event.cover_image_url}
              alt={event.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col justify-between">
          {/* Title and Date */}
          <div className="space-y-2 mb-4">
            <h3 className="text-lg font-semibold hover:text-primary transition-colors">
              {event.name}
            </h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span>{formatEventDate(event.start_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🕐</span>
                <span>{formatEventTime(event.start_at, event.end_at)}</span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
            {/* Location */}
            <div>
              <div className="text-muted-foreground text-xs mb-1">
                {t('events.location', 'Location')}
              </div>
              {event.location.location_type === 'online' ? (
                <div className="font-medium">Online</div>
              ) : (
                <div className="font-medium">
                  {event.location.city}
                  {event.location.region && `, ${event.location.region}`}
                </div>
              )}
            </div>

            {/* Price */}
            <div>
              <div className="text-muted-foreground text-xs mb-1">
                {t('events.price', 'Price')}
              </div>
              <div className="font-medium">{formatPrice(event)}</div>
            </div>

            {/* Availability */}
            <div>
              <div className="text-muted-foreground text-xs mb-1">
                {t('events.availability', 'Availability')}
              </div>
              {event.ticket_info.is_sold_out ? (
                <div className="font-medium text-destructive">
                  {t('events.soldOut', 'Sold Out')}
                </div>
              ) : event.ticket_info.spots_remaining !== undefined ? (
                <div className="font-medium">
                  {event.ticket_info.spots_remaining} {t('events.spotsRemaining', 'spots')}
                </div>
              ) : (
                <div className="font-medium">-</div>
              )}
            </div>

            {/* Hosts */}
            <div>
              <div className="text-muted-foreground text-xs mb-1">
                {t('events.hosts', 'Hosts')}
              </div>
              <div className="font-medium text-xs">
                {event.hosts.length > 0
                  ? `${event.hosts.length} ${t('events.hostCount', 'hosts')}`
                  : '-'}
              </div>
            </div>
          </div>

          {/* Attendees and Open Button */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {t('events.attendees', '{{count}} attendees', { count: event.guest_count })}
            </div>
            <div className="flex items-center gap-2 text-primary hover:gap-3 transition-all">
              <span className="text-sm font-medium">{t('events.viewEvent', 'View Event')}</span>
              <ExternalLink className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventsPage;
