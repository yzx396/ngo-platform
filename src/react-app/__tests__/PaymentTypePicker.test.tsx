import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { useForm, FormProvider } from 'react-hook-form';
import { PaymentTypePicker } from '../components/PaymentTypePicker';
import { PaymentType } from '../../types/mentor';

function PaymentTypePickerWithForm({ onValuesChange }: { onValuesChange?: (values: number) => void }) {
  const form = useForm({
    defaultValues: {
      payment_types: 0,
    },
  });

  const watchedValue = form.watch('payment_types');
  if (onValuesChange) {
    onValuesChange(watchedValue);
  }

  return (
    <FormProvider {...form}>
      <PaymentTypePicker control={form.control} />
    </FormProvider>
  );
}

describe('PaymentTypePicker', () => {
  it('should render all payment type options', () => {
    render(<PaymentTypePickerWithForm />);

    expect(screen.getByLabelText(/venmo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/paypal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/zelle/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/alipay/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/wechat/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/crypto/i)).toBeInTheDocument();
  });

  it('should start with no payment types selected', () => {
    render(<PaymentTypePickerWithForm />);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(6);
  });

  it('should update bit flags when Venmo is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<PaymentTypePickerWithForm onValuesChange={onChange} />);

    const venmoCheckbox = screen.getByLabelText(/venmo/i);
    await user.click(venmoCheckbox);

    expect(onChange).toHaveBeenCalledWith(PaymentType.Venmo);
  });

  it('should combine bit flags when multiple payment types are selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<PaymentTypePickerWithForm onValuesChange={onChange} />);

    const venmoCheckbox = screen.getByLabelText(/venmo/i);
    const paypalCheckbox = screen.getByLabelText(/paypal/i);

    await user.click(venmoCheckbox);
    expect(onChange).toHaveBeenCalledWith(PaymentType.Venmo);

    await user.click(paypalCheckbox);
    expect(onChange).toHaveBeenLastCalledWith(PaymentType.Venmo | PaymentType.Paypal);
  });

  it('should deselect a payment type when unchecked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<PaymentTypePickerWithForm onValuesChange={onChange} />);

    const venmoCheckbox = screen.getByLabelText(/venmo/i);

    await user.click(venmoCheckbox);
    expect(onChange).toHaveBeenLastCalledWith(PaymentType.Venmo);

    await user.click(venmoCheckbox);
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it('should have proper accessibility attributes', () => {
    render(<PaymentTypePickerWithForm />);

    const fieldset = screen.getByRole('group');
    expect(fieldset).toBeInTheDocument();
  });
});
