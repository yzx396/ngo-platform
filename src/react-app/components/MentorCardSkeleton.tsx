import { Card, CardContent, CardHeader, CardFooter } from './ui/card';
import { Skeleton } from './ui/skeleton';

/**
 * MentorCardSkeleton - Loading skeleton for mentor cards
 * Matches the layout of MentorCard for a smooth loading experience
 */
export function MentorCardSkeleton() {
  return (
    <Card className="flex flex-col h-full">
      {/* Header */}
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          {/* Avatar skeleton */}
          <Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            {/* Name skeleton */}
            <Skeleton className="h-5 w-3/4" />
            {/* Title skeleton */}
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="flex-1 space-y-4">
        {/* Bio skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>

        {/* Rate skeleton */}
        <Skeleton className="h-4 w-1/3" />

        {/* Tags skeleton */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </CardContent>

      {/* Footer */}
      <CardFooter className="gap-2 pt-3">
        <Skeleton className="h-9 flex-1 rounded" />
        <Skeleton className="h-9 flex-1 rounded" />
      </CardFooter>
    </Card>
  );
}
