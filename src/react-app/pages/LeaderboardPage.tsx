import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { UserPointsBadge } from '../components/UserPointsBadge';
import { PointsInfoDialog } from '../components/PointsInfoDialog';
import { getLeaderboard } from '../services/pointsService';
import type { LeaderboardEntry } from '../../types/api';
import { ApiError } from '../services/apiClient';
import { toast } from 'sonner';
import { HelpCircle } from 'lucide-react';

const USERS_PER_PAGE = 50;

/**
 * LeaderboardPage Component
 * Displays ranked list of users sorted by points
 * Shows user's own position highlighted
 */
export function LeaderboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [users, setUsers] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch leaderboard
  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getLeaderboard(USERS_PER_PAGE, offset);
        setUsers(response.users);
        setTotal(response.total);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to load leaderboard';
        setError(message);
        toast.error(message);
        console.error('Error loading leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, [offset]);

  // Calculate pagination info
  const hasNextPage = offset + USERS_PER_PAGE < total;
  const hasPreviousPage = offset > 0;

  const handleNextPage = () => {
    setOffset((prev) => prev + USERS_PER_PAGE);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePreviousPage = () => {
    setOffset((prev) => Math.max(prev - USERS_PER_PAGE, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Find current user's rank
  const currentUserEntry = users.find((entry) => entry.user_id === user?.id);
  const userRank = currentUserEntry?.rank;

  // Render loading state
  if (loading && users.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{t('leaderboard.title', 'Leaderboard')}</h1>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && users.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{t('leaderboard.title', 'Leaderboard')}</h1>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <p className="text-destructive">{error}</p>
          <Button onClick={() => setOffset(0)}>
            {t('common.tryAgain', 'Try Again')}
          </Button>
        </div>
      </div>
    );
  }

  // Render empty state
  if (users.length === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{t('leaderboard.title', 'Leaderboard')}</h1>
          <p className="text-muted-foreground">
            {t('leaderboard.subtitle', 'Top contributors in our community')}
          </p>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">{t('leaderboard.noData', 'No leaderboard data yet')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Info Button */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <h1 className="text-3xl font-bold">{t('leaderboard.title', 'Leaderboard')}</h1>
          <p className="text-muted-foreground">
            {t('leaderboard.subtitle', 'Top contributors in our community')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="mt-1"
          title={t('points.howToEarn')}
          aria-label={t('points.howToEarn')}
        >
          <HelpCircle className="w-4 h-4 mr-2" />
          {t('points.howToEarn')}
        </Button>
      </div>

      {/* User's rank info (if logged in and on leaderboard) */}
      {user && userRank && (
        <div className="relative bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 border border-primary/20 rounded-xl p-5 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,oklch(0.75_0.12_85/0.08),transparent_50%)]" />
          <div className="relative">
            <p className="text-base font-bold text-foreground flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-sm">
                #{userRank}
              </span>
              {t('leaderboard.yourRank', 'Your rank: {{rank}}', {
                rank: `#${userRank}`,
              })}
            </p>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Table Header */}
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-5 py-4 text-left font-bold text-sm">{t('leaderboard.rank', 'Rank')}</th>
                <th className="px-5 py-4 text-left font-bold text-sm">{t('common.name', 'Name')}</th>
                <th className="px-5 py-4 text-right font-bold text-sm">{t('points.label', 'Points')}</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-border/50">
              {users.map((entry, index) => {
                const isCurrentUser = user?.id === entry.user_id;
                const isTopThree = entry.rank <= 3;
                const rowClass = isCurrentUser
                  ? 'bg-primary/5 hover:bg-primary/10 border-l-4 border-l-primary'
                  : isTopThree
                    ? 'bg-accent/5 hover:bg-accent/10'
                    : index % 2 === 0
                      ? 'bg-background hover:bg-muted/30'
                      : 'bg-muted/10 hover:bg-muted/20';

                return (
                  <tr key={entry.user_id} className={`transition-all duration-200 ${rowClass}`}>
                    {/* Rank with styled medals */}
                    <td className="px-5 py-4">
                      {entry.rank === 1 && (
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-accent via-accent/80 to-accent/60 text-accent-foreground font-bold text-lg shadow-md">
                          1
                        </div>
                      )}
                      {entry.rank === 2 && (
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-muted-foreground/30 via-muted-foreground/20 to-muted-foreground/10 text-foreground font-bold text-lg shadow-sm">
                          2
                        </div>
                      )}
                      {entry.rank === 3 && (
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 via-primary/30 to-primary/20 text-primary font-bold text-lg shadow-sm">
                          3
                        </div>
                      )}
                      {entry.rank > 3 && (
                        <span className="text-muted-foreground font-semibold text-base">#{entry.rank}</span>
                      )}
                    </td>

                    {/* Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isTopThree || isCurrentUser ? 'text-foreground' : ''}`}>
                          {entry.name}
                        </span>
                        {isCurrentUser && (
                          <span className="text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-full font-bold">
                            {t('common.you', 'You')}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Points */}
                    <td className="px-5 py-4 text-right">
                      <UserPointsBadge
                        points={entry.points}
                        rank={entry.rank}
                        showRank={false}
                        variant="sm"
                        showBadge={false}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {total > USERS_PER_PAGE && (
        <div className="flex items-center justify-between gap-4 pt-6 border-t">
          <div className="text-sm text-muted-foreground">
            {t('posts.pageInfo', 'Showing {{start}}-{{end}} of {{total}}', {
              start: offset + 1,
              end: Math.min(offset + USERS_PER_PAGE, total),
              total,
            })}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePreviousPage}
              disabled={!hasPreviousPage || loading}
            >
              {t('posts.previous', 'Previous')}
            </Button>
            <Button
              onClick={handleNextPage}
              disabled={!hasNextPage || loading}
            >
              {t('posts.next', 'Next')}
            </Button>
          </div>
        </div>
      )}

      {/* Points Info Dialog */}
      <PointsInfoDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

export default LeaderboardPage;
