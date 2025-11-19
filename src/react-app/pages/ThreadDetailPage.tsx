import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MessageCircle, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { forumService } from '../services/forumService';
import { ForumThreadWithAuthor, ForumReplyWithAuthor } from '../../types/forum';
import { formatPostTime } from '../utils/timeUtils';
import ReplyThread from '../components/ReplyThread';
import ReplyForm from '../components/ReplyForm';
import { HtmlRenderer } from '../components/HtmlRenderer';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

interface ThreadState {
  thread: ForumThreadWithAuthor | null;
  replies: ForumReplyWithAuthor[];
  total: number;
}

export default function ThreadDetailPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [data, setData] = useState<ThreadState>({
    thread: null,
    replies: [],
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!threadId) return;

      try {
        setLoading(true);
        setError(null);

        // Load thread
        const thread = await forumService.getThread(threadId);
        setData(prev => ({ ...prev, thread }));

        // Load replies
        const repliesData = await forumService.getReplies(threadId, 50, 0);
        setData(prev => ({
          ...prev,
          replies: repliesData.replies,
          total: repliesData.total,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : t('errors.unexpectedError');
        setError(message);
        console.error('Error loading thread:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [threadId, t]);

  if (loading) {
    return (
      <div className="px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-8">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{t('errors.oopsError')}: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data.thread) {
    return (
      <div className="px-4 py-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{t('forums.categoryNotFound')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const thread = data.thread;
  const createdTime = formatPostTime(thread.created_at);

  // Flat replies list (no nesting)
  const flatReplies = data.replies;

  return (
    <div className="px-4 py-4 space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(`/forums/category/${thread.category_id}`)}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('common.back')}
      </Button>

      {/* Thread Content Card - styled like a reply */}
      <Card className="bg-muted/30 border-muted-foreground/20">
        <div className="p-4 space-y-3">
          {/* Thread Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{thread.author_name}</p>
              <p className="text-xs text-muted-foreground">{createdTime}</p>
            </div>
            {thread.status !== 'open' && (
              <Badge variant="outline" className="flex-shrink-0">
                {thread.status.charAt(0).toUpperCase() + thread.status.slice(1)}
              </Badge>
            )}
          </div>

          {/* Thread Title */}
          <h1 className="text-lg font-bold">{thread.title}</h1>

          {/* Thread Content */}
          <div className="text-sm text-foreground break-words">
            <HtmlRenderer
              content={thread.content}
              className="text-sm"
            />
          </div>

          {/* Engagement Metrics */}
          {(thread.upvote_count > 0 || thread.downvote_count > 0) && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
              {thread.upvote_count > 0 && (
                <div className="flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" />
                  <span>{thread.upvote_count}</span>
                </div>
              )}
              {thread.downvote_count > 0 && (
                <div className="flex items-center gap-1">
                  <ThumbsDown className="w-3 h-3" />
                  <span>{thread.downvote_count}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Replies List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          {t('forums.replies', 'Replies')} ({data.total})
        </h2>
        {flatReplies.length > 0 ? (
          <div className="space-y-4">
            {flatReplies.map(reply => (
              <ReplyThread key={reply.id} reply={reply} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t('forums.noRepliesYet', 'No replies yet. Be the first to reply!')}</p>
          </div>
        )}
      </div>

      {/* Reply Form Section */}
      <Card className="bg-muted/30 border-muted-foreground/20">
        <div className="p-4 space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            {t('forums.addReply', 'Add Your Reply')}
          </h3>
          <ReplyForm
            threadId={threadId || ''}
            onReplyCreated={(newReply) => {
              setData(prev => ({
                ...prev,
                replies: [...prev.replies, newReply],
                total: prev.total + 1,
              }));
            }}
          />
        </div>
      </Card>
    </div>
  );
}
