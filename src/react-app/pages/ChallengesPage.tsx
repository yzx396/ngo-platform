import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Trophy, Plus, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChallengeCard } from '../components/ChallengeCard';
import { useAuth } from '../context/AuthContext';
import { getChallenges } from '../services/challengeService';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ChallengePointsInfoDialog } from '../components/ChallengePointsInfoDialog';
import type { Challenge } from '../../types/challenge';

export function ChallengesPage() {
  const { t } = useTranslation();
  const { role } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');
  const [pointsInfoDialogOpen, setPointsInfoDialogOpen] = useState(false);

  const loadChallenges = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const statusFilter = filter === 'all' ? undefined : filter;
      const data = await getChallenges(statusFilter);
      setChallenges(data);
    } catch {
      setError(t('challenges.loadError', 'Failed to load challenges'));
    } finally {
      setLoading(false);
    }
  }, [filter, t]);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  const activeChallenges = challenges.filter((c) => c.status === 'active');
  const completedChallenges = challenges.filter((c) => c.status === 'completed');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-600" />
            <h1 className="text-3xl font-bold">{t('challenges.title', 'Challenges')}</h1>
          </div>
          <p className="text-muted-foreground">
            {t(
              'challenges.subtitle',
              'Complete challenges to earn points and showcase your achievements'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPointsInfoDialogOpen(true)}
            className="mt-1"
            title={t('points.howToEarn', 'How to Earn Points')}
            aria-label={t('points.howToEarn', 'How to Earn Points')}
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            {t('points.howToEarn', 'How to Earn Points')}
          </Button>
          {role === 'admin' && (
            <Link to="/admin/challenges">
              <Button className="mt-1">
                <Plus className="w-4 h-4 mr-2" />
                {t('challenges.create', 'Create Challenge')}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(value: string) => setFilter(value as 'active' | 'completed' | 'all')}>
        <TabsList>
          <TabsTrigger value="active">
            {t('challenges.tabs.active', 'Active')} ({activeChallenges.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            {t('challenges.tabs.completed', 'Completed')} ({completedChallenges.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            {t('challenges.tabs.all', 'All')} ({challenges.length})
          </TabsTrigger>
        </TabsList>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Active Challenges Tab */}
        <TabsContent value="active" className="mt-6">
          {!loading && !error && activeChallenges.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {t('challenges.noActiveChallenges', 'No active challenges at the moment')}
              </p>
              {role === 'admin' && (
                <Link to="/admin/challenges">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('challenges.createFirst', 'Create the first challenge')}
                  </Button>
                </Link>
              )}
            </div>
          )}

          {!loading && !error && activeChallenges.length > 0 && (
            <div className="space-y-4">
              {activeChallenges.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Completed Challenges Tab */}
        <TabsContent value="completed" className="mt-6">
          {!loading && !error && completedChallenges.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {t('challenges.noCompletedChallenges', 'No completed challenges yet')}
              </p>
            </div>
          )}

          {!loading && !error && completedChallenges.length > 0 && (
            <div className="space-y-4">
              {completedChallenges.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* All Challenges Tab */}
        <TabsContent value="all" className="mt-6">
          {!loading && !error && challenges.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {t('challenges.noChallenges', 'No challenges yet')}
              </p>
              {role === 'admin' && (
                <Link to="/admin/challenges">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('challenges.createFirst', 'Create the first challenge')}
                  </Button>
                </Link>
              )}
            </div>
          )}

          {!loading && !error && challenges.length > 0 && (
            <div className="space-y-4">
              {challenges.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Challenge Points Info Dialog */}
      <ChallengePointsInfoDialog
        open={pointsInfoDialogOpen}
        onOpenChange={setPointsInfoDialogOpen}
      />
    </div>
  );
}
