import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { ExpertiseTopic } from '../../types/mentor';

interface ExpertiseTopicPickerProps<T extends FieldValues = Record<string, unknown>> {
  control: Control<T>;
  name?: Path<T>;
  required?: boolean;
}

/**
 * ExpertiseTopicPicker component
 * Checkbox group for selecting predefined expertise topics with bit flag conversion
 * Works with React Hook Form for form state management
 */
export function ExpertiseTopicPicker<T extends FieldValues = Record<string, unknown>>({
  control,
  name = 'expertise_topics_preset' as Path<T>,
  required = false
}: ExpertiseTopicPickerProps<T>) {
  const { t } = useTranslation();

  const presetTopics = [
    { value: ExpertiseTopic.CareerTransition, label: t('expertiseTopic.careerTransition') },
    { value: ExpertiseTopic.TechnicalSkills, label: t('expertiseTopic.technicalSkills') },
    { value: ExpertiseTopic.Leadership, label: t('expertiseTopic.leadership') },
    { value: ExpertiseTopic.Communication, label: t('expertiseTopic.communication') },
    { value: ExpertiseTopic.InterviewPrep, label: t('expertiseTopic.interviewPrep') },
    { value: ExpertiseTopic.Negotiation, label: t('expertiseTopic.negotiation') },
    { value: ExpertiseTopic.TimeManagement, label: t('expertiseTopic.timeManagement') },
    { value: ExpertiseTopic.Fundraising, label: t('expertiseTopic.fundraising') },
    { value: ExpertiseTopic.VolunteerManagement, label: t('expertiseTopic.volunteerManagement') },
    { value: ExpertiseTopic.StrategicPlanning, label: t('expertiseTopic.strategicPlanning') },
  ];

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t('mentor.expertiseTopics')}
            {required && <span className="text-red-500 ml-1">*</span>}
          </legend>

          <div className="grid grid-cols-2 gap-3">
            {presetTopics.map((topic) => (
              <div key={topic.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`topic-${topic.value}`}
                  checked={(field.value & topic.value) !== 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      // Add topic using bitwise OR
                      field.onChange(field.value | topic.value);
                    } else {
                      // Remove topic using bitwise AND with negation
                      field.onChange(field.value & ~topic.value);
                    }
                  }}
                  aria-label={`Select ${topic.label} expertise topic`}
                />
                <Label
                  htmlFor={`topic-${topic.value}`}
                  className="font-normal cursor-pointer"
                >
                  {topic.label}
                </Label>
              </div>
            ))}
          </div>
        </fieldset>
      )}
    />
  );
}
