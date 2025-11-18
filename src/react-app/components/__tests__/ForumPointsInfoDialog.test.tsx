import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ForumPointsInfoDialog } from '../ForumPointsInfoDialog';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'points.forumRulesDialog.title': 'How to Earn Points in Forums',
        'points.forumRulesDialog.intro': 'Earn points by creating quality forum threads, replies, and receiving community engagement. Learn about our point system and anti-spam measures below.',
        'points.forumRulesDialog.creatingContent': 'Creating Content',
        'points.forumRulesDialog.creatingContentDesc': 'You earn points when you create threads and replies:',
        'points.forumRulesDialog.thread': 'Forum thread',
        'points.forumRulesDialog.threadPoints': '15 points',
        'points.forumRulesDialog.reply': 'Reply to thread',
        'points.forumRulesDialog.replyPoints': '5 points',
        'points.commonRules.receivingEngagement': 'Receiving Engagement',
        'points.forumRulesDialog.receivingEngagementDesc': 'You earn points when others engage with your content:',
        'points.forumRulesDialog.upvoteReceivedThread': 'Upvote on your thread',
        'points.forumRulesDialog.upvoteReceivedThreadPoints': '3 points',
        'points.forumRulesDialog.upvoteReceivedReply': 'Upvote on your reply',
        'points.forumRulesDialog.upvoteReceivedReplyPoints': '2 points',
        'points.commonRules.important': 'Important:',
        'points.forumRulesDialog.noPointsForUpvoting': "You don't earn points by upvoting others' content, but the author does!",
        'points.commonRules.antiSpam': 'Anti-Spam System',
        'points.commonRules.antiSpamDesc': 'To maintain quality and prevent spam, we use a diminishing returns system. Point awards decrease if you create too much content within an hour:',
        'points.forumRulesDialog.threadsPerHour': 'Threads per hour',
        'points.forumRulesDialog.first3Threads': 'First 3 threads: 15 points each',
        'points.forumRulesDialog.next2Threads': 'Next 2 threads: 7.5 points each (50%)',
        'points.forumRulesDialog.beyond5Threads': 'Beyond 5 threads: 0 points',
        'points.forumRulesDialog.repliesPerHour': 'Replies per hour',
        'points.forumRulesDialog.first10Replies': 'First 10 replies: 5 points each',
        'points.forumRulesDialog.next10Replies': 'Next 10 replies: 2 points each (40%)',
        'points.forumRulesDialog.beyond20Replies': 'Beyond 20 replies: 0 points',
        'points.forumRulesDialog.upvotesPerHour': 'Upvotes received per hour',
        'points.forumRulesDialog.first5Upvotes': 'First 5 upvotes: Full points (2-3 each)',
        'points.forumRulesDialog.next10Upvotes': 'Next 10 upvotes: 50% points (1-1.5 each)',
        'points.forumRulesDialog.beyond15Upvotes': 'Beyond 15 upvotes: 0 points',
        'common.close': 'Close',
      };

      if (typeof defaultValue === 'string') {
        return translations[key] || defaultValue;
      }

      return translations[key] || key;
    },
  }),
}));

describe('ForumPointsInfoDialog', () => {
  it('should not render when open is false', () => {
    const { container } = render(
      <ForumPointsInfoDialog open={false} onOpenChange={() => {}} />
    );

    // Dialog should not be visible
    const dialogs = container.querySelectorAll('[role="dialog"]');
    expect(dialogs.length).toBe(0);
  });

  it('should render when open is true', () => {
    render(
      <ForumPointsInfoDialog open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('How to Earn Points in Forums')).toBeInTheDocument();
    expect(screen.getByText('Earn points by creating quality forum threads, replies, and receiving community engagement. Learn about our point system and anti-spam measures below.')).toBeInTheDocument();
  });

  it('should display creating content section with correct point values', () => {
    render(
      <ForumPointsInfoDialog open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('Creating Content')).toBeInTheDocument();
    expect(screen.getByText('You earn points when you create threads and replies:')).toBeInTheDocument();
    expect(screen.getByText('Forum thread')).toBeInTheDocument();
    expect(screen.getByText('15 points')).toBeInTheDocument();
    expect(screen.getByText('Reply to thread')).toBeInTheDocument();
    expect(screen.getByText('5 points')).toBeInTheDocument();
  });

  it('should display receiving engagement section with upvote points', () => {
    render(
      <ForumPointsInfoDialog open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('Receiving Engagement')).toBeInTheDocument();
    expect(screen.getByText('You earn points when others engage with your content:')).toBeInTheDocument();
    expect(screen.getByText('Upvote on your thread')).toBeInTheDocument();
    expect(screen.getByText('3 points')).toBeInTheDocument();
    expect(screen.getByText('Upvote on your reply')).toBeInTheDocument();
    expect(screen.getByText('2 points')).toBeInTheDocument();
  });

  it('should display important note about upvoting', () => {
    render(
      <ForumPointsInfoDialog open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('Important:')).toBeInTheDocument();
    expect(screen.getByText("You don't earn points by upvoting others' content, but the author does!")).toBeInTheDocument();
  });

  it('should display anti-spam section with diminishing returns info', () => {
    render(
      <ForumPointsInfoDialog open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('Anti-Spam System')).toBeInTheDocument();
    expect(screen.getByText('To maintain quality and prevent spam, we use a diminishing returns system. Point awards decrease if you create too much content within an hour:')).toBeInTheDocument();
  });

  it('should display all diminishing returns tiers for threads', () => {
    render(
      <ForumPointsInfoDialog open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('Threads per hour')).toBeInTheDocument();
    expect(screen.getByText('First 3 threads: 15 points each')).toBeInTheDocument();
    expect(screen.getByText('Next 2 threads: 7.5 points each (50%)')).toBeInTheDocument();
    expect(screen.getByText('Beyond 5 threads: 0 points')).toBeInTheDocument();
  });

  it('should display all diminishing returns tiers for replies', () => {
    render(
      <ForumPointsInfoDialog open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('Replies per hour')).toBeInTheDocument();
    expect(screen.getByText('First 10 replies: 5 points each')).toBeInTheDocument();
    expect(screen.getByText('Next 10 replies: 2 points each (40%)')).toBeInTheDocument();
    expect(screen.getByText('Beyond 20 replies: 0 points')).toBeInTheDocument();
  });

  it('should display all diminishing returns tiers for upvotes received', () => {
    render(
      <ForumPointsInfoDialog open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('Upvotes received per hour')).toBeInTheDocument();
    expect(screen.getByText('First 5 upvotes: Full points (2-3 each)')).toBeInTheDocument();
    expect(screen.getByText('Next 10 upvotes: 50% points (1-1.5 each)')).toBeInTheDocument();
    expect(screen.getByText('Beyond 15 upvotes: 0 points')).toBeInTheDocument();
  });

  it('should display close button', () => {
    render(
      <ForumPointsInfoDialog open={true} onOpenChange={() => {}} />
    );

    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    // The first button is the actual Close button in the footer
    expect(closeButtons[0]).toBeInTheDocument();
  });

  it('should call onOpenChange with false when close button is clicked', async () => {
    const mockOnOpenChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ForumPointsInfoDialog open={true} onOpenChange={mockOnOpenChange} />
    );

    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    // The first button is the actual Close button in the footer
    await user.click(closeButtons[0]);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
