import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

interface AvailabilityInputProps<T extends FieldValues = any> {
  control: Control<T>;
  name?: Path<T>;
  maxLength?: number;
}

/**
 * AvailabilityInput component
 * Free text input for mentor availability using React Hook Form
 * Supports multi-line text and character limit
 */
export function AvailabilityInput<T extends FieldValues = any>({
  control,
  name = 'availability' as Path<T>,
  maxLength = 200
}: AvailabilityInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="space-y-2">
          <Label htmlFor={name}>Availability</Label>
          <Textarea
            id={name}
            placeholder="e.g., Weekdays 9am-5pm EST, Flexible on weekends"
            value={field.value || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= maxLength) {
                field.onChange(value);
              }
            }}
            maxLength={maxLength}
            className="resize-none"
            aria-describedby={`${name}-description`}
            rows={4}
          />
          <div className="flex justify-between items-center">
            <p id={`${name}-description`} className="text-sm text-muted-foreground">
              Examples: "Weekdays 9am-5pm EST", "Flexible, contact me"
            </p>
            <span className="text-xs text-muted-foreground">
              {(field.value || '').length}/{maxLength} characters
            </span>
          </div>
        </div>
      )}
    />
  );
}
