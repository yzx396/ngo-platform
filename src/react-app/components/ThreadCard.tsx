import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ForumThreadWithAuthor } from '../../types/forum';
import { formatPostTime } from '../../types/post';

interface ThreadCardProps {
  thread: ForumThreadWithAuthor;
}

/**
 * ThreadCard Component
 * Displays a forum thread in a card format
 * Styling matches EventCard from EventsPage
 */
const ThreadCard = memo(function ThreadCard({ thread }: ThreadCardProps) {
  const { t } = useTranslation();
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
      className="block rounded-lg border overflow-hidden transition-all hover:shadow-md hover:border-primary/50"
    >
      <div className="p-6 flex flex-col md:flex-row gap-4">
        {/* Main Content */}
        <div className="flex-1 space-y-3">
          {/* Title and Badges */}
          <div className="flex flex-wrap items-start gap-2">
            {isPinned && <span className="text-lg">📌</span>}
            <h3 className="text-lg font-semibold text-gray-900 hover:text-primary transition-colors flex-1">
              {thread.title}
            </h3>
            {thread.status !== 'open' && (
              <span className={`text-xs font-medium px-2 py-1 rounded ${statusBadgeColor}`}>
                {thread.status.charAt(0).toUpperCase() + thread.status.slice(1)}
              </span>
            )}
          </div>

          {/* Author and Time */}
          <div className="text-sm text-muted-foreground">
            By <span className="font-medium">{thread.author_name}</span> • {timeAgo}
          </div>

          {/* Content Preview */}
          <p className="text-sm text-gray-700 line-clamp-2">
            {thread.content}
          </p>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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

        {/* Right Side: Last Activity */}
        <div className="flex-shrink-0 text-right md:w-32">
          <div className="text-xs text-muted-foreground mb-1">
            {t('forums.lastActivity')}
          </div>
          <div className="text-xs text-gray-600">
            {lastActivityTime}
          </div>
        </div>
      </div>
    </Link>
  );
});

export default ThreadCard;
