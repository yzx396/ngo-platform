import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  getChallenges,
  createChallenge,
  updateChallenge,
  deleteChallenge,
} from '../../services/challengeService';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import type { Challenge, CreateChallengeDTO, UpdateChallengeDTO } from '../../../types/challenge';
import { ChallengeStatus } from '../../../types/challenge';

export function AdminChallengesPage() {
  const { t } = useTranslation();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [pointReward, setPointReward] = useState('100');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<ChallengeStatus>(ChallengeStatus.Active);

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getChallenges();
      setChallenges(data);
    } catch (err) {
      console.error('Error loading challenges:', err);
      setError('Failed to load challenges');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingChallenge(null);
    setTitle('');
    setDescription('');
    setRequirements('');
    setPointReward('100');
    setDeadline('');
    setStatus(ChallengeStatus.Active);
    setDialogOpen(true);
  };

  const openEditDialog = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setTitle(challenge.title);
    setDescription(challenge.description);
    setRequirements(challenge.requirements);
    setPointReward(String(challenge.point_reward));
    setDeadline(new Date(challenge.deadline).toISOString().slice(0, 16));
    setStatus(challenge.status);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim() || !requirements.trim() || !deadline) {
      return;
    }

    try {
      setSaving(true);

      if (editingChallenge) {
        // Update
        const data: UpdateChallengeDTO = {
          title,
          description,
          requirements,
          point_reward: parseInt(pointReward, 10),
          deadline: new Date(deadline).getTime(),
          status,
        };
        await updateChallenge(editingChallenge.id, data);
      } else {
        // Create
        const data: CreateChallengeDTO = {
          title,
          description,
          requirements,
          point_reward: parseInt(pointReward, 10),
          deadline: new Date(deadline).getTime(),
        };
        await createChallenge(data);
      }

      setDialogOpen(false);
      loadChallenges();
    } catch (err) {
      console.error('Error saving challenge:', err);
      setError('Failed to save challenge');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;

    try {
      setDeleting(true);
      await deleteChallenge(deletingId);
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      loadChallenges();
    } catch (err) {
      console.error('Error deleting challenge:', err);
      setError('Failed to delete challenge');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <h1 className="text-3xl font-bold">
            {t('admin.challenges.title', 'Manage Challenges')}
          </h1>
          <p className="text-muted-foreground">
            {t('admin.challenges.subtitle', 'Create and manage challenges for the community')}
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          {t('challenges.create', 'Create Challenge')}
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Challenges List */}
      {!loading && !error && (
        <div className="space-y-4">
          {challenges.map((challenge) => (
            <Card key={challenge.id} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{challenge.title}</h3>
                    <Badge variant={challenge.status === 'active' ? 'default' : 'secondary'}>
                      {challenge.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {challenge.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {challenge.point_reward} {t('common.points', 'points')}
                    </span>
                    <span>
                      {challenge.participant_count || 0} {t('challenges.participants', 'participants')}
                    </span>
                    <span>{new Date(challenge.deadline).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/admin/challenges/${challenge.id}/submissions`}>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      {t('admin.challenges.viewSubmissions', 'Submissions')}
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(challenge)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(challenge.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {challenges.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {t('admin.challenges.noChallenges', 'No challenges yet')}
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                {t('challenges.createFirst', 'Create the first challenge')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>
                {editingChallenge
                  ? t('admin.challenges.editTitle', 'Edit Challenge')
                  : t('admin.challenges.createTitle', 'Create Challenge')}
              </DialogTitle>
              <DialogDescription>
                {t(
                  'admin.challenges.dialogDescription',
                  'Fill in the details for the challenge'
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="title">{t('common.title', 'Title')} *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('admin.challenges.titlePlaceholder', 'Enter challenge title')}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">{t('challenges.description', 'Description')} *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t(
                    'admin.challenges.descriptionPlaceholder',
                    'Describe the challenge'
                  )}
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="requirements">
                  {t('challenges.requirements', 'Requirements')} *
                </Label>
                <Textarea
                  id="requirements"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder={t(
                    'admin.challenges.requirementsPlaceholder',
                    'What needs to be done to complete this challenge?'
                  )}
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pointReward">
                    {t('challenges.pointReward', 'Point Reward')} *
                  </Label>
                  <Input
                    id="pointReward"
                    type="number"
                    min="0"
                    value={pointReward}
                    onChange={(e) => setPointReward(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="deadline">{t('challenges.deadline', 'Deadline')} *</Label>
                  <Input
                    id="deadline"
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required
                  />
                </div>
              </div>

              {editingChallenge && (
                <div>
                  <Label htmlFor="status">{t('common.status', 'Status')}</Label>
                  <Select
                    value={status}
                    onValueChange={(value) => setStatus(value as ChallengeStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ChallengeStatus.Active}>
                        {t('challenges.status.active', 'Active')}
                      </SelectItem>
                      <SelectItem value={ChallengeStatus.Completed}>
                        {t('challenges.status.completed', 'Completed')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('common.saving', 'Saving...')}
                  </>
                ) : (
                  t('common.save', 'Save')
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.challenges.deleteTitle', 'Delete Challenge')}</DialogTitle>
            <DialogDescription>
              {t(
                'admin.challenges.deleteConfirmation',
                'Are you sure you want to delete this challenge? This action cannot be undone.'
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.deleting', 'Deleting...')}
                </>
              ) : (
                t('common.delete', 'Delete')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
