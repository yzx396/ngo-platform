import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PointsInfoDialog } from '../PointsInfoDialog';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'points.rulesDialog.title': 'How to Earn Points',
        'points.rulesDialog.intro': 'Earn points by creating quality content and engaging with the community.',
        'points.rulesDialog.creatingContent': 'Creating Content',
        'points.rulesDialog.creatingContentDesc': 'You earn points when you create posts and comments:',
        'points.rulesDialog.discussionPost': 'Discussion post',
        'points.rulesDialog.discussionPostPoints': '15 points',
        'points.rulesDialog.generalPost': 'General post',
        'points.rulesDialog.generalPostPoints': '10 points',
        'points.rulesDialog.announcementPost': 'Announcement',
        'points.rulesDialog.announcementPostPoints': '0 points (admin only)',
        'points.rulesDialog.comment': 'Comment',
        'points.rulesDialog.commentPoints': '5 points',
        'points.rulesDialog.receivingEngagement': 'Receiving Engagement',
        'points.rulesDialog.receivingEngagementDesc': 'You earn points when others engage with your content:',
        'points.rulesDialog.likeReceived': 'Like on your post',
        'points.rulesDialog.likeReceivedPoints': '2 points',
        'points.rulesDialog.commentReceived': 'Comment on your post',
        'points.rulesDialog.commentReceivedPoints': '3 points',
        'points.rulesDialog.important': 'Important:',
        'points.rulesDialog.noPointsForLiking': "You don't earn points by liking other people's posts, but the post author does!",
        'points.rulesDialog.antiSpam': 'Anti-Spam System',
        'points.rulesDialog.antiSpamDesc': 'To maintain quality and prevent spam, we use a diminishing returns system.',
        'points.rulesDialog.likesPerHour': 'Likes per hour',
        'points.rulesDialog.first5Likes': 'First 5 likes: 2 points each',
        'points.rulesDialog.next10Likes': 'Next 10 likes: 1 point each (50%)',
        'points.rulesDialog.beyond15Likes': 'Beyond 15 likes: 0 points',
        'points.rulesDialog.commentsPerHour': 'Comments per hour',
        'points.rulesDialog.first10Comments': 'First 10 comments: 5 points each',
        'points.rulesDialog.next10Comments': 'Next 10 comments: 2 points each (40%)',
        'points.rulesDialog.beyond20Comments': 'Beyond 20 comments: 0 points',
        'points.rulesDialog.postsPerHour': 'Posts per hour',
        'points.rulesDialog.first3Posts': 'First 3 posts: Full points (10-15 each)',
        'points.rulesDialog.next2Posts': 'Next 2 posts: 50% points (5-7.5 each)',
        'points.rulesDialog.beyond5Posts': 'Beyond 5 posts: 0 points',
        'common.close': 'Close',
      };

      if (typeof defaultValue === 'string') {
        return translations[key] || defaultValue;
      }

      return translations[key] || key;
    },
  }),
}));

describe('PointsInfoDialog', () => {
  it('should not render when open is false', () => {
    const { container } = render(
      <PointsInfoDialog open={false} onOpenChange={() => {}} />
    );

    // Dialog should not be visible
    const dialogs = container.querySelectorAll('[role="dialog"]');
    expect(dialogs.length).toBe(0);
  });

  it('should render when open is true', () => {
    render(
      <PointsInfoDialog open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('How to Earn Points')).toBeInTheDocument();
    expect(screen.getByText('Earn points by creating quality content and engaging with the community.')).toBeInTheDocument();
  });

  it('should display creating content section with post point values', () => {
    render(
      <PointsInfoDialog open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('Creating Content')).toBeInTheDocument();
    expect(screen.getByText('You earn points when you create posts and comments:')).toBeInTheDocument();
    expect(screen.getByText('Discussion post')).toBeInTheDocument();
    expect(screen.getByText('15 points')).toBeInTheDocument();
    expect(screen.getByText('General post')).toBeInTheDocument();
    expect(screen.getByText('10 points')).toBeInTheDocument();
    expect(screen.getByText('Comment')).toBeInTheDocument();
    expect(screen.getByText('5 points')).toBeInTheDocument();
  });

  it('should display receiving engagement section', () => {
    render(
      <PointsInfoDialog open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('Receiving Engagement')).toBeInTheDocument();
    expect(screen.getByText('You earn points when others engage with your content:')).toBeInTheDocument();
    expect(screen.getByText('Like on your post')).toBeInTheDocument();
    expect(screen.getByText('Comment on your post')).toBeInTheDocument();
  });

  it('should display important note about liking', () => {
    render(
      <PointsInfoDialog open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('Important:')).toBeInTheDocument();
    expect(screen.getByText("You don't earn points by liking other people's posts, but the post author does!")).toBeInTheDocument();
  });

  it('should display anti-spam section with diminishing returns info', () => {
    render(
      <PointsInfoDialog open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('Anti-Spam System')).toBeInTheDocument();
    expect(screen.getByText('To maintain quality and prevent spam, we use a diminishing returns system.')).toBeInTheDocument();
    expect(screen.getByText('Likes per hour')).toBeInTheDocument();
    expect(screen.getByText('First 5 likes: 2 points each')).toBeInTheDocument();
  });

  it('should display close button', () => {
    render(
      <PointsInfoDialog open={true} onOpenChange={() => {}} />
    );

    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    // The first button is the actual Close button in the footer
    expect(closeButtons[0]).toBeInTheDocument();
  });

  it('should call onOpenChange with false when close button is clicked', async () => {
    const mockOnOpenChange = vi.fn();
    const user = userEvent.setup();

    render(
      <PointsInfoDialog open={true} onOpenChange={mockOnOpenChange} />
    );

    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    // The first button is the actual Close button in the footer
    await user.click(closeButtons[0]);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should display all diminishing returns tiers for likes', () => {
    render(
      <PointsInfoDialog open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('First 5 likes: 2 points each')).toBeInTheDocument();
    expect(screen.getByText('Next 10 likes: 1 point each (50%)')).toBeInTheDocument();
    expect(screen.getByText('Beyond 15 likes: 0 points')).toBeInTheDocument();
  });

  it('should display all diminishing returns tiers for comments', () => {
    render(
      <PointsInfoDialog open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('First 10 comments: 5 points each')).toBeInTheDocument();
    expect(screen.getByText('Next 10 comments: 2 points each (40%)')).toBeInTheDocument();
    expect(screen.getByText('Beyond 20 comments: 0 points')).toBeInTheDocument();
  });

  it('should display all diminishing returns tiers for posts', () => {
    render(
      <PointsInfoDialog open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('First 3 posts: Full points (10-15 each)')).toBeInTheDocument();
    expect(screen.getByText('Next 2 posts: 50% points (5-7.5 each)')).toBeInTheDocument();
    expect(screen.getByText('Beyond 5 posts: 0 points')).toBeInTheDocument();
  });
});
