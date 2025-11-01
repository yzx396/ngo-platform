import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { EventsPage } from '../pages/EventsPage';

// Mock window.open
global.window.open = vi.fn();

describe('EventsPage', () => {
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

    expect(screen.getByText('Upcoming community events')).toBeInTheDocument();
  });

  it('should have a view events button', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <EventsPage />
      </I18nextProvider>
    );

    const button = screen.getByRole('button', { name: /View Events Calendar/i });
    expect(button).toBeInTheDocument();
  });

  it('should open Luma calendar when button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <I18nextProvider i18n={i18n}>
        <EventsPage />
      </I18nextProvider>
    );

    const button = screen.getByRole('button', { name: /View Events Calendar/i });
    await user.click(button);

    expect(window.open).toHaveBeenCalledWith('https://luma.com/leadforward', '_blank');
  });

  it('should display feature cards', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <EventsPage />
      </I18nextProvider>
    );

    // Feature titles use translation keys
    expect(screen.getByText(/Browse Events|浏览活动/)).toBeInTheDocument();
    expect(screen.getByText(/Register Easily|轻松注册/)).toBeInTheDocument();
    expect(screen.getByText(/Get Reminders|获取提醒/)).toBeInTheDocument();
  });

  it('should have info about events being managed on Luma', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <EventsPage />
      </I18nextProvider>
    );

    // Check for Luma managed message (in English by default in tests)
    const lumaText = screen.getByText(/Events are managed on our Luma calendar|活动在我们的 Luma 日历上管理/);
    expect(lumaText).toBeInTheDocument();
  });

  it('should explain that users will be directed to Luma', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <EventsPage />
      </I18nextProvider>
    );

    expect(
      screen.getByText(/official Luma event page|官方 Luma 活动页面/, { exact: false })
    ).toBeInTheDocument();
  });

  it('should be accessible with proper heading hierarchy', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <EventsPage />
      </I18nextProvider>
    );

    const mainHeading = screen.getByRole('heading', { level: 1 });
    const subHeading = screen.getByRole('heading', { level: 2 });

    expect(mainHeading.textContent).toMatch(/Events|活动/);
    expect(subHeading.textContent).toMatch(/Community Calendar|社区日历/);
  });
});
