import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { RichTextEditor } from './RichTextEditor';
import { forumService } from '../services/forumService';
import { ForumReplyWithAuthor } from '../../types/forum';
import { Card } from './ui/card';
import { Button } from './ui/button';

interface ReplyFormProps {
  threadId: string;
  onReplyCreated: (reply: ForumReplyWithAuthor) => void;
  parentReplyId?: string;
  onCancel?: () => void;
}

export default function ReplyForm({
  threadId,
  onReplyCreated,
  parentReplyId,
  onCancel,
}: ReplyFormProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError(t('forums.loginRequired', 'You must be logged in to reply'));
      return;
    }

    if (!content.trim()) {
      setError(t('forums.emptyReplyError', 'Reply content cannot be empty'));
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const newReply = await forumService.createReply(threadId, {
        content: content.trim(),
        parent_reply_id: parentReplyId,
      });

      onReplyCreated(newReply);
      setContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unexpectedError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <div className="p-4">
          <p className="text-sm text-muted-foreground">
            {t('forums.signInToReply', 'Please')} <a href="/login" className="font-semibold text-primary hover:underline">{t('common.signIn', 'sign in')}</a> {t('forums.toReply', 'to reply')}.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-card">
      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded text-sm">
            {error}
          </div>
        )}

        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder={parentReplyId ? t('forums.replyToComment', 'Reply to this comment...') : t('forums.writeReply', 'Write your reply...')}
          disabled={submitting}
          minHeight="120px"
        />

        <div className="flex justify-end gap-2 pt-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
            >
              {t('common.cancel')}
            </Button>
          )}
          <Button
            type="submit"
            disabled={submitting || !content.trim()}
          >
            {submitting ? t('forums.posting', 'Posting...') : t('forums.postReply', 'Post Reply')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
