import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, Calendar, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import type { Challenge } from '../../types/challenge';
import { ChallengeStatus } from '../../types/challenge';

interface ChallengeCardProps {
  challenge: Challenge;
}

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  const { t } = useTranslation();

  const isActive = challenge.status === ChallengeStatus.Active;
  const deadline = useMemo(() => new Date(challenge.deadline), [challenge.deadline]);
  const { isExpired, daysUntilDeadline } = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const expired = deadline < new Date(now);
    const days = Math.ceil((deadline.getTime() - now) / (1000 * 60 * 60 * 24));
    return { isExpired: expired, daysUntilDeadline: days };
  }, [deadline]);

  return (
    <Link to={`/challenges/${challenge.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-xl">{challenge.title}</CardTitle>
                <Badge variant={isActive && !isExpired ? 'default' : 'secondary'}>
                  {isActive && !isExpired
                    ? t('challenges.status.active', 'Active')
                    : t('challenges.status.completed', 'Completed')}
                </Badge>
              </div>
              <CardDescription className="line-clamp-2">
                {challenge.description}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 text-amber-600">
              <Trophy className="w-5 h-5" />
              <span className="text-lg font-bold">{challenge.point_reward}</span>
              <span className="text-sm">{t('common.points', 'pts')}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            {/* Participants */}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>
                {challenge.participant_count || 0} {t('challenges.participants', 'participants')}
              </span>
            </div>

            {/* Deadline */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{deadline.toLocaleDateString()}</span>
            </div>

            {/* Time remaining (if active and not expired) */}
            {isActive && !isExpired && daysUntilDeadline > 0 && (
              <div className="flex items-center gap-2 text-orange-600">
                <Clock className="w-4 h-4" />
                <span>
                  {daysUntilDeadline === 1
                    ? t('challenges.lastDay', '1 day left')
                    : t('challenges.daysLeft', `${daysUntilDeadline} days left`, {
                        count: daysUntilDeadline,
                      })}
                </span>
              </div>
            )}

            {/* Expired */}
            {isActive && isExpired && (
              <div className="flex items-center gap-2 text-red-600">
                <Clock className="w-4 h-4" />
                <span>{t('challenges.expired', 'Expired')}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
