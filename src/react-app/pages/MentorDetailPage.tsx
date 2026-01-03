import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '../components/ui/card';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { AvailabilityDisplay } from '../components/AvailabilityDisplay';
import { MentorDetailSkeleton } from '../components/MentorDetailSkeleton';
import { RequestMentorshipDialog } from '../components/RequestMentorshipDialog';
import { getLevelNames, getPaymentTypeNames, getDomainNames, getTopicNames } from '../../types/mentor';
import { getMentorProfile } from '../services/mentorService';
import { checkExistingMatch } from '../services/matchService';
import { handleApiError } from '../services/apiClient';
import type { MentorProfile } from '../../types/mentor';

/**
 * MentorDetailPage
 * Displays full details of a mentor profile
 * Allows users to request mentorship from this mentor
 */
export function MentorDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Note: Authentication is handled by ProtectedRoute wrapper, no need to check here
  const [mentor, setMentor] = useState<MentorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasExistingMatch, setHasExistingMatch] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('Invalid mentor ID');
      setLoading(false);
      return;
    }

    const fetchMentor = async () => {
      try {
        const data = await getMentorProfile(id);
        setMentor(data);

        // Check if user already has a pending/active match with this mentor
        try {
          const matchResult = await checkExistingMatch(data.user_id);
          setHasExistingMatch(matchResult?.exists ?? false);
        } catch {
          // Silently fail - don't show error for this background operation
        }
      } catch (err) {
        setError('Failed to load mentor profile');
        handleApiError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMentor();
  }, [id]);

  const handleRequestMentorship = () => {
    // Open dialog (auth already checked by ProtectedRoute)
    setIsDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    navigate('/matches');
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return <MentorDetailSkeleton />;
  }

  if (error || !mentor) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="py-12 text-center">
            <p className="text-red-500 mb-4">{t('common.error')}: {error || t('errors.notFound')}</p>
            <Button onClick={handleBack} variant="outline">
              {t('common.back')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const levelNames = getLevelNames(mentor.mentoring_levels);
  const paymentNames = getPaymentTypeNames(mentor.payment_types);
  const domainNames = getDomainNames(mentor.expertise_domains);
  const topicNames = getTopicNames(mentor.expertise_topics_preset);

  // Get initials for avatar fallback
  const initials = mentor.nick_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back Button */}
        <Button onClick={handleBack} variant="ghost" className="mb-4">
          ← {t('mentor.backToBrowse')}
        </Button>

        {/* Main Profile Card */}
        <Card>
          <CardHeader className="pb-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 flex-shrink-0">
                  <AvatarFallback className="text-xl font-bold">{initials}</AvatarFallback>
                </Avatar>
                <h1 className="text-3xl font-bold">{mentor.nick_name}</h1>
              </div>
              <p className="text-lg text-muted-foreground whitespace-pre-wrap">{mentor.bio}</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* LinkedIn Profile */}
            {mentor.linkedin_url && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('mentor.linkedinProfile')}
                </h3>
                <a
                  href={mentor.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  {t('mentor.viewLinkedInProfile')}
                </a>
              </div>
            )}

            {/* Expertise Domains */}
            {domainNames.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('mentor.expertiseDomains')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {domainNames.map((domain) => (
                    <Badge key={domain} variant="secondary" className="text-sm bg-blue-100 text-blue-600">
                      {t(`expertiseDomain.${domain.charAt(0).toLowerCase() + domain.slice(1)}`)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Expertise Topics */}
            {topicNames.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('mentor.expertiseTopics')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {topicNames.map((topic) => (
                    <Badge key={topic} variant="outline" className="text-sm">
                      {t(`expertiseTopic.${topic.charAt(0).toLowerCase() + topic.slice(1)}`)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Mentoring Levels */}
            {levelNames.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('mentor.mentoringLevels')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {levelNames.map((level) => (
                    <Badge key={level} variant="default" className="text-sm">
                      {level}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Hourly Rate */}
            {mentor.hourly_rate && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('mentor.hourlyRate')}
                </h3>
                <div className="text-2xl font-bold">${mentor.hourly_rate}/hr</div>
              </div>
            )}

            {/* Payment Types */}
            {paymentNames.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('mentor.paymentTypes')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {paymentNames.map((payment) => (
                    <Badge key={payment} variant="secondary" className="text-sm">
                      {payment}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Availability */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t('mentor.availability')}
              </h3>
              <p className="text-base">
                <AvailabilityDisplay availability={mentor.availability} />
              </p>
            </div>
          </CardContent>

          <CardFooter className="pt-6 border-t">
            <Button
              size="lg"
              className="w-full"
              onClick={handleRequestMentorship}
              disabled={hasExistingMatch}
            >
              {hasExistingMatch ? t('mentor.alreadyMatched') : t('mentor.requestMentorship')}
            </Button>
          </CardFooter>
        </Card>

        {/* Mentorship Request Dialog */}
        <RequestMentorshipDialog
          mentor={mentor}
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSuccess={handleDialogSuccess}
        />
      </div>
    </div>
  );
}
