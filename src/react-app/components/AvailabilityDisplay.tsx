import { useTranslation } from 'react-i18next';

/**
 * AvailabilityDisplay component
 * Read-only display of mentor availability text
 * Preserves line breaks and shows "Not specified" when empty
 */
interface AvailabilityDisplayProps {
  availability: string | null | undefined;
}

export function AvailabilityDisplay({ availability }: AvailabilityDisplayProps) {
  const { t } = useTranslation();

  if (!availability) {
    return <span className="text-muted-foreground">{t('mentor.notSpecified')}</span>;
  }

  return (
    <span className="whitespace-pre-wrap text-foreground">
      {availability}
    </span>
  );
}
