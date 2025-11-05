interface FounderCardProps {
  name: string;
  title: string;
  photoUrl: string;
}

/**
 * FounderCard Component
 * Displays a founder's profile with photo, name, and title
 * Reusable component for displaying team members
 */
export function FounderCard({ name, title, photoUrl }: FounderCardProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-4">
      {/* Photo */}
      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-muted border-2 border-border flex-shrink-0">
        <img
          src={photoUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"%3E%3Cpath d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/%3E%3C/svg%3E';
          }}
        />
      </div>

      {/* Name and Title */}
      <div className="space-y-1">
        <h3 className="font-semibold text-lg sm:text-base">{name}</h3>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
    </div>
  );
}
