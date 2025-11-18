import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { forumService } from '../services/forumService';
import { ForumReplyWithAuthor } from '../../types/forum';

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
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('You must be logged in to reply');
      return;
    }

    if (!content.trim()) {
      setError('Reply content cannot be empty');
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
      setError(err instanceof Error ? err.message : 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800">
          Please <a href="/login" className="font-semibold hover:underline">sign in</a> to reply.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-4">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={parentReplyId ? 'Reply to this comment...' : 'Write your reply...'}
        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        rows={4}
        disabled={submitting}
      />

      <div className="mt-3 flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Posting...' : 'Post Reply'}
        </button>
      </div>
    </form>
  );
}
