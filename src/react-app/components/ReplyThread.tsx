import { memo } from 'react';
import { ForumReplyWithAuthor } from '../../types/forum';
import { formatPostTime } from '../../types/post';

interface ReplyThreadProps {
  reply: ForumReplyWithAuthor;
  replies: ForumReplyWithAuthor[];
  replyTree: Map<string | null, ForumReplyWithAuthor[]>;
  depth?: number;
}

const ReplyThread = memo(function ReplyThread({
  reply,
  replies,
  replyTree,
  depth = 0,
}: ReplyThreadProps) {
  const childReplies = replyTree.get(reply.id) || [];
  const timeAgo = formatPostTime(reply.created_at);
  const maxDepth = 3;
  const canNest = depth < maxDepth;

  const paddingLeft = Math.min(depth * 32, 96); // Max 96px indentation

  return (
    <div style={{ marginLeft: `${paddingLeft}px` }} className="mb-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        {/* Reply Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {reply.author_name}
            </p>
            <p className="text-xs text-gray-500">{timeAgo}</p>
          </div>

          {reply.is_solution && (
            <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded text-xs font-medium text-green-700">
              <span>✓</span>
              <span>Solution</span>
            </div>
          )}
        </div>

        {/* Reply Content */}
        <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{reply.content}</p>

        {/* Reply Metrics */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span>👍</span>
            <span>{reply.upvote_count}</span>
          </div>
          {reply.downvote_count > 0 && (
            <div className="flex items-center gap-1">
              <span>👎</span>
              <span>{reply.downvote_count}</span>
            </div>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {canNest && childReplies.length > 0 && (
        <div className="mt-2">
          {childReplies.map(childReply => (
            <ReplyThread
              key={childReply.id}
              reply={childReply}
              replies={replies}
              replyTree={replyTree}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {/* Overflow indicator */}
      {!canNest && childReplies.length > 0 && (
        <div style={{ marginLeft: `${32}px` }} className="mt-2 text-xs text-gray-500 italic">
          {childReplies.length} nested replies (max depth reached)
        </div>
      )}
    </div>
  );
});

export default ReplyThread;
