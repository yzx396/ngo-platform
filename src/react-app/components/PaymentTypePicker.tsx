import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { PaymentType } from '../../types/mentor';

interface PaymentTypePickerProps<T extends FieldValues = any> {
  control: Control<T>;
  name?: Path<T>;
}

/**
 * PaymentTypePicker component
 * Checkbox group for selecting payment types with bit flag conversion
 * Works with React Hook Form for form state management
 */
export function PaymentTypePicker<T extends FieldValues = any>({
  control,
  name = 'payment_types' as Path<T>
}: PaymentTypePickerProps<T>) {
  const types = [
    { value: PaymentType.Venmo, label: 'Venmo' },
    { value: PaymentType.Paypal, label: 'PayPal' },
    { value: PaymentType.Zelle, label: 'Zelle' },
    { value: PaymentType.Alipay, label: 'Alipay' },
    { value: PaymentType.Wechat, label: 'WeChat' },
    { value: PaymentType.Crypto, label: 'Crypto' },
  ];

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Payment Types
          </legend>

          <div className="grid grid-cols-2 gap-3">
            {types.map((type) => (
              <div key={type.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`payment-${type.value}`}
                  checked={(field.value & type.value) !== 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      field.onChange(field.value | type.value);
                    } else {
                      field.onChange(field.value & ~type.value);
                    }
                  }}
                  aria-label={`Select ${type.label} as payment method`}
                />
                <Label
                  htmlFor={`payment-${type.value}`}
                  className="font-normal cursor-pointer"
                >
                  {type.label}
                </Label>
              </div>
            ))}
          </div>
        </fieldset>
      )}
    />
  );
}
