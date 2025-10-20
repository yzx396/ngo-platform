import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '../components/ui/card';
import { StatusBadge } from '../components/StatusBadge';
import { Skeleton } from '../components/ui/skeleton';
import { Empty, EmptyContent, EmptyTitle, EmptyDescription } from '../components/ui/empty';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { getMatches, acceptMatch, rejectMatch, completeMatch } from '../services/matchService';
import { handleApiError, showSuccessToast } from '../services/apiClient';
import type { Match } from '../../types/match';

/**
 * MatchesList page
 * View all mentor-mentee matches with sidebar filters
 * Matches the layout pattern of MentorBrowse page
 */
export function MatchesList() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'mentor' | 'mentee'>('mentee');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'completed'>('all');

  useEffect(() => {
    fetchMatches();
  }, [role]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const data = await getMatches({ role });
      setMatches(data);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (matchId: string, action: 'accept' | 'reject') => {
    try {
      if (action === 'accept') {
        await acceptMatch(matchId);
        showSuccessToast('Match accepted');
      } else {
        await rejectMatch(matchId);
        showSuccessToast('Match rejected');
      }
      fetchMatches();
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleComplete = async (matchId: string) => {
    try {
      await completeMatch(matchId);
      showSuccessToast('Match completed');
      fetchMatches();
    } catch (error) {
      handleApiError(error);
    }
  };

  // Filter matches based on status filter
  const filteredMatches = statusFilter === 'all'
    ? matches
    : matches.filter((m) => {
        if (statusFilter === 'pending') return m.status === 'pending';
        if (statusFilter === 'active') return m.status === 'active' || m.status === 'accepted';
        if (statusFilter === 'completed') return m.status === 'completed' || m.status === 'rejected';
        return true;
      });

  const pendingCount = matches.filter((m) => m.status === 'pending').length;
  const activeCount = matches.filter((m) => m.status === 'active' || m.status === 'accepted').length;
  const completedCount = matches.filter((m) => m.status === 'completed' || m.status === 'rejected').length;

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <Skeleton className="h-96" />
          </div>
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-96" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">My Matches</h1>
        <p className="text-lg text-muted-foreground">
          {role === 'mentor' ? 'Mentorship requests from mentees' : 'Your mentorship requests'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-4 space-y-6">
            {/* Role Selection */}
            <div className="space-y-3">
              <Label>View As</Label>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setRole('mentee');
                    setStatusFilter('all');
                  }}
                  className={`w-full px-3 py-2 text-left text-sm rounded-md border transition-colors ${
                    role === 'mentee'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input hover:bg-accent'
                  }`}
                >
                  As Mentee
                </button>
                <button
                  onClick={() => {
                    setRole('mentor');
                    setStatusFilter('all');
                  }}
                  className={`w-full px-3 py-2 text-left text-sm rounded-md border transition-colors ${
                    role === 'mentor'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input hover:bg-accent'
                  }`}
                >
                  As Mentor
                </button>
              </div>
            </div>

            <Separator />

            {/* Status Filter */}
            <div className="space-y-3">
              <Label>Filter by Status</Label>
              <div className="space-y-2">
                <StatusFilterButton
                  label="All"
                  count={matches.length}
                  isActive={statusFilter === 'all'}
                  onClick={() => setStatusFilter('all')}
                />
                <StatusFilterButton
                  label="Pending"
                  count={pendingCount}
                  isActive={statusFilter === 'pending'}
                  onClick={() => setStatusFilter('pending')}
                />
                <StatusFilterButton
                  label="Active"
                  count={activeCount}
                  isActive={statusFilter === 'active'}
                  onClick={() => setStatusFilter('active')}
                />
                <StatusFilterButton
                  label="Completed"
                  count={completedCount}
                  isActive={statusFilter === 'completed'}
                  onClick={() => setStatusFilter('completed')}
                />
              </div>
            </div>

            <Button onClick={fetchMatches} className="w-full">
              Refresh
            </Button>
          </Card>
        </div>

        {/* Results Grid */}
        <div className="lg:col-span-3 space-y-6">
          {filteredMatches.length === 0 ? (
            <Empty>
              <EmptyContent>
                <EmptyTitle>No matches found</EmptyTitle>
                <EmptyDescription>
                  {statusFilter === 'all'
                    ? role === 'mentor'
                      ? "You don't have any mentorship requests yet"
                      : "You haven't sent any mentorship requests yet"
                    : `No ${statusFilter} matches at this time`}
                </EmptyDescription>
                {statusFilter !== 'all' && (
                  <Button
                    onClick={() => setStatusFilter('all')}
                    variant="outline"
                    className="mt-4"
                  >
                    Clear Filter
                  </Button>
                )}
              </EmptyContent>
            </Empty>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  role={role}
                  onRespond={handleRespond}
                  onComplete={handleComplete}
                />
              ))}
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
  // For display, use mentor_id or mentee_id as fallback
  const displayName = role === 'mentor' ? `Mentee ${match.mentee_id.slice(0, 8)}` : `Mentor ${match.mentor_id.slice(0, 8)}`;
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const createdDate = new Date(match.created_at * 1000).toLocaleDateString();

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
              <p className="text-sm text-muted-foreground">Created {createdDate}</p>
            </div>
          </div>
          <StatusBadge status={match.status} size="sm" />
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
          <p className="text-sm capitalize">{match.status}</p>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 pt-3">
        {match.status === 'pending' && role === 'mentor' && onRespond && (
          <>
            <Button
              size="sm"
              variant="default"
              className="flex-1"
              onClick={() => onRespond(match.id, 'accept')}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => onRespond(match.id, 'reject')}
            >
              Reject
            </Button>
          </>
        )}
        {(match.status === 'active' || match.status === 'accepted') && onComplete && (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => onComplete(match.id)}
          >
            Complete
          </Button>
        )}
        {match.status === 'completed' && (
          <Button size="sm" variant="outline" className="w-full" disabled>
            View Details
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
