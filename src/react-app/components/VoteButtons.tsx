/**
 * VoteButtons Component
 * Displays upvote/downvote buttons with current vote counts
 * Handles vote toggling and updates
 */

import { useState, useEffect } from 'react';
import { forumService } from '../services/forumService';
import { useAuth } from '../context/AuthContext';

interface VoteButtonsProps {
  votableType: 'thread' | 'reply';
  votableId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function VoteButtons({
  votableType,
  votableId,
  initialUpvotes,
  initialDownvotes,
  size = 'md',
}: VoteButtonsProps) {
  const { user } = useAuth();
  const [upvoteCount, setUpvoteCount] = useState(initialUpvotes);
  const [downvoteCount, setDownvoteCount] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(null);
  const [loading, setLoading] = useState(false);

  // Load user's current vote
  useEffect(() => {
    if (!user) return;

    const loadUserVote = async () => {
      try {
        const result =
          votableType === 'thread'
            ? await forumService.getThreadVote(votableId)
            : await forumService.getReplyVote(votableId);
        setUserVote((result.user_vote as 'upvote' | 'downvote' | null) || null);
      } catch (err) {
        console.error('Error loading user vote:', err);
      }
    };

    loadUserVote();
  }, [user, votableType, votableId]);

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (!user) {
      alert('Please log in to vote');
      return;
    }

    if (loading) return;

    try {
      setLoading(true);

      const result =
        votableType === 'thread'
          ? await forumService.voteOnThread(votableId, voteType)
          : await forumService.voteOnReply(votableId, voteType);

      setUpvoteCount(result.upvote_count);
      setDownvoteCount(result.downvote_count);
      setUserVote((result.user_vote as 'upvote' | 'downvote' | null) || null);
    } catch (err) {
      console.error('Error voting:', err);
      alert('Failed to vote. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'text-sm gap-1',
    md: 'text-base gap-2',
    lg: 'text-lg gap-3',
  };

  const buttonSizes = {
    sm: 'p-1',
    md: 'p-2',
    lg: 'p-3',
  };

  return (
    <div className={`flex items-center ${sizeClasses[size]}`}>
      <button
        onClick={() => handleVote('upvote')}
        disabled={loading}
        className={`${buttonSizes[size]} rounded hover:bg-gray-100 transition-colors ${
          userVote === 'upvote' ? 'text-green-600 bg-green-50' : 'text-gray-600'
        } disabled:opacity-50`}
        title="Upvote"
      >
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <span className="font-semibold min-w-[2ch] text-center">
        {upvoteCount - downvoteCount}
      </span>

      <button
        onClick={() => handleVote('downvote')}
        disabled={loading}
        className={`${buttonSizes[size]} rounded hover:bg-gray-100 transition-colors ${
          userVote === 'downvote' ? 'text-red-600 bg-red-50' : 'text-gray-600'
        } disabled:opacity-50`}
        title="Downvote"
      >
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
