import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface ChallengePointsInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * ChallengePointsInfoDialog Component
 * Modal dialog for displaying challenge-specific point awarding rules
 * Features:
 * - Explains point values for joining challenges and submitting
 * - Shows variable rewards for approved submissions
 * - Details anti-abuse limits for challenges
 * - Fully internationalized (English and Chinese)
 */
export function ChallengePointsInfoDialog({ open, onOpenChange }: ChallengePointsInfoDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('points.challengeRulesDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('points.challengeRulesDialog.intro')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Participation Section */}
          <section className="space-y-3">
            <h3 className="font-semibold text-base">
              {t('points.challengeRulesDialog.participation')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('points.challengeRulesDialog.participationDesc')}
            </p>
            <div className="space-y-2 ml-4">
              <div className="flex justify-between text-sm">
                <span>{t('points.challengeRulesDialog.joinChallenge')}</span>
                <span className="font-medium text-blue-600">
                  {t('points.challengeRulesDialog.joinChallengePoints')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('points.challengeRulesDialog.submitCompletion')}</span>
                <span className="font-medium text-blue-600">
                  {t('points.challengeRulesDialog.submitCompletionPoints')}
                </span>
              </div>
            </div>
          </section>

          {/* Challenge Rewards Section */}
          <section className="space-y-3">
            <h3 className="font-semibold text-base">
              {t('points.challengeRulesDialog.rewards')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('points.challengeRulesDialog.rewardsDesc')}
            </p>
            <div className="space-y-2 ml-4">
              <div className="flex justify-between text-sm">
                <span>{t('points.challengeRulesDialog.approvedSubmission')}</span>
                <span className="font-medium text-green-600">
                  {t('points.challengeRulesDialog.approvedSubmissionPoints')}
                </span>
              </div>
            </div>
          </section>

          {/* Anti-Abuse Limits Section */}
          <section className="space-y-3">
            <h3 className="font-semibold text-base">
              {t('points.commonRules.antiSpam')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('points.challengeRulesDialog.antiSpamDesc')}
            </p>

            {/* Joins Per Hour */}
            <div className="ml-4 space-y-2">
              <p className="text-sm font-medium">
                {t('points.challengeRulesDialog.joinsPerHour')}
              </p>
              <div className="space-y-1 text-sm ml-2">
                <div className="flex justify-between">
                  <span>{t('points.challengeRulesDialog.first5Joins')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('points.challengeRulesDialog.beyond5Joins')}</span>
                </div>
              </div>
            </div>

            {/* Submissions Per Hour */}
            <div className="ml-4 space-y-2">
              <p className="text-sm font-medium">
                {t('points.challengeRulesDialog.submissionsPerHour')}
              </p>
              <div className="space-y-1 text-sm ml-2">
                <div className="flex justify-between">
                  <span>{t('points.challengeRulesDialog.first3Submissions')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('points.challengeRulesDialog.beyond3Submissions')}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Close Button */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('common.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
