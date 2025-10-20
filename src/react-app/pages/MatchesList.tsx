import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { StatusBadge } from '../components/StatusBadge';
import { Skeleton } from '../components/ui/skeleton';
import { Empty, EmptyContent, EmptyTitle, EmptyDescription } from '../components/ui/empty';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { getMatches, acceptMatch, rejectMatch, completeMatch } from '../services/matchService';
import { handleApiError, showSuccessToast } from '../services/apiClient';
import type { Match } from '../../types/match';

/**
 * MatchesList page
 * View all mentor-mentee matches with role-based filtering
 * Allows accepting/rejecting/completing matches
 */
export function MatchesList() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'mentor' | 'mentee'>('mentee');

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

  const pendingMatches = matches.filter((m) => m.status === 'pending');
  const activeMatches = matches.filter((m) => m.status === 'active' || m.status === 'accepted');
  const completedMatches = matches.filter((m) => m.status === 'completed' || m.status === 'rejected');

  if (loading) {
    return (
      <div className="container py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">My Matches</h1>
        <p className="text-lg text-muted-foreground">
          {role === 'mentor' ? 'Mentorship requests from mentees' : 'Your mentorship requests'}
        </p>
      </div>

      {/* Role Tabs */}
      <Tabs value={role} onValueChange={(value) => setRole(value as 'mentor' | 'mentee')}>
        <TabsList>
          <TabsTrigger value="mentee">As Mentee</TabsTrigger>
          <TabsTrigger value="mentor">As Mentor</TabsTrigger>
        </TabsList>

        <TabsContent value={role} className="space-y-6">
          {/* Status Tabs */}
          <Tabs defaultValue="pending" className="w-full">
            <TabsList>
              <TabsTrigger value="pending">
                Pending ({pendingMatches.length})
              </TabsTrigger>
              <TabsTrigger value="active">
                Active ({activeMatches.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedMatches.length})
              </TabsTrigger>
            </TabsList>

            {/* Pending */}
            <TabsContent value="pending">
              {pendingMatches.length === 0 ? (
                <Empty>
                  <EmptyContent>
                    <EmptyTitle>{role === 'mentor' ? 'No pending requests' : 'No pending requests'}</EmptyTitle>
                    <EmptyDescription>You'll see mentorship requests here</EmptyDescription>
                  </EmptyContent>
                </Empty>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {pendingMatches.map((match) => (
                    <MatchCard key={match.id} match={match} role={role} onRespond={handleRespond} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Active */}
            <TabsContent value="active">
              {activeMatches.length === 0 ? (
                <Empty>
                  <EmptyContent>
                    <EmptyTitle>No active matches</EmptyTitle>
                    <EmptyDescription>Once you accept a mentorship request, it will appear here</EmptyDescription>
                  </EmptyContent>
                </Empty>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {activeMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      role={role}
                      onComplete={handleComplete}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Completed */}
            <TabsContent value="completed">
              {completedMatches.length === 0 ? (
                <Empty>
                  <EmptyContent>
                    <EmptyTitle>No completed matches</EmptyTitle>
                    <EmptyDescription>Your completed matches will appear here</EmptyDescription>
                  </EmptyContent>
                </Empty>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {completedMatches.map((match) => (
                    <MatchCard key={match.id} match={match} role={role} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * MatchCard component - displays individual match details
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
  const initials = displayName.split(' ')[0].slice(0, 2).toUpperCase();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{displayName}</CardTitle>
              <CardDescription>Match created {new Date(match.created_at * 1000).toLocaleDateString()}</CardDescription>
            </div>
          </div>
          <StatusBadge status={match.status} size="sm" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
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
        </div>
      </CardContent>
    </Card>
  );
}
