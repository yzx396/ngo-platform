import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ForumControlsProps {
  isAuthenticated: boolean;
}

/**
 * ForumControls Component
 * Displays the create thread button when user is authenticated
 * Matches the BlogControls pattern for consistency
 */
export function ForumControls({ isAuthenticated }: ForumControlsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex justify-end">
      <Button onClick={() => navigate('/forums/create')}>
        <Plus className="w-4 h-4 mr-2" />
        {t('forums.createThread')}
      </Button>
    </div>
  );
}
