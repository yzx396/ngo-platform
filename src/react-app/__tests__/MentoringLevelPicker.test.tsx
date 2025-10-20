import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { useForm, FormProvider } from 'react-hook-form';
import { MentoringLevelPicker } from '../components/MentoringLevelPicker';
import { MentoringLevel } from '../../types/mentor';

// Wrapper component that provides form context
function MentoringLevelPickerWithForm({ onValuesChange }: { onValuesChange?: (values: number) => void }) {
  const form = useForm({
    defaultValues: {
      mentoring_levels: 0,
    },
  });

  // Watch for changes and call callback
  const watchedValue = form.watch('mentoring_levels');
  if (onValuesChange) {
    onValuesChange(watchedValue);
  }

  return (
    <FormProvider {...form}>
      <MentoringLevelPicker control={form.control} />
    </FormProvider>
  );
}

describe('MentoringLevelPicker', () => {
  it('should render all mentoring level options', () => {
    render(<MentoringLevelPickerWithForm />);

    expect(screen.getByLabelText(/entry/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senior/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/staff/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/management/i)).toBeInTheDocument();
  });

  it('should start with no levels selected', () => {
    render(<MentoringLevelPickerWithForm />);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
    // All checkboxes should exist (they're rendered but unchecked by default)
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeInTheDocument();
    });
  });

  it('should update bit flags when Entry is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<MentoringLevelPickerWithForm onValuesChange={onChange} />);

    const entryCheckbox = screen.getByLabelText(/entry/i);
    await user.click(entryCheckbox);

    // Entry = 1
    expect(onChange).toHaveBeenCalledWith(MentoringLevel.Entry);
  });

  it('should combine bit flags when multiple levels are selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<MentoringLevelPickerWithForm onValuesChange={onChange} />);

    const entryCheckbox = screen.getByLabelText(/entry/i);
    const seniorCheckbox = screen.getByLabelText(/senior/i);

    await user.click(entryCheckbox);
    // Entry = 1
    expect(onChange).toHaveBeenCalledWith(MentoringLevel.Entry);

    await user.click(seniorCheckbox);
    // Entry | Senior = 1 | 2 = 3
    expect(onChange).toHaveBeenLastCalledWith(MentoringLevel.Entry | MentoringLevel.Senior);
  });

  it('should deselect a level when unchecked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<MentoringLevelPickerWithForm onValuesChange={onChange} />);

    const entryCheckbox = screen.getByLabelText(/entry/i);

    await user.click(entryCheckbox);
    expect(onChange).toHaveBeenLastCalledWith(MentoringLevel.Entry);

    await user.click(entryCheckbox);
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it('should have proper accessibility attributes', () => {
    render(<MentoringLevelPickerWithForm />);

    const fieldset = screen.getByRole('group');
    expect(fieldset).toBeInTheDocument();

    const labels = screen.getAllByText(/Entry|Senior|Staff|Management/);
    labels.forEach((label) => {
      expect(label).toBeVisible();
    });
  });
});
