export interface Host {
  name: string;
  username?: string;
  avatar_url?: string;
}

export interface TicketInfo {
  price_cents?: number;
  currency?: string;
  is_free: boolean;
  spots_remaining?: number;
  is_sold_out: boolean;
}

export interface EventLocation {
  location_type: 'online' | 'offline';
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  full_address?: string;
}

export interface Event {
  id: string; // API ID from Luma
  name: string;
  description?: string;
  start_at: string; // ISO 8601 timestamp
  end_at: string; // ISO 8601 timestamp
  timezone?: string;
  location: EventLocation;
  ticket_info: TicketInfo;
  hosts: Host[];
  guest_count: number;
  ticket_count?: number;
  cover_image_url?: string;
  luma_url: string; // Full URL to event on Luma
  luma_slug: string; // Short slug for Luma URL (e.g., "o4f5akc4")
}

export function formatEventDate(startAt: string): string {
  const date = new Date(startAt);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatEventTime(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);

  const startTime = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const endTime = end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${startTime} - ${endTime}`;
}

export function formatPrice(event: Event): string {
  if (event.ticket_info.is_free) {
    return 'Free';
  }

  if (!event.ticket_info.price_cents || !event.ticket_info.currency) {
    return 'Price TBA';
  }

  const price = event.ticket_info.price_cents / 100;
  const currency = event.ticket_info.currency.toUpperCase();

  return `${currency} ${price.toFixed(2)}`;
}

export function isUpcomingEvent(startAt: string): boolean {
  return new Date(startAt) > new Date();
}
