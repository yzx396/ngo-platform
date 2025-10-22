import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { useForm, FormProvider } from 'react-hook-form';
import { AvailabilityInput } from '../components/AvailabilityInput';

function AvailabilityInputWithForm() {
  const form = useForm({
    defaultValues: {
      availability: '',
    },
  });

  return (
    <FormProvider {...form}>
      <AvailabilityInput control={form.control} />
    </FormProvider>
  );
}

describe('AvailabilityInput', () => {
  it('should render textarea for availability input', () => {
    render(<AvailabilityInputWithForm />);

    const textarea = screen.getByPlaceholderText(/e\.g\.|Monday/i);
    expect(textarea).toBeInTheDocument();
  });

  it('should have a label', () => {
    render(<AvailabilityInputWithForm />);

    expect(screen.getByText(/Times when|Availability/i)).toBeInTheDocument();
  });

  it('should accept user input', async () => {
    const user = userEvent.setup();
    render(<AvailabilityInputWithForm />);

    const textarea = screen.getByPlaceholderText(/e\.g\.|Monday/i);
    await user.type(textarea, 'Weekdays 9am-5pm EST');

    expect((textarea as HTMLTextAreaElement).value).toBe('Weekdays 9am-5pm EST');
  });

  it('should support multi-line input', async () => {
    const user = userEvent.setup();
    render(<AvailabilityInputWithForm />);

    const textarea = screen.getByPlaceholderText(/e\.g\.|Monday/i);
    await user.type(textarea, 'Monday-Friday{Enter}9am-5pm EST{Enter}Flexible on weekends');

    const value = (textarea as HTMLTextAreaElement).value;
    expect(value).toContain('Monday-Friday');
    expect(value).toContain('9am-5pm EST');
    expect(value).toContain('Flexible on weekends');
  });

  it('should display help text with examples', () => {
    render(<AvailabilityInputWithForm />);

    expect(screen.getByText(/e\.g\.|Monday.*Friday/i)).toBeInTheDocument();
  });

  it('should show character count', () => {
    render(<AvailabilityInputWithForm />);

    expect(screen.getByText(/characters/i)).toBeInTheDocument();
  });

  it('should enforce character limit', async () => {
    const user = userEvent.setup();
    render(<AvailabilityInputWithForm />);

    const textarea = screen.getByPlaceholderText(/e\.g\.|Monday/i) as HTMLTextAreaElement;
    const longText = 'a'.repeat(201);

    await user.type(textarea, longText);

    // Character limit is 200, so only 200 characters should be in the value
    expect(textarea.value.length).toBeLessThanOrEqual(200);
  });

  it('should have proper accessibility attributes', () => {
    render(<AvailabilityInputWithForm />);

    const textarea = screen.getByPlaceholderText(/e\.g\.|Monday/i);
    expect(textarea).toHaveAttribute('aria-describedby');
  });

  it('should be optional (no required attribute)', () => {
    render(<AvailabilityInputWithForm />);

    const textarea = screen.getByPlaceholderText(/e\.g\.|Monday/i);
    expect(textarea).not.toHaveAttribute('required');
  });
});
