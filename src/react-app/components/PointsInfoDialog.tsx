import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface PointsInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * PointsInfoDialog Component
 * Modal dialog for displaying point awarding rules
 * Features:
 * - Explains point values for creating content
 * - Shows engagement rewards (likes and comments)
 * - Details anti-spam diminishing returns system
 * - Fully internationalized (English and Chinese)
 */
export function PointsInfoDialog({ open, onOpenChange }: PointsInfoDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('points.rulesDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('points.rulesDialog.intro')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Creating Content Section */}
          <section className="space-y-3">
            <h3 className="font-semibold text-base">
              {t('points.rulesDialog.creatingContent')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('points.rulesDialog.creatingContentDesc')}
            </p>
            <div className="space-y-2 ml-4">
              <div className="flex justify-between text-sm">
                <span>{t('points.rulesDialog.discussionPost')}</span>
                <span className="font-medium text-blue-600">
                  {t('points.rulesDialog.discussionPostPoints')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('points.rulesDialog.generalPost')}</span>
                <span className="font-medium text-blue-600">
                  {t('points.rulesDialog.generalPostPoints')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('points.rulesDialog.announcementPost')}</span>
                <span className="font-medium text-gray-500">
                  {t('points.rulesDialog.announcementPostPoints')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('points.rulesDialog.comment')}</span>
                <span className="font-medium text-blue-600">
                  {t('points.rulesDialog.commentPoints')}
                </span>
              </div>
            </div>
          </section>

          {/* Receiving Engagement Section */}
          <section className="space-y-3">
            <h3 className="font-semibold text-base">
              {t('points.rulesDialog.receivingEngagement')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('points.rulesDialog.receivingEngagementDesc')}
            </p>
            <div className="space-y-2 ml-4">
              <div className="flex justify-between text-sm">
                <span>{t('points.rulesDialog.likeReceived')}</span>
                <span className="font-medium text-green-600">
                  {t('points.rulesDialog.likeReceivedPoints')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('points.rulesDialog.commentReceived')}</span>
                <span className="font-medium text-green-600">
                  {t('points.rulesDialog.commentReceivedPoints')}
                </span>
              </div>
            </div>

            {/* Important Note */}
            <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800 border border-amber-200">
              <p className="font-semibold mb-1">{t('points.rulesDialog.important')}</p>
              <p>{t('points.rulesDialog.noPointsForLiking')}</p>
            </div>
          </section>

          {/* Anti-Spam System Section */}
          <section className="space-y-3">
            <h3 className="font-semibold text-base">
              {t('points.rulesDialog.antiSpam')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('points.rulesDialog.antiSpamDesc')}
            </p>

            {/* Likes Per Hour */}
            <div className="ml-4 space-y-2">
              <p className="text-sm font-medium">
                {t('points.rulesDialog.likesPerHour')}
              </p>
              <div className="space-y-1 text-sm ml-2">
                <div className="flex justify-between">
                  <span>{t('points.rulesDialog.first5Likes')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('points.rulesDialog.next10Likes')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('points.rulesDialog.beyond15Likes')}</span>
                </div>
              </div>
            </div>

            {/* Comments Per Hour */}
            <div className="ml-4 space-y-2">
              <p className="text-sm font-medium">
                {t('points.rulesDialog.commentsPerHour')}
              </p>
              <div className="space-y-1 text-sm ml-2">
                <div className="flex justify-between">
                  <span>{t('points.rulesDialog.first10Comments')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('points.rulesDialog.next10Comments')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('points.rulesDialog.beyond20Comments')}</span>
                </div>
              </div>
            </div>

            {/* Posts Per Hour */}
            <div className="ml-4 space-y-2">
              <p className="text-sm font-medium">
                {t('points.rulesDialog.postsPerHour')}
              </p>
              <div className="space-y-1 text-sm ml-2">
                <div className="flex justify-between">
                  <span>{t('points.rulesDialog.first3Posts')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('points.rulesDialog.next2Posts')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('points.rulesDialog.beyond5Posts')}</span>
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
