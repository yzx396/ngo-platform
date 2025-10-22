import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { AvailabilityDisplay } from './AvailabilityDisplay';
import { getLevelNames, getPaymentTypeNames, getDomainNames, getTopicNames } from '../../types/mentor';
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
 *
 * Layout: Header with name and price, bio, mentoring level, payment methods, availability, and action buttons
 */
export function MentorCard({
  mentor,
  onViewDetails,
  onRequestMentorship,
  isMatched = false
}: MentorCardProps) {
  const { t } = useTranslation();
  const levelNames = getLevelNames(mentor.mentoring_levels);
  const paymentNames = getPaymentTypeNames(mentor.payment_types);
  const domainNames = getDomainNames(mentor.expertise_domains);
  const topicNames = getTopicNames(mentor.expertise_topics_preset);

  const handleRequestMentorship = () => {
    // Parent must provide callback (which opens dialog with intro/time fields)
    if (onRequestMentorship) {
      onRequestMentorship();
    }
  };

  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      {/* Header: Name and Price */}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-lg leading-tight">{mentor.nick_name}</h3>
          {mentor.hourly_rate && (
            <div className="text-right">
              <p className="text-sm font-semibold text-orange-600">
                ${mentor.hourly_rate}/hr
              </p>
            </div>
          )}
        </div>
      </CardHeader>

      {/* Content Section */}
      <CardContent className="flex-1 space-y-3 pb-3">
        {/* Bio */}
        <p className="text-sm text-muted-foreground line-clamp-2">{mentor.bio}</p>

        {/* Mentoring Levels */}
        {levelNames.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {levelNames.map((level) => (
              <Badge key={level} variant="default" className="text-xs">
                {level}
              </Badge>
            ))}
          </div>
        )}

        {/* Expertise Domains */}
        {domainNames.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {domainNames.map((domain) => (
              <Badge key={domain} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                {t(`expertiseDomain.${domain.charAt(0).toLowerCase() + domain.slice(1)}`)}
              </Badge>
            ))}
          </div>
        )}

        {/* Expertise Topics */}
        {(topicNames.length > 0 || (mentor.expertise_topics_custom && mentor.expertise_topics_custom.length > 0)) && (
          <div className="flex flex-wrap gap-2">
            {topicNames.map((topic) => (
              <Badge key={topic} variant="outline" className="text-xs">
                {t(`expertiseTopic.${topic.charAt(0).toLowerCase() + topic.slice(1)}`)}
              </Badge>
            ))}
            {mentor.expertise_topics_custom && mentor.expertise_topics_custom.map((custom) => (
              <Badge key={custom} variant="outline" className="text-xs bg-green-50 border-green-200">
                {custom}
              </Badge>
            ))}
          </div>
        )}

        {/* Payment Methods as Chips */}
        {paymentNames.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {paymentNames.map((payment) => (
              <button
                key={payment}
                className="px-3 py-1 text-xs border border-gray-300 rounded-full bg-white hover:bg-gray-50 transition-colors"
                disabled
              >
                {payment}
              </button>
            ))}
          </div>
        )}

        {/* Availability */}
        {mentor.availability && (
          <p className="text-sm text-gray-600">
            <AvailabilityDisplay availability={mentor.availability} />
          </p>
        )}
      </CardContent>

      {/* Footer: Action Buttons */}
      <CardFooter className="flex gap-2 pt-2">
        {onViewDetails && (
          <Button variant="outline" size="sm" className="flex-1" onClick={onViewDetails}>
            {t('mentor.viewDetails')}
          </Button>
        )}
        {!isMatched && (
          <Button
            size="sm"
            className="flex-1"
            onClick={handleRequestMentorship}
          >
            {t('mentor.requestMentorship')}
          </Button>
        )}
        {isMatched && (
          <Button size="sm" className="flex-1" disabled>
            {t('mentor.alreadyMatched')}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
