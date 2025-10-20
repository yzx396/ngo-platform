import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AvailabilityDisplay } from '../components/AvailabilityDisplay';

describe('AvailabilityDisplay', () => {
  it('should render availability text', () => {
    const availability = 'Weekdays 9am-5pm EST';
    render(<AvailabilityDisplay availability={availability} />);
    expect(screen.getByText('Weekdays 9am-5pm EST')).toBeInTheDocument();
  });

  it('should render "Not specified" when availability is null', () => {
    render(<AvailabilityDisplay availability={null} />);
    expect(screen.getByText('Not specified')).toBeInTheDocument();
  });

  it('should render "Not specified" when availability is empty string', () => {
    render(<AvailabilityDisplay availability="" />);
    expect(screen.getByText('Not specified')).toBeInTheDocument();
  });

  it('should preserve line breaks in availability text', () => {
    const availability = 'Monday-Friday\n9am-5pm EST\nFlexible on weekends';
    render(<AvailabilityDisplay availability={availability} />);
    const element = screen.getByText(/Monday-Friday/);
    expect(element).toHaveClass('whitespace-pre-wrap');
  });

  it('should apply muted text styling when availability is not specified', () => {
    render(<AvailabilityDisplay availability={null} />);
    const element = screen.getByText('Not specified');
    expect(element).toHaveClass('text-muted-foreground');
  });

  it('should be accessible with heading', () => {
    render(
      <div>
        <h3>Availability</h3>
        <AvailabilityDisplay availability="9am-5pm EST" />
      </div>
    );
    expect(screen.getByRole('heading', { name: 'Availability' })).toBeInTheDocument();
  });
});
