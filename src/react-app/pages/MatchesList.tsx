import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '../components/ui/card';
import { StatusBadge } from '../components/StatusBadge';
import { Empty, EmptyContent, EmptyTitle, EmptyDescription } from '../components/ui/empty';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Label } from '../components/ui/label';
import { getMatches, acceptMatch, rejectMatch, completeMatch } from '../services/matchService';
import { getCVMetadata } from '../services/cvService';
import { handleApiError, showSuccessToast } from '../services/apiClient';
import type { Match } from '../../types/match';

/**
 * MatchesList page
 * View all mentor-mentee matches with sidebar filters
 * Matches the layout pattern of MentorBrowse page
 */
export function MatchesList() {
  const { t } = useTranslation();
  const [mentorMatches, setMentorMatches] = useState<Match[]>([]);
  const [menteeMatches, setMenteeMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'completed'>('all');

  // Fetch both mentor and mentee matches in parallel
  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const [mentorData, menteeData] = await Promise.all([
        getMatches({ role: 'mentor' }),
        getMatches({ role: 'mentee' }),
      ]);
      setMentorMatches(mentorData);
      setMenteeMatches(menteeData);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const handleRespond = async (matchId: string, action: 'accept' | 'reject') => {
    try {
      if (action === 'accept') {
        await acceptMatch(matchId);
        showSuccessToast(t('matches.requestAccepted'));
      } else {
        await rejectMatch(matchId);
        showSuccessToast(t('matches.requestRejected'));
      }
      fetchMatches();
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleComplete = async (matchId: string) => {
    try {
      await completeMatch(matchId);
      showSuccessToast(t('matches.matchCompleted'));
      fetchMatches();
    } catch (error) {
      handleApiError(error);
    }
  };

  // Filter matches based on status filter
  const filterMatches = (matches: Match[]) => {
    if (statusFilter === 'all') return matches;
    return matches.filter((m) => {
      if (statusFilter === 'pending') return m.status === 'pending';
      if (statusFilter === 'active') return m.status === 'active' || m.status === 'accepted';
      if (statusFilter === 'completed') return m.status === 'completed' || m.status === 'rejected';
      return true;
    });
  };

  const filteredMentorMatches = filterMatches(mentorMatches);
  const filteredMenteeMatches = filterMatches(menteeMatches);
  const allMatches = [...mentorMatches, ...menteeMatches];

  const pendingCount = allMatches.filter((m) => m.status === 'pending').length;
  const activeCount = allMatches.filter((m) => m.status === 'active' || m.status === 'accepted').length;
  const completedCount = allMatches.filter((m) => m.status === 'completed' || m.status === 'rejected').length;

  const hasMentorMatches = mentorMatches.length > 0;
  const hasMenteeMatches = menteeMatches.length > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t('matches.myMatches')}</h1>
        <p className="text-muted-foreground">
          {t('matches.yourRequests')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-4 space-y-6">

            {/* Status Filter */}
            <div className="space-y-3">
              <Label>{t('matches.filterByStatus')}</Label>
              <div className="space-y-2">
                <StatusFilterButton
                  label={t('matches.allStatus')}
                  count={allMatches.length}
                  isActive={statusFilter === 'all'}
                  onClick={() => setStatusFilter('all')}
                />
                <StatusFilterButton
                  label={t('matches.pending')}
                  count={pendingCount}
                  isActive={statusFilter === 'pending'}
                  onClick={() => setStatusFilter('pending')}
                />
                <StatusFilterButton
                  label={t('matches.active')}
                  count={activeCount}
                  isActive={statusFilter === 'active'}
                  onClick={() => setStatusFilter('active')}
                />
                <StatusFilterButton
                  label={t('matches.completed')}
                  count={completedCount}
                  isActive={statusFilter === 'completed'}
                  onClick={() => setStatusFilter('completed')}
                />
              </div>
            </div>

            <Button onClick={fetchMatches} className="w-full">
              {t('common.refresh')}
            </Button>
          </Card>
        </div>

        {/* Results Grid */}
        <div className="lg:col-span-3 space-y-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <p className="text-muted-foreground">{t('common.loading')}</p>
            </div>
          ) : !hasMentorMatches && !hasMenteeMatches ? (
            <Empty>
              <EmptyContent>
                <EmptyTitle>{t('matches.noMatches')}</EmptyTitle>
                <EmptyDescription>
                  {t('matches.noMatchesMessage')}
                </EmptyDescription>
                {statusFilter !== 'all' && (
                  <Button
                    onClick={() => setStatusFilter('all')}
                    variant="outline"
                    className="mt-4"
                  >
                    {t('common.clear')}
                  </Button>
                )}
              </EmptyContent>
            </Empty>
          ) : (
            <div className="space-y-8">
              {/* Mentor Section - Mentees I'm mentoring */}
              {hasMentorMatches && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">{t('matches.yourMentees')}</h2>
                  {filteredMentorMatches.length === 0 ? (
                    <p className="text-muted-foreground">{t('matches.noMentees')}</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredMentorMatches.map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          role="mentor"
                          onRespond={handleRespond}
                          onComplete={handleComplete}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Mentee Section - Mentors I have */}
              {hasMenteeMatches && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">{t('matches.yourMentors')}</h2>
                  {filteredMenteeMatches.length === 0 ? (
                    <p className="text-muted-foreground">{t('matches.noMentors')}</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredMenteeMatches.map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          role="mentee"
                          onRespond={handleRespond}
                          onComplete={handleComplete}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Status Filter Button Component
 */
function StatusFilterButton({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2 text-left text-sm rounded-md border transition-colors flex items-center justify-between ${
        isActive
          ? 'bg-accent text-accent-foreground border-accent'
          : 'border-input hover:bg-accent hover:text-accent-foreground'
      }`}
    >
      <span>{label}</span>
      <span className="text-xs font-semibold">({count})</span>
    </button>
  );
}

/**
 * MatchCard component - displays individual match details
 * Styled to match MentorCard for visual consistency
 */
function MatchCard({
  match,
  role,
  onRespond,
  onComplete,
}: {
  match: Match;
  role: 'mentor' | 'mentee';
  onRespond?: (matchId: string, action: 'accept' | 'reject') => void;
  onComplete?: (matchId: string) => void;
}) {
  const { t } = useTranslation();
  const [loadingCv, setLoadingCv] = useState(false);

  // Display mentor or mentee name, with ID fallback
  const displayName = role === 'mentor'
    ? match.mentee_name || `Mentee ${match.mentee_id.slice(0, 8)}`
    : match.mentor_name || `Mentor ${match.mentor_id.slice(0, 8)}`;
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const createdDate = new Date(match.created_at * 1000).toLocaleDateString();

  // Handle CV download for mentors
  const handleDownloadCV = async () => {
    setLoadingCv(true);
    try {
      // Get CV metadata which includes signed URL
      const metadata = await getCVMetadata(match.mentee_id);
      if (metadata?.cv_url) {
        // Open the signed URL in a new window (download)
        window.open(metadata.cv_url, '_blank');
        showSuccessToast(t('matches.downloadingCv'));
      } else {
        handleApiError(new Error('CV not available'));
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoadingCv(false);
    }
  };

  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-lg leading-tight">{displayName}</h3>
              <p className="text-sm text-muted-foreground">{t('matches.created')} {createdDate}</p>
            </div>
          </div>
          <StatusBadge status={match.status} size="sm" />
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">{t('matches.status')}</p>
          <p className="text-sm">{t(`status.${match.status}`)}</p>
        </div>

        {/* Show contact information for active and completed matches */}
        {(match.status === 'active' || match.status === 'accepted' || match.status === 'completed') && (
          <>
            {/* Show other person's email */}
            {role === 'mentor' && match.mentee_email && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t('matches.menteeEmail')}</p>
                <a
                  href={`mailto:${match.mentee_email}`}
                  className="text-sm text-primary hover:underline"
                >
                  {match.mentee_email}
                </a>
              </div>
            )}
            {role === 'mentee' && match.mentor_email && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t('matches.mentorEmail')}</p>
                <a
                  href={`mailto:${match.mentor_email}`}
                  className="text-sm text-primary hover:underline"
                >
                  {match.mentor_email}
                </a>
              </div>
            )}

            {/* Show mentor LinkedIn URL if available (for mentees) */}
            {role === 'mentee' && match.mentor_linkedin_url && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t('matches.mentorLinkedIn')}</p>
                <a
                  href={match.mentor_linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                  aria-label="LinkedIn Profile"
                >
                  {match.mentor_linkedin_url}
                </a>
              </div>
            )}
          </>
        )}

        {/* Show introduction and preferred_time for mentors viewing pending requests */}
        {match.status === 'pending' && role === 'mentor' && (
          <>
            {match.introduction && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t('matches.introductionLabel')}</p>
                <p className="text-sm line-clamp-3 text-foreground">{match.introduction}</p>
              </div>
            )}
            {match.preferred_time && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t('matches.preferredTimeLabel')}</p>
                <p className="text-sm text-foreground">{match.preferred_time}</p>
              </div>
            )}
          </>
        )}

        {/* Show CV availability badge for mentors */}
        {role === 'mentor' && (
          <div>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
              match.cv_included
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {match.cv_included ? t('matches.cvAvailable') : t('matches.cvNotAvailable')}
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 pt-3 flex-wrap">
        {match.status === 'pending' && role === 'mentor' && onRespond && (
          <>
            {/* Show CV button if CV is included */}
            {!!match.cv_included && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={handleDownloadCV}
                disabled={loadingCv}
              >
                {loadingCv ? t('matches.downloadingCv') : t('matches.viewCv')}
              </Button>
            )}
            <Button
              size="sm"
              variant="default"
              className="flex-1"
              onClick={() => onRespond(match.id, 'accept')}
            >
              {t('matches.accept')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => onRespond(match.id, 'reject')}
            >
              {t('matches.reject')}
            </Button>
          </>
        )}
        {(match.status === 'active' || match.status === 'accepted') && onComplete && (
          <>
            {/* Show CV button if CV is included */}
            {!!match.cv_included && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={handleDownloadCV}
                disabled={loadingCv}
              >
                {loadingCv ? t('matches.downloadingCv') : t('matches.viewCv')}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => onComplete(match.id)}
            >
              {t('matches.complete')}
            </Button>
          </>
        )}
        {match.status === 'completed' && (
          <>
            {/* Show CV button if CV is included */}
            {!!match.cv_included && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={handleDownloadCV}
                disabled={loadingCv}
              >
                {loadingCv ? t('matches.downloadingCv') : t('matches.viewCv')}
              </Button>
            )}
            <Button size="sm" variant="outline" className="flex-1" disabled>
              {t('matches.viewDetails')}
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
