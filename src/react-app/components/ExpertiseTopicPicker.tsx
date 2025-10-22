import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ExpertiseTopic } from '../../types/mentor';

interface ExpertiseTopicPickerProps<T extends FieldValues = Record<string, unknown>> {
  control: Control<T>;
  presetName?: Path<T>;
  customName?: Path<T>;
  required?: boolean;
}

/**
 * ExpertiseTopicPicker component
 * Handles both predefined expertise topics (bit flags) and custom topic tags
 * Works with React Hook Form for form state management
 */
export function ExpertiseTopicPicker<T extends FieldValues = Record<string, unknown>>({
  control,
  presetName = 'expertise_topics_preset' as Path<T>,
  customName = 'expertise_topics_custom' as Path<T>,
  required = false
}: ExpertiseTopicPickerProps<T>) {
  const { t } = useTranslation();
  const [customInput, setCustomInput] = useState('');

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
    <div className="space-y-4">
      {/* Preset Topics */}
      <Controller
        control={control}
        name={presetName}
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

      {/* Custom Topics */}
      <Controller
        control={control}
        name={customName}
        render={({ field }) => (
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t('mentor.customTopics')}
            </legend>

            <div className="space-y-3">
              {/* Display custom tags */}
              {field.value && field.value.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {field.value.map((tag: string) => (
                    <div
                      key={tag}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => {
                          field.onChange(field.value.filter((t: string) => t !== tag));
                        }}
                        className="text-blue-600 hover:text-blue-900 font-bold"
                        aria-label={`Remove tag ${tag}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input for adding custom tags */}
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder={t('mentor.addCustomTopicPlaceholder')}
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const trimmed = customInput.trim();
                      if (trimmed && !field.value.includes(trimmed)) {
                        field.onChange([...(field.value || []), trimmed]);
                        setCustomInput('');
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const trimmed = customInput.trim();
                    if (trimmed && !field.value.includes(trimmed)) {
                      field.onChange([...(field.value || []), trimmed]);
                      setCustomInput('');
                    }
                  }}
                >
                  {t('common.add')}
                </Button>
              </div>

              <p className="text-sm text-gray-500">
                {t('mentor.customTopicsHint')}
              </p>
            </div>
          </fieldset>
        )}
      />
    </div>
  );
}
