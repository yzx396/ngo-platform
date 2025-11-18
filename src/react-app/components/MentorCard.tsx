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
    <Card className="group relative flex flex-col h-full border-l-4 border-l-primary hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      {/* Header: Name and Price */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold text-lg leading-tight text-foreground">{mentor.nick_name}</h3>
          {mentor.hourly_rate && (
            <div className="text-right">
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent/10 text-accent-foreground border border-accent/20">
                <span className="text-sm font-bold">${mentor.hourly_rate}</span>
                <span className="text-xs opacity-80">/hr</span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      {/* Content Section */}
      <CardContent className="flex-1 space-y-3 pb-3">
        {/* Bio */}
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{mentor.bio}</p>

        {/* Mentoring Levels - Primary color */}
        {levelNames.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {levelNames.map((level) => (
              <Badge key={level} variant="default" className="text-xs font-medium bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 transition-colors">
                {level}
              </Badge>
            ))}
          </div>
        )}

        {/* Expertise Domains - Secondary/sage green */}
        {domainNames.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {domainNames.map((domain) => (
              <Badge key={domain} variant="secondary" className="text-xs font-medium bg-secondary/10 text-secondary-foreground border-secondary/20 hover:bg-secondary/15 transition-colors">
                {t(`expertiseDomain.${domain.charAt(0).toLowerCase() + domain.slice(1)}`)}
              </Badge>
            ))}
          </div>
        )}

        {/* Expertise Topics - Outline style */}
        {topicNames.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {topicNames.map((topic) => (
              <Badge key={topic} variant="outline" className="text-xs font-medium border-muted-foreground/20 hover:bg-muted/50 transition-colors">
                {t(`expertiseTopic.${topic.charAt(0).toLowerCase() + topic.slice(1)}`)}
              </Badge>
            ))}
          </div>
        )}

        {/* Payment Methods as Warm Chips */}
        {paymentNames.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {paymentNames.map((payment) => (
              <span
                key={payment}
                className="inline-flex items-center px-3 py-1 text-xs font-medium border border-border rounded-full bg-muted/30 text-muted-foreground"
              >
                {payment}
              </span>
            ))}
          </div>
        )}

        {/* Availability */}
        {mentor.availability && (
          <div className="text-sm text-muted-foreground">
            <AvailabilityDisplay availability={mentor.availability} />
          </div>
        )}
      </CardContent>

      {/* Footer: Action Buttons */}
      <CardFooter className="flex gap-2 pt-3 border-t border-border/50">
        {onViewDetails && (
          <Button variant="outline" size="sm" className="flex-1 font-medium" onClick={onViewDetails}>
            {t('mentor.viewDetails')}
          </Button>
        )}
        {!isMatched && (
          <Button
            size="sm"
            className="flex-1 font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            onClick={handleRequestMentorship}
          >
            {t('mentor.requestMentorship')}
          </Button>
        )}
        {isMatched && (
          <Button size="sm" className="flex-1 font-medium" disabled>
            {t('mentor.alreadyMatched')}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
