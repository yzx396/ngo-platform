import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Loader2,
  Trophy,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
  getChallengeById,
  joinChallenge,
  submitChallenge,
} from '../services/challengeService';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import type { ChallengeWithStatus } from '../../types/challenge';
import { ChallengeStatus, SubmissionStatus } from '../../types/challenge';

export function ChallengeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [challenge, setChallenge] = useState<ChallengeWithStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionUrl, setSubmissionUrl] = useState('');

  useEffect(() => {
    if (!id) return;

    const loadChallenge = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getChallengeById(id);
        setChallenge(data);
      } catch (err) {
        console.error('Error loading challenge:', err);
        setError(t('challenges.loadError', 'Failed to load challenge'));
      } finally {
        setLoading(false);
      }
    };

    loadChallenge();
  }, [id, t]);

  const handleJoin = async () => {
    if (!id || !challenge) return;

    try {
      setJoining(true);
      await joinChallenge(id);
      // Reload challenge to update status
      const updated = await getChallengeById(id);
      setChallenge(updated);
    } catch (err) {
      console.error('Error joining challenge:', err);
      setError(t('challenges.joinError', 'Failed to join challenge'));
    } finally {
      setJoining(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !challenge || !submissionText.trim()) return;

    try {
      setSubmitting(true);
      await submitChallenge(id, {
        submission_text: submissionText,
        submission_url: submissionUrl || undefined,
      });
      // Reload challenge to update status
      const updated = await getChallengeById(id);
      setChallenge(updated);
      setSubmissionText('');
      setSubmissionUrl('');
    } catch (err) {
      console.error('Error submitting challenge:', err);
      setError(t('challenges.submitError', 'Failed to submit challenge'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/challenges')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.back', 'Back')}
        </Button>
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error || t('challenges.notFound', 'Challenge not found')}
        </div>
      </div>
    );
  }

  const isActive = challenge.status === ChallengeStatus.Active;
  const deadline = new Date(challenge.deadline);
  const isExpired = deadline < new Date();
  const hasJoined = challenge.user_has_joined;
  const submission = challenge.user_submission;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/challenges')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('common.back', 'Back')}
      </Button>

      {/* Challenge Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl">{challenge.title}</CardTitle>
                <Badge variant={isActive && !isExpired ? 'default' : 'secondary'}>
                  {isActive && !isExpired
                    ? t('challenges.status.active', 'Active')
                    : t('challenges.status.completed', 'Completed')}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-600" />
                  <span className="font-bold text-amber-600 text-base">
                    {challenge.point_reward} {t('common.points', 'points')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>
                    {challenge.participant_count || 0} {t('challenges.participants', 'participants')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{deadline.toLocaleDateString()}</span>
                </div>
                {isActive && !isExpired && (
                  <div className="flex items-center gap-2 text-orange-600">
                    <Clock className="w-4 h-4" />
                    <span>
                      {(() => {
                        const daysLeft = Math.ceil(
                          (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                        );
                        return daysLeft === 1
                          ? t('challenges.lastDay', '1 day left')
                          : t('challenges.daysLeft', `${daysLeft} days left`, {
                              count: daysLeft,
                            });
                      })()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">{t('challenges.description', 'Description')}</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{challenge.description}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">{t('challenges.requirements', 'Requirements')}</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{challenge.requirements}</p>
          </div>
        </CardContent>
      </Card>

      {/* User Actions */}
      {user && isActive && !isExpired && (
        <Card>
          <CardHeader>
            <CardTitle>{t('challenges.yourProgress', 'Your Progress')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Not joined yet */}
            {!hasJoined && (
              <div>
                <p className="text-muted-foreground mb-4">
                  {t('challenges.joinPrompt', 'Join this challenge to start working on it')}
                </p>
                <Button onClick={handleJoin} disabled={joining}>
                  {joining ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('challenges.joining', 'Joining...')}
                    </>
                  ) : (
                    t('challenges.join', 'Join Challenge')
                  )}
                </Button>
              </div>
            )}

            {/* Joined but not submitted */}
            {hasJoined && !submission && (
              <div>
                <div className="flex items-center gap-2 text-blue-600 mb-4">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">
                    {t('challenges.joined', "You've joined this challenge")}
                  </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="submissionText">
                      {t('challenges.submissionText', 'Submission Details')} *
                    </Label>
                    <Textarea
                      id="submissionText"
                      value={submissionText}
                      onChange={(e) => setSubmissionText(e.target.value)}
                      placeholder={t(
                        'challenges.submissionTextPlaceholder',
                        'Describe what you did to complete this challenge...'
                      )}
                      rows={5}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="submissionUrl">
                      {t('challenges.submissionUrl', 'Proof URL (optional)')}
                    </Label>
                    <Input
                      id="submissionUrl"
                      type="url"
                      value={submissionUrl}
                      onChange={(e) => setSubmissionUrl(e.target.value)}
                      placeholder="https://..."
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      {t(
                        'challenges.submissionUrlHelp',
                        'Link to screenshot, video, or any proof of completion'
                      )}
                    </p>
                  </div>

                  <Button type="submit" disabled={submitting || !submissionText.trim()}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('challenges.submitting', 'Submitting...')}
                      </>
                    ) : (
                      t('challenges.submit', 'Submit Completion')
                    )}
                  </Button>
                </form>
              </div>
            )}

            {/* Submitted - Pending Review */}
            {submission && submission.status === SubmissionStatus.Pending && (
              <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">
                    {t('challenges.submissionPending', 'Submission Pending Review')}
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    {t(
                      'challenges.submissionPendingMessage',
                      'Your submission is being reviewed by an admin'
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Submitted - Approved */}
            {submission && submission.status === SubmissionStatus.Approved && (
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">
                    {t('challenges.submissionApproved', 'Challenge Completed!')}
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    {t(
                      'challenges.submissionApprovedMessage',
                      `Congratulations! You earned ${challenge.point_reward} points`
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Submitted - Rejected */}
            {submission && submission.status === SubmissionStatus.Rejected && (
              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">
                    {t('challenges.submissionRejected', 'Submission Rejected')}
                  </p>
                  {submission.feedback && (
                    <p className="text-sm text-red-700 mt-1">
                      <span className="font-medium">{t('challenges.feedback', 'Feedback')}:</span>{' '}
                      {submission.feedback}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Require auth message for non-logged in users */}
      {!user && isActive && !isExpired && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              {t('challenges.loginRequired', 'Please')}{' '}
              <Link to="/login" className="text-primary hover:underline">
                {t('common.login', 'login')}
              </Link>{' '}
              {t('challenges.loginRequiredSuffix', 'to join this challenge')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
