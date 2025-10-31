import { Badge } from './ui/badge';
import { UserRole } from '../../types/role';
import { useTranslation } from 'react-i18next';

interface UserRoleBadgeProps {
  role: UserRole | undefined;
  className?: string;
}

/**
 * UserRoleBadge Component
 * Displays a badge showing the user's role (Admin or Member)
 * Uses different colors for visual distinction
 */
export function UserRoleBadge({ role, className }: UserRoleBadgeProps) {
  const { t } = useTranslation();

  if (!role) {
    return null;
  }

  // Determine badge variant based on role
  const variant = role === UserRole.Admin ? 'default' : 'secondary';

  // Get translated role name
  const roleLabel = t(`roles.${role}`);

  return (
    <Badge variant={variant} className={className}>
      {roleLabel}
    </Badge>
  );
}
