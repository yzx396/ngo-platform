import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { ExpertiseDomain } from '../../types/mentor';

interface ExpertiseDomainPickerProps<T extends FieldValues = Record<string, unknown>> {
  control: Control<T>;
  name?: Path<T>;
  required?: boolean;
}

/**
 * ExpertiseDomainPicker component
 * Checkbox group for selecting professional domains with bit flag conversion
 * Works with React Hook Form for form state management
 */
export function ExpertiseDomainPicker<T extends FieldValues = Record<string, unknown>>({
  control,
  name = 'expertise_domains' as Path<T>,
  required = true
}: ExpertiseDomainPickerProps<T>) {
  const { t } = useTranslation();

  const domains = [
    { value: ExpertiseDomain.TechnicalDevelopment, label: t('expertiseDomain.technicalDevelopment') },
    { value: ExpertiseDomain.ProductAndProject, label: t('expertiseDomain.productAndProject') },
    { value: ExpertiseDomain.ManagementAndStrategy, label: t('expertiseDomain.managementAndStrategy') },
    { value: ExpertiseDomain.CareerDevelopment, label: t('expertiseDomain.careerDevelopment') },
  ];

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t('mentor.expertiseDomains')}
            {required && <span className="text-red-500 ml-1">*</span>}
          </legend>

          <div className="space-y-2">
            {domains.map((domain) => (
              <div key={domain.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`domain-${domain.value}`}
                  checked={(field.value & domain.value) !== 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      // Add domain using bitwise OR
                      field.onChange(field.value | domain.value);
                    } else {
                      // Remove domain using bitwise AND with negation
                      field.onChange(field.value & ~domain.value);
                    }
                  }}
                  aria-label={`Select ${domain.label} expertise domain`}
                />
                <Label
                  htmlFor={`domain-${domain.value}`}
                  className="font-normal cursor-pointer"
                >
                  {domain.label}
                </Label>
              </div>
            ))}
          </div>
        </fieldset>
      )}
    />
  );
}
