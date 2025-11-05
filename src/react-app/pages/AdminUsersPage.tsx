import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { UserRoleBadge } from '../components/UserRoleBadge';
import { listUsers, assignRole } from '../services/roleService';
import type { User } from '../../types/user';
import { UserRole } from '../../types/role';
import { ApiError } from '../services/apiClient';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

const USERS_PER_PAGE = 50;

/**
 * AdminUsersPage Component
 * Allows admins to view all users and manage their roles
 */
export function AdminUsersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Fetch users list
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await listUsers(USERS_PER_PAGE, offset);
        setUsers(response.users);
        setTotal(response.total);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to load users';
        setError(message);
        toast.error(message);
        console.error('Error loading users:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [offset]);

  // Handle role change
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      setUpdatingUserId(userId);
      await assignRole(userId, newRole);
      toast.success(t('admin.roleUpdated', 'Role updated successfully'));

      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update role';
      toast.error(message);
      console.error('Error updating role:', err);
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Check if user is admin
  if (!user || user.role !== UserRole.Admin) {
    return <Navigate to="/" replace />;
  }

  // Calculate pagination info
  const hasNextPage = offset + USERS_PER_PAGE < total;
  const hasPreviousPage = offset > 0;

  const handleNextPage = () => {
    setOffset((prev) => prev + USERS_PER_PAGE);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePreviousPage = () => {
    setOffset((prev) => Math.max(prev - USERS_PER_PAGE, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Render loading state
  if (loading && users.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{t('admin.users.title', 'User Management')}</h1>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && users.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{t('admin.users.title', 'User Management')}</h1>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <p className="text-destructive">{error}</p>
          <Button onClick={() => setOffset(0)}>
            {t('common.tryAgain', 'Try Again')}
          </Button>
        </div>
      </div>
    );
  }

  // Render empty state
  if (users.length === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{t('admin.users.title', 'User Management')}</h1>
          <p className="text-muted-foreground">
            {t('admin.users.subtitle', 'Manage user roles and permissions')}
          </p>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">{t('admin.users.noUsers', 'No users found')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t('admin.users.title', 'User Management')}</h1>
        <p className="text-muted-foreground">
          {t('admin.users.subtitle', 'Manage user roles and permissions')}
        </p>
      </div>

      {/* Users Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Table Header */}
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-sm">{t('common.name', 'Name')}</th>
                <th className="px-4 py-3 text-left font-semibold text-sm">{t('common.email', 'Email')}</th>
                <th className="px-4 py-3 text-left font-semibold text-sm">{t('admin.users.currentRole', 'Current Role')}</th>
                <th className="px-4 py-3 text-left font-semibold text-sm">{t('admin.users.actions', 'Actions')}</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y">
              {users.map((userRow, index) => {
                const isCurrentUser = user?.id === userRow.id;
                const currentRole = userRow.role || UserRole.Member;
                const isUpdating = updatingUserId === userRow.id;

                const rowClass = isCurrentUser
                  ? 'bg-yellow-50 dark:bg-yellow-950/20'
                  : index % 2 === 0
                    ? 'bg-background'
                    : 'bg-muted/20';

                return (
                  <tr key={userRow.id} className={`transition-colors ${rowClass}`}>
                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{userRow.name}</span>
                        {isCurrentUser && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                            {t('common.you', 'You')}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {userRow.email}
                    </td>

                    {/* Current Role */}
                    <td className="px-4 py-3">
                      <UserRoleBadge role={currentRole} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {currentRole === UserRole.Member ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRoleChange(userRow.id, UserRole.Admin)}
                            disabled={isUpdating}
                          >
                            {isUpdating ? t('common.loading', 'Loading...') : t('admin.users.makeAdmin', 'Make Admin')}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRoleChange(userRow.id, UserRole.Member)}
                            disabled={isUpdating || isCurrentUser}
                          >
                            {isUpdating ? t('common.loading', 'Loading...') : t('admin.users.removeMember', 'Demote to Member')}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {total > USERS_PER_PAGE && (
        <div className="flex items-center justify-between gap-4 pt-6 border-t">
          <div className="text-sm text-muted-foreground">
            {t('posts.pageInfo', 'Showing {{start}}-{{end}} of {{total}}', {
              start: offset + 1,
              end: Math.min(offset + USERS_PER_PAGE, total),
              total,
            })}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePreviousPage}
              disabled={!hasPreviousPage || loading}
            >
              {t('posts.previous', 'Previous')}
            </Button>
            <Button
              onClick={handleNextPage}
              disabled={!hasNextPage || loading}
            >
              {t('posts.next', 'Next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsersPage;
