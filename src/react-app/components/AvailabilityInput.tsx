import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

interface AvailabilityInputProps<T extends FieldValues = Record<string, unknown>> {
  control: Control<T>;
  name?: Path<T>;
  maxLength?: number;
}

/**
 * AvailabilityInput component
 * Free text input for mentor availability using React Hook Form
 * Supports multi-line text and character limit
 */
export function AvailabilityInput<T extends FieldValues = Record<string, unknown>>({
  control,
  name = 'availability' as Path<T>,
  maxLength = 200
}: AvailabilityInputProps<T>) {
  const { t } = useTranslation();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="space-y-2">
          <Label htmlFor={name}>{t('mentor.availability')}</Label>
          <Textarea
            id={name}
            placeholder={t('mentor.availabilityPlaceholder')}
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
              {t('mentor.availabilityExample')}
            </p>
            <span className="text-xs text-muted-foreground">
              {t('mentor.availabilityCharCount', { current: (field.value || '').length })}
            </span>
          </div>
        </div>
      )}
    />
  );
}
