import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, ThumbsDown, CheckCircle2 } from 'lucide-react';
import { ForumReplyWithAuthor } from '../../types/forum';
import { formatPostTime } from '../utils/timeUtils';
import { HtmlRenderer } from './HtmlRenderer';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface ReplyThreadProps {
  reply: ForumReplyWithAuthor;
}

const ReplyThread = memo(function ReplyThread({
  reply,
}: ReplyThreadProps) {
  const { t } = useTranslation();
  const timeAgo = formatPostTime(reply.created_at);

  return (
    <Card className="bg-muted/30 border-muted-foreground/20">
      <div className="p-4 space-y-3">
        {/* Reply Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium">{reply.author_name}</p>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>

          {reply.is_solution && (
            <Badge variant="secondary" className="flex items-center gap-1 flex-shrink-0">
              <CheckCircle2 className="w-3 h-3" />
              <span>{t('forums.solution', 'Solution')}</span>
            </Badge>
          )}
        </div>

        {/* Reply Content */}
        <div className="text-sm text-foreground">
          <HtmlRenderer
            content={reply.content}
            className="prose prose-sm max-w-none"
          />
        </div>

        {/* Reply Metrics */}
        {(reply.upvote_count > 0 || reply.downvote_count > 0) && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
            {reply.upvote_count > 0 && (
              <div className="flex items-center gap-1">
                <ThumbsUp className="w-3 h-3" />
                <span>{reply.upvote_count}</span>
              </div>
            )}
            {reply.downvote_count > 0 && (
              <div className="flex items-center gap-1">
                <ThumbsDown className="w-3 h-3" />
                <span>{reply.downvote_count}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
});

export default ReplyThread;
