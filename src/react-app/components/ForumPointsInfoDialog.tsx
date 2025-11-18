import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface ForumPointsInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * ForumPointsInfoDialog Component
 * Modal dialog for displaying forum-specific point awarding rules
 * Features:
 * - Explains point values for creating threads and replies
 * - Shows engagement rewards (upvotes received on threads and replies)
 * - Details anti-spam diminishing returns system for forums
 * - Fully internationalized (English and Chinese)
 */
export function ForumPointsInfoDialog({ open, onOpenChange }: ForumPointsInfoDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('points.forumRulesDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('points.forumRulesDialog.intro')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Creating Content Section */}
          <section className="space-y-3">
            <h3 className="font-semibold text-base">
              {t('points.forumRulesDialog.creatingContent')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('points.forumRulesDialog.creatingContentDesc')}
            </p>
            <div className="space-y-2 ml-4">
              <div className="flex justify-between text-sm">
                <span>{t('points.forumRulesDialog.thread')}</span>
                <span className="font-medium text-blue-600">
                  {t('points.forumRulesDialog.threadPoints')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('points.forumRulesDialog.reply')}</span>
                <span className="font-medium text-blue-600">
                  {t('points.forumRulesDialog.replyPoints')}
                </span>
              </div>
            </div>
          </section>

          {/* Receiving Engagement Section */}
          <section className="space-y-3">
            <h3 className="font-semibold text-base">
              {t('points.commonRules.receivingEngagement')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('points.forumRulesDialog.receivingEngagementDesc')}
            </p>
            <div className="space-y-2 ml-4">
              <div className="flex justify-between text-sm">
                <span>{t('points.forumRulesDialog.upvoteReceivedThread')}</span>
                <span className="font-medium text-green-600">
                  {t('points.forumRulesDialog.upvoteReceivedThreadPoints')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('points.forumRulesDialog.upvoteReceivedReply')}</span>
                <span className="font-medium text-green-600">
                  {t('points.forumRulesDialog.upvoteReceivedReplyPoints')}
                </span>
              </div>
            </div>

            {/* Important Note */}
            <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800 border border-amber-200">
              <p className="font-semibold mb-1">{t('points.commonRules.important')}</p>
              <p>{t('points.forumRulesDialog.noPointsForUpvoting')}</p>
            </div>
          </section>

          {/* Anti-Spam System Section */}
          <section className="space-y-3">
            <h3 className="font-semibold text-base">
              {t('points.commonRules.antiSpam')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('points.commonRules.antiSpamDesc')}
            </p>

            {/* Threads Per Hour */}
            <div className="ml-4 space-y-2">
              <p className="text-sm font-medium">
                {t('points.forumRulesDialog.threadsPerHour')}
              </p>
              <div className="space-y-1 text-sm ml-2">
                <div className="flex justify-between">
                  <span>{t('points.forumRulesDialog.first3Threads')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('points.forumRulesDialog.next2Threads')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('points.forumRulesDialog.beyond5Threads')}</span>
                </div>
              </div>
            </div>

            {/* Replies Per Hour */}
            <div className="ml-4 space-y-2">
              <p className="text-sm font-medium">
                {t('points.forumRulesDialog.repliesPerHour')}
              </p>
              <div className="space-y-1 text-sm ml-2">
                <div className="flex justify-between">
                  <span>{t('points.forumRulesDialog.first10Replies')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('points.forumRulesDialog.next10Replies')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('points.forumRulesDialog.beyond20Replies')}</span>
                </div>
              </div>
            </div>

            {/* Upvotes Received Per Hour */}
            <div className="ml-4 space-y-2">
              <p className="text-sm font-medium">
                {t('points.forumRulesDialog.upvotesPerHour')}
              </p>
              <div className="space-y-1 text-sm ml-2">
                <div className="flex justify-between">
                  <span>{t('points.forumRulesDialog.first5Upvotes')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('points.forumRulesDialog.next10Upvotes')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('points.forumRulesDialog.beyond15Upvotes')}</span>
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
