import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { EventsPage } from '../pages/EventsPage';

// Mock window.open
global.window.open = vi.fn();

describe('EventsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the events page title', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <EventsPage />
      </I18nextProvider>
    );

    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toBeInTheDocument();
    expect(title.textContent).toContain('Events');
  });

  it('should render the events subtitle', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <EventsPage />
      </I18nextProvider>
    );

    expect(screen.getByText(/Discover and join our community events|发现并参加我们的社区活动/)).toBeInTheDocument();
  });

  it('should display upcoming events section', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <EventsPage />
      </I18nextProvider>
    );

    expect(screen.getByText(/Upcoming Events|即将举行的活动/)).toBeInTheDocument();
  });

  it('should display event cards with event details', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <EventsPage />
      </I18nextProvider>
    );

    // Check for event title (upcoming event)
    expect(screen.getByText(/Claude Code 实战工作坊/)).toBeInTheDocument();

    // Check for location - there should be multiple San Jose entries
    const locationElements = screen.getAllByText(/San Jose/);
    expect(locationElements.length).toBeGreaterThan(0);

    // Check for hosts - there should be multiple host displays
    const hostElements = screen.getAllByText(/hosts/);
    expect(hostElements.length).toBeGreaterThan(0);
  });

  it('should open event in Luma when clicked', async () => {
    const user = userEvent.setup();
    render(
      <I18nextProvider i18n={i18n}>
        <EventsPage />
      </I18nextProvider>
    );

    // Find and click the event card
    const eventTitle = screen.getByText(/Claude Code 实战工作坊/);
    const eventCard = eventTitle.closest('div');

    if (eventCard) {
      await user.click(eventCard);
    }

    expect(window.open).toHaveBeenCalledWith('https://luma.com/o4f5akc4', '_blank');
  });

  it('should display event date and time', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <EventsPage />
      </I18nextProvider>
    );

    // The event date should be displayed (Nov 15, 2025)
    expect(screen.getByText(/Nov 15/)).toBeInTheDocument();
    // Time should be displayed - check for PM or AM indicator
    const eventContainer = screen.getByText(/Claude Code 实战工作坊/).closest('div');
    expect(eventContainer).toBeInTheDocument();
    // Look for either PM or the time separator
    const pageText = eventContainer?.textContent || '';
    expect(pageText).toMatch(/PM|AM|6|18/);
  });

  it('should display availability information', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <EventsPage />
      </I18nextProvider>
    );

    // Check for spots remaining
    expect(screen.getByText(/12 spots/)).toBeInTheDocument();
  });

  it('should display attendee count', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <EventsPage />
      </I18nextProvider>
    );

    // Check for attendee count - there should be multiple attendee displays
    const attendeeElements = screen.getAllByText(/attendees/);
    expect(attendeeElements.length).toBeGreaterThan(0);
  });

  it('should display location information', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <EventsPage />
      </I18nextProvider>
    );

    // Check for city names in the page - there should be multiple cities
    const cityElements = screen.getAllByText(/San Jose|Burlingame|Cupertino/);
    expect(cityElements.length).toBeGreaterThan(0);
  });

  it('should display hosts count', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <EventsPage />
      </I18nextProvider>
    );

    // Check for hosts information - there should be multiple host count displays
    const hostElements = screen.getAllByText(/hosts/);
    expect(hostElements.length).toBeGreaterThan(0);
  });

  it('should have event image', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <EventsPage />
      </I18nextProvider>
    );

    // Check for event image
    const images = screen.getAllByRole('img');
    const eventImage = images.find((img) =>
      img.getAttribute('alt')?.includes('Claude Code')
    );
    expect(eventImage).toBeInTheDocument();
  });

  it('should have proper heading hierarchy', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <EventsPage />
      </I18nextProvider>
    );

    const mainHeading = screen.getByRole('heading', { level: 1 });
    const subHeadings = screen.getAllByRole('heading', { level: 2 });

    expect(mainHeading.textContent).toContain('Events');
    expect(subHeadings.length).toBeGreaterThan(0);
    expect(subHeadings[0].textContent).toMatch(/Upcoming|即将/);
  });

  it('should have "View Event" link visible', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <EventsPage />
      </I18nextProvider>
    );

    // Check for "View Event" text - there should be multiple (one for each event)
    const viewEventLinks = screen.getAllByText(/View Event|查看活动/);
    expect(viewEventLinks.length).toBeGreaterThan(0);
  });

  it('should display both upcoming and past events sections', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <EventsPage />
      </I18nextProvider>
    );

    // Check for both sections
    expect(screen.getByText(/Upcoming Events|即将举行的活动/)).toBeInTheDocument();
    expect(screen.getByText(/Past Events|过去的活动/)).toBeInTheDocument();
  });

  it('should display past events from the data', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <EventsPage />
      </I18nextProvider>
    );

    // Check for some past event titles
    expect(screen.getByText(/压力管理与情绪调适工作坊/)).toBeInTheDocument();
    expect(screen.getByText(/Speed Mentoring 快速导师面对面/)).toBeInTheDocument();
  });

  it('should have correct number of event cards', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <EventsPage />
      </I18nextProvider>
    );

    // Should have 9 events total (1 upcoming + 8 past)
    const viewEventLinks = screen.getAllByText(/View Event|查看活动/);
    expect(viewEventLinks.length).toBe(9);
  });
});
