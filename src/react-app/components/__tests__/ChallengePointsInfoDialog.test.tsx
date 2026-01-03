import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ChallengePointsInfoDialog } from '../ChallengePointsInfoDialog';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'points.challengeRulesDialog.title': 'How to Earn Points in Challenges',
        'points.challengeRulesDialog.intro': 'Earn points by participating in challenges, submitting your work, and getting approved. Learn about our point system below.',
        'points.challengeRulesDialog.participation': 'Participation',
        'points.challengeRulesDialog.participationDesc': 'You earn points when you engage with challenges:',
        'points.challengeRulesDialog.joinChallenge': 'Join a challenge',
        'points.challengeRulesDialog.joinChallengePoints': '5 points',
        'points.challengeRulesDialog.submitCompletion': 'Submit completion',
        'points.challengeRulesDialog.submitCompletionPoints': '10 points',
        'points.challengeRulesDialog.rewards': 'Challenge Rewards',
        'points.challengeRulesDialog.rewardsDesc': 'When your submission is approved:',
        'points.challengeRulesDialog.approvedSubmission': 'Approved submission',
        'points.challengeRulesDialog.approvedSubmissionPoints': 'Variable (set by challenge creator)',
        'points.commonRules.antiSpam': 'Anti-Abuse Limits',
        'points.challengeRulesDialog.antiSpamDesc': 'To prevent gaming the system, points are capped with a 1-hour rolling window:',
        'points.challengeRulesDialog.joinsPerHour': 'Challenge joins per hour',
        'points.challengeRulesDialog.first5Joins': 'First 5 joins: Full points (5 each)',
        'points.challengeRulesDialog.beyond5Joins': 'Beyond 5 joins: 0 points',
        'points.challengeRulesDialog.submissionsPerHour': 'Submissions per hour',
        'points.challengeRulesDialog.first3Submissions': 'First 3 submissions: Full points (10 each)',
        'points.challengeRulesDialog.beyond3Submissions': 'Beyond 3 submissions: 0 points',
        'common.close': 'Close',
      };

      if (typeof defaultValue === 'string') {
        return translations[key] || defaultValue;
      }

      return translations[key] || key;
    },
  }),
}));

describe('ChallengePointsInfoDialog', () => {
  it('should not render when open is false', () => {
    const { container } = render(
      <ChallengePointsInfoDialog open={false} onOpenChange={() => {}} />
    );

    // Dialog should not be visible
    const dialogs = container.querySelectorAll('[role="dialog"]');
    expect(dialogs.length).toBe(0);
  });

  it('should render when open is true', () => {
    render(
      <ChallengePointsInfoDialog open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('How to Earn Points in Challenges')).toBeInTheDocument();
    expect(screen.getByText('Earn points by participating in challenges, submitting your work, and getting approved. Learn about our point system below.')).toBeInTheDocument();
  });

  it('should display participation section with correct point values', () => {
    render(
      <ChallengePointsInfoDialog open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('Participation')).toBeInTheDocument();
    expect(screen.getByText('You earn points when you engage with challenges:')).toBeInTheDocument();
    expect(screen.getByText('Join a challenge')).toBeInTheDocument();
    expect(screen.getByText('5 points')).toBeInTheDocument();
    expect(screen.getByText('Submit completion')).toBeInTheDocument();
    expect(screen.getByText('10 points')).toBeInTheDocument();
  });

  it('should display challenge rewards section', () => {
    render(
      <ChallengePointsInfoDialog open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('Challenge Rewards')).toBeInTheDocument();
    expect(screen.getByText('When your submission is approved:')).toBeInTheDocument();
    expect(screen.getByText('Approved submission')).toBeInTheDocument();
    expect(screen.getByText('Variable (set by challenge creator)')).toBeInTheDocument();
  });

  it('should display anti-abuse limits section', () => {
    render(
      <ChallengePointsInfoDialog open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('Anti-Abuse Limits')).toBeInTheDocument();
    expect(screen.getByText('To prevent gaming the system, points are capped with a 1-hour rolling window:')).toBeInTheDocument();
  });

  it('should display all limits for challenge joins', () => {
    render(
      <ChallengePointsInfoDialog open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('Challenge joins per hour')).toBeInTheDocument();
    expect(screen.getByText('First 5 joins: Full points (5 each)')).toBeInTheDocument();
    expect(screen.getByText('Beyond 5 joins: 0 points')).toBeInTheDocument();
  });

  it('should display all limits for submissions', () => {
    render(
      <ChallengePointsInfoDialog open={true} onOpenChange={() => {}} />
    );

    expect(screen.getByText('Submissions per hour')).toBeInTheDocument();
    expect(screen.getByText('First 3 submissions: Full points (10 each)')).toBeInTheDocument();
    expect(screen.getByText('Beyond 3 submissions: 0 points')).toBeInTheDocument();
  });

  it('should display close button', () => {
    render(
      <ChallengePointsInfoDialog open={true} onOpenChange={() => {}} />
    );

    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    expect(closeButtons[0]).toBeInTheDocument();
  });

  it('should call onOpenChange with false when close button is clicked', async () => {
    const mockOnOpenChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ChallengePointsInfoDialog open={true} onOpenChange={mockOnOpenChange} />
    );

    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    await user.click(closeButtons[0]);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
