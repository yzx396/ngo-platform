/**
 * AvailabilityDisplay component
 * Read-only display of mentor availability text
 * Preserves line breaks and shows "Not specified" when empty
 */
interface AvailabilityDisplayProps {
  availability: string | null | undefined;
}

export function AvailabilityDisplay({ availability }: AvailabilityDisplayProps) {
  if (!availability) {
    return <span className="text-muted-foreground">Not specified</span>;
  }

  return (
    <span className="whitespace-pre-wrap text-foreground">
      {availability}
    </span>
  );
}
