import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ForumThreadWithAuthor } from '../../types/forum';
import { formatPostTime } from '../../types/post';

interface ThreadCardProps {
  thread: ForumThreadWithAuthor;
}

const ThreadCard = memo(function ThreadCard({ thread }: ThreadCardProps) {
  const isPinned = thread.is_pinned ? true : false;
  const timeAgo = formatPostTime(thread.created_at);
  const lastActivityTime = formatPostTime(thread.last_activity_at);

  const statusBadgeColor = {
    open: 'bg-blue-100 text-blue-800',
    solved: 'bg-green-100 text-green-800',
    closed: 'bg-red-100 text-red-800',
  }[thread.status];

  return (
    <Link
      to={`/forums/threads/${thread.id}`}
      className="block border rounded-lg p-4 hover:shadow-md transition-shadow hover:bg-gray-50"
    >
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {isPinned && <span className="text-lg">📌</span>}
            <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600">
              {thread.title}
            </h3>
            {thread.status !== 'open' && (
              <span className={`text-xs font-medium px-2 py-1 rounded ${statusBadgeColor}`}>
                {thread.status.charAt(0).toUpperCase() + thread.status.slice(1)}
              </span>
            )}
          </div>

          <p className="text-sm text-gray-600 mb-2">
            By <span className="font-medium">{thread.author_name}</span> • {timeAgo}
          </p>

          <p className="text-sm text-gray-700 line-clamp-2 mb-3">{thread.content}</p>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <span>👁️</span>
              <span>{thread.view_count.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>💬</span>
              <span>{thread.reply_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>👍</span>
              <span>{thread.upvote_count}</span>
            </div>
            {thread.downvote_count > 0 && (
              <div className="flex items-center gap-1">
                <span>👎</span>
                <span>{thread.downvote_count}</span>
              </div>
            )}
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="text-sm text-gray-500">Last activity</div>
          <div className="text-xs text-gray-600">{lastActivityTime}</div>
        </div>
      </div>
    </Link>
  );
});

export default ThreadCard;
