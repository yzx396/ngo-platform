import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { MentoringLevel } from '../../types/mentor';

interface MentoringLevelPickerProps<T extends FieldValues = Record<string, unknown>> {
  control: Control<T>;
  name?: Path<T>;
}

/**
 * MentoringLevelPicker component
 * Checkbox group for selecting mentoring levels with bit flag conversion
 * Works with React Hook Form for form state management
 */
export function MentoringLevelPicker<T extends FieldValues = Record<string, unknown>>({
  control,
  name = 'mentoring_levels' as Path<T>
}: MentoringLevelPickerProps<T>) {
  const { t } = useTranslation();

  const levels = [
    { value: MentoringLevel.Entry, label: t('mentoringLevel.entry') },
    { value: MentoringLevel.Senior, label: t('mentoringLevel.senior') },
    { value: MentoringLevel.Staff, label: t('mentoringLevel.staff') },
    { value: MentoringLevel.Management, label: t('mentoringLevel.management') },
  ];

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t('mentor.mentoringLevels')}
          </legend>

          <div className="space-y-2">
            {levels.map((level) => (
              <div key={level.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`level-${level.value}`}
                  checked={(field.value & level.value) !== 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      // Add level using bitwise OR
                      field.onChange(field.value | level.value);
                    } else {
                      // Remove level using bitwise AND with negation
                      field.onChange(field.value & ~level.value);
                    }
                  }}
                  aria-label={`Select ${level.label} mentoring level`}
                />
                <Label
                  htmlFor={`level-${level.value}`}
                  className="font-normal cursor-pointer"
                >
                  {level.label}
                </Label>
              </div>
            ))}
          </div>
        </fieldset>
      )}
    />
  );
}
