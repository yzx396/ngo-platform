import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { forumService } from '../services/forumService';
import { ForumThreadWithAuthor, ForumReplyWithAuthor } from '../../types/forum';
import { formatPostTime } from '../../types/post';
import ReplyThread from '../components/ReplyThread';
import ReplyForm from '../components/ReplyForm';
import { getThreadStatusColor } from '../../types/forum';

interface ThreadState {
  thread: ForumThreadWithAuthor | null;
  replies: ForumReplyWithAuthor[];
  total: number;
}

export default function ThreadDetailPage() {
  const { threadId } = useParams<{ threadId: string }>();

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
        const message = err instanceof Error ? err.message : 'Failed to load thread';
        setError(message);
        console.error('Error loading thread:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [threadId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading thread...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!data.thread) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Thread not found</p>
        </div>
      </div>
    );
  }

  const thread = data.thread;
  const statusBadgeColor = getThreadStatusColor(thread.status);
  const createdTime = formatPostTime(thread.created_at);

  // Build nested replies structure
  const buildReplyTree = (replies: ForumReplyWithAuthor[]): Map<string | null, ForumReplyWithAuthor[]> => {
    const tree = new Map<string | null, ForumReplyWithAuthor[]>();

    for (const reply of replies) {
      const parentId = reply.parent_reply_id;
      if (!tree.has(parentId)) {
        tree.set(parentId, []);
      }
      tree.get(parentId)!.push(reply);
    }

    return tree;
  };

  const replyTree = buildReplyTree(data.replies);
  const rootReplies = replyTree.get(null) || [];

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <Link to={`/forums/category/${thread.category_id}`} className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block">
          ← Back to Category
        </Link>

        <div className="mb-4">
          <div className="flex items-start gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{thread.title}</h1>
            {thread.status !== 'open' && (
              <span className={`text-xs font-medium px-2 py-1 rounded whitespace-nowrap mt-1 ${statusBadgeColor}`}>
                {thread.status.charAt(0).toUpperCase() + thread.status.slice(1)}
              </span>
            )}
          </div>

          <p className="text-sm text-gray-600">
            By <span className="font-medium">{thread.author_name}</span> • {createdTime}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <p className="text-gray-800 whitespace-pre-wrap">{thread.content}</p>
        </div>

        {/* Engagement Metrics */}
        <div className="flex items-center gap-6 text-sm text-gray-600 border-t border-b border-gray-200 py-4">
          <div className="flex items-center gap-1">
            <span>👁️</span>
            <span>{thread.view_count.toLocaleString()} views</span>
          </div>
          <div className="flex items-center gap-1">
            <span>💬</span>
            <span>{thread.reply_count} replies</span>
          </div>
          <div className="flex items-center gap-1">
            <span>👍</span>
            <span>{thread.upvote_count} upvotes</span>
          </div>
          {thread.downvote_count > 0 && (
            <div className="flex items-center gap-1">
              <span>👎</span>
              <span>{thread.downvote_count} downvotes</span>
            </div>
          )}
        </div>
      </div>

      {/* Replies Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-6">
          Replies <span className="text-gray-500 text-lg">({data.total + 1})</span>
        </h2>

        {/* Reply Form */}
        <div className="mb-6">
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

        {data.replies.length > 0 ? (
          <div className="space-y-4">
            {rootReplies.map(reply => (
              <ReplyThread
                key={reply.id}
                reply={reply}
                replies={data.replies}
                replyTree={replyTree}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No replies yet. Be the first to reply!</p>
          </div>
        )}
      </div>
    </div>
  );
}
