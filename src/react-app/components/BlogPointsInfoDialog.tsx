import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface BlogPointsInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * BlogPointsInfoDialog Component
 * Modal dialog for displaying blog-specific point awarding rules
 * Features:
 * - Explains point values for creating blogs
 * - Shows engagement rewards (likes and comments)
 * - Details anti-spam diminishing returns system for blogs
 * - Fully internationalized (English and Chinese)
 */
export function BlogPointsInfoDialog({ open, onOpenChange }: BlogPointsInfoDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('points.blogRulesDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('points.blogRulesDialog.intro')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Creating Content Section */}
          <section className="space-y-3">
            <h3 className="font-semibold text-base">
              {t('points.blogRulesDialog.creatingContent')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('points.blogRulesDialog.creatingContentDesc')}
            </p>
            <div className="space-y-2 ml-4">
              <div className="flex justify-between text-sm">
                <span>{t('points.blogRulesDialog.blogPost')}</span>
                <span className="font-medium text-blue-600">
                  {t('points.blogRulesDialog.blogPostPoints')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('points.blogRulesDialog.blogFeatured')}</span>
                <span className="font-medium text-purple-600">
                  {t('points.blogRulesDialog.blogFeaturedPoints')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('points.commonRules.comment')}</span>
                <span className="font-medium text-blue-600">
                  {t('points.commonRules.commentPoints')}
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
              {t('points.commonRules.receivingEngagementDesc')}
            </p>
            <div className="space-y-2 ml-4">
              <div className="flex justify-between text-sm">
                <span>{t('points.blogRulesDialog.likeReceived')}</span>
                <span className="font-medium text-green-600">
                  {t('points.commonRules.likeReceivedPoints')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('points.commonRules.commentReceived')}</span>
                <span className="font-medium text-green-600">
                  {t('points.commonRules.commentReceivedPoints')}
                </span>
              </div>
            </div>

            {/* Important Note */}
            <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800 border border-amber-200">
              <p className="font-semibold mb-1">{t('points.commonRules.important')}</p>
              <p>{t('points.blogRulesDialog.noPointsForLiking')}</p>
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

            {/* Blogs Per Hour */}
            <div className="ml-4 space-y-2">
              <p className="text-sm font-medium">
                {t('points.blogRulesDialog.blogsPerHour')}
              </p>
              <div className="space-y-1 text-sm ml-2">
                <div className="flex justify-between">
                  <span>{t('points.blogRulesDialog.first2Blogs')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('points.blogRulesDialog.next2Blogs')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('points.blogRulesDialog.beyond4Blogs')}</span>
                </div>
              </div>
            </div>

            {/* Likes Per Hour */}
            <div className="ml-4 space-y-2">
              <p className="text-sm font-medium">
                {t('points.commonRules.likesPerHour')}
              </p>
              <div className="space-y-1 text-sm ml-2">
                <div className="flex justify-between">
                  <span>{t('points.commonRules.first5Likes')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('points.commonRules.next10Likes')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('points.commonRules.beyond15Likes')}</span>
                </div>
              </div>
            </div>

            {/* Comments Per Hour */}
            <div className="ml-4 space-y-2">
              <p className="text-sm font-medium">
                {t('points.commonRules.commentsPerHour')}
              </p>
              <div className="space-y-1 text-sm ml-2">
                <div className="flex justify-between">
                  <span>{t('points.commonRules.first10Comments')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('points.commonRules.next10Comments')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('points.commonRules.beyond20Comments')}</span>
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
