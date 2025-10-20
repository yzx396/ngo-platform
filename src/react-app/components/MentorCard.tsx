import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { AvailabilityDisplay } from './AvailabilityDisplay';
import { getLevelNames, getPaymentTypeNames } from '../../types/mentor';
import { createMatch } from '../services/matchService';
import { handleApiError, showSuccessToast } from '../services/apiClient';
import type { MentorProfile } from '../../types/mentor';

interface MentorCardProps {
  mentor: MentorProfile;
  onViewDetails?: () => void;
  onRequestMentorship?: () => void;
  isMatched?: boolean;
}

/**
 * MentorCard component
 * Displays a compact mentor profile card with key info and action buttons
 * Used in browse/search views and match lists
 */
export function MentorCard({
  mentor,
  onViewDetails,
  onRequestMentorship,
  isMatched = false
}: MentorCardProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const levelNames = getLevelNames(mentor.mentoring_levels);
  const paymentNames = getPaymentTypeNames(mentor.payment_types);

  const handleRequestMentorship = async () => {
    setIsRequesting(true);
    try {
      await createMatch(mentor.user_id);
      showSuccessToast('Mentorship request sent!');
      onRequestMentorship?.();
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsRequesting(false);
    }
  };

  // Get initials for avatar fallback
  const initials = mentor.nick_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Truncate bio to 100 chars
  const bioPreview = mentor.bio.length > 100 ? mentor.bio.substring(0, 100) + '...' : mentor.bio;

  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-lg leading-tight">{mentor.nick_name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{bioPreview}</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {/* Mentoring Levels */}
        {levelNames.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Levels</p>
            <div className="flex flex-wrap gap-1">
              {levelNames.slice(0, 3).map((level) => (
                <Badge key={level} variant="outline" className="text-xs">
                  {level}
                </Badge>
              ))}
              {levelNames.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{levelNames.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Hourly Rate */}
        {mentor.hourly_rate && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Rate:</span>
            <Badge variant="secondary">${mentor.hourly_rate}/hr</Badge>
          </div>
        )}

        {/* Payment Types */}
        {paymentNames.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Accepts</p>
            <p className="text-sm">{paymentNames.slice(0, 3).join(', ')}</p>
          </div>
        )}

        {/* Availability */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Availability</p>
          <p className="text-sm">
            <AvailabilityDisplay availability={mentor.availability} />
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 pt-3">
        {onViewDetails && (
          <Button variant="outline" size="sm" className="flex-1" onClick={onViewDetails}>
            View Details
          </Button>
        )}
        {!isMatched && (
          <Button
            size="sm"
            className="flex-1"
            onClick={handleRequestMentorship}
            disabled={isRequesting}
          >
            {isRequesting ? 'Requesting...' : 'Request Mentorship'}
          </Button>
        )}
        {isMatched && (
          <Button size="sm" className="flex-1" disabled>
            Already Matched
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
