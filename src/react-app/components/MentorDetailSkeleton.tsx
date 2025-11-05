import { Card, CardContent, CardHeader } from './ui/card';
import { Skeleton } from './ui/skeleton';

/**
 * MentorDetailSkeleton - Loading skeleton for mentor detail page
 * Shows a placeholder while mentor profile is loading
 */
export function MentorDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      {/* Back button skeleton */}
      <Skeleton className="h-9 w-20" />

      {/* Header section */}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-start gap-6">
            {/* Avatar skeleton */}
            <Skeleton className="h-24 w-24 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-3">
              {/* Name skeleton */}
              <Skeleton className="h-7 w-1/3" />
              {/* Title skeleton */}
              <Skeleton className="h-5 w-1/2" />
              {/* Rate skeleton */}
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Bio skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {/* LinkedIn skeleton */}
          <Skeleton className="h-10 w-40" />

          {/* Availability skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
          </div>

          {/* Tags section skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-32 rounded-full" />
            </div>
          </div>

          {/* Buttons skeleton */}
          <div className="flex gap-3 pt-4">
            <Skeleton className="h-10 flex-1 rounded" />
            <Skeleton className="h-10 flex-1 rounded" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
