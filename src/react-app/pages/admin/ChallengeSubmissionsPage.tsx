import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  getChallengeById,
  getChallengeSubmissions,
  approveSubmission,
  rejectSubmission,
} from '../../services/challengeService';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import type { Challenge, ChallengeSubmission } from '../../../types/challenge';
import { SubmissionStatus } from '../../../types/challenge';

export function ChallengeSubmissionsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingSubmission, setRejectingSubmission] = useState<ChallengeSubmission | null>(null);
  const [feedback, setFeedback] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [challengeData, submissionsData] = await Promise.all([
          getChallengeById(id),
          getChallengeSubmissions(id),
        ]);
        setChallenge(challengeData);
        setSubmissions(submissionsData);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(t('admin.submissions.loadError', 'Failed to load submissions'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, t]);

  const handleApprove = async (submission: ChallengeSubmission) => {
    try {
      setProcessing(submission.id);
      await approveSubmission(submission.id);
      // Reload submissions
      if (id) {
        const updated = await getChallengeSubmissions(id);
        setSubmissions(updated);
      }
    } catch (err) {
      console.error('Error approving submission:', err);
      setError(t('admin.submissions.approveError', 'Failed to approve submission'));
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectClick = (submission: ChallengeSubmission) => {
    setRejectingSubmission(submission);
    setFeedback('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectingSubmission) return;

    try {
      setProcessing(rejectingSubmission.id);
      await rejectSubmission(rejectingSubmission.id, feedback || undefined);
      setRejectDialogOpen(false);
      setRejectingSubmission(null);
      setFeedback('');
      // Reload submissions
      if (id) {
        const updated = await getChallengeSubmissions(id);
        setSubmissions(updated);
      }
    } catch (err) {
      console.error('Error rejecting submission:', err);
      setError(t('admin.submissions.rejectError', 'Failed to reject submission'));
    } finally {
      setProcessing(null);
    }
  };

  const pendingSubmissions = submissions.filter((s) => s.status === SubmissionStatus.Pending);
  const reviewedSubmissions = submissions.filter((s) => s.status !== SubmissionStatus.Pending);

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
        <Button variant="ghost" onClick={() => navigate('/admin/challenges')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.back', 'Back')}
        </Button>
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error || t('challenges.notFound', 'Challenge not found')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/admin/challenges')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('common.back', 'Back to Challenges')}
      </Button>

      {/* Challenge Header */}
      <div>
        <h1 className="text-3xl font-bold">{challenge.title}</h1>
        <p className="text-muted-foreground mt-2">
          {t('admin.submissions.reviewTitle', 'Review and manage submissions')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{submissions.length}</div>
            <div className="text-sm text-muted-foreground">
              {t('admin.submissions.total', 'Total Submissions')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{pendingSubmissions.length}</div>
            <div className="text-sm text-muted-foreground">
              {t('admin.submissions.pending', 'Pending Review')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {submissions.filter((s) => s.status === SubmissionStatus.Approved).length}
            </div>
            <div className="text-sm text-muted-foreground">
              {t('admin.submissions.approved', 'Approved')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Submissions */}
      {pendingSubmissions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            {t('admin.submissions.pendingTitle', 'Pending Submissions')}
          </h2>
          {pendingSubmissions.map((submission) => (
            <Card key={submission.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{submission.user_name || 'Unknown User'}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{submission.user_email}</p>
                  </div>
                  <Badge>{t('common.pending', 'Pending')}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">
                    {t('challenges.submissionText', 'Submission')}:
                  </h4>
                  <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">
                    {submission.submission_text}
                  </p>
                </div>

                {submission.submission_url && (
                  <div>
                    <h4 className="font-medium mb-2">{t('challenges.submissionUrl', 'Proof URL')}:</h4>
                    <a
                      href={submission.submission_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {submission.submission_url}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    onClick={() => handleApprove(submission)}
                    disabled={processing === submission.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {processing === submission.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('common.processing', 'Processing...')}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {t('admin.submissions.approve', 'Approve')}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleRejectClick(submission)}
                    disabled={processing === submission.id}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {t('admin.submissions.reject', 'Reject')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reviewed Submissions */}
      {reviewedSubmissions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            {t('admin.submissions.reviewedTitle', 'Reviewed Submissions')}
          </h2>
          {reviewedSubmissions.map((submission) => (
            <Card key={submission.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{submission.user_name || 'Unknown User'}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{submission.user_email}</p>
                  </div>
                  <Badge
                    variant={
                      submission.status === SubmissionStatus.Approved ? 'default' : 'destructive'
                    }
                  >
                    {submission.status === SubmissionStatus.Approved
                      ? t('common.approved', 'Approved')
                      : t('common.rejected', 'Rejected')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">
                    {submission.submission_text}
                  </p>
                </div>
                {submission.feedback && (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">{t('challenges.feedback', 'Feedback')}:</span>{' '}
                    {submission.feedback}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {submissions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {t('admin.submissions.noSubmissions', 'No submissions yet')}
          </p>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.submissions.rejectTitle', 'Reject Submission')}</DialogTitle>
            <DialogDescription>
              {t(
                'admin.submissions.rejectDescription',
                'Provide optional feedback for the user'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="feedback">{t('challenges.feedback', 'Feedback (optional)')}</Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={t(
                'admin.submissions.feedbackPlaceholder',
                'Explain why this submission was rejected...'
              )}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={processing !== null}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.processing', 'Processing...')}
                </>
              ) : (
                t('admin.submissions.reject', 'Reject')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
