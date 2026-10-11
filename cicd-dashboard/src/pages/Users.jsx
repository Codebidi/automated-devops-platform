import React, { useState, useEffect } from 'react';
import {
  Users as UsersIcon,
  UserPlus,
  Shield,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Button,
  Card,
  Badge,
  Input,
  Select,
  Modal,
  Skeleton,
  EmptyState,
  Avatar,
} from '../components/ui';

export default function Users() {
  const { user: currentUser, isAdmin } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state for creating a user
  const [formUsername, setFormUsername] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formRole, setFormRole] = useState('viewer');
  const [formPassword, setFormPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('deployhub_auth_token');
      const res = await fetch('/api/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.items || []);
      } else {
        toast.error('Failed to load users list from server.');
      }
    } catch (err) {
      toast.error('Network error loading users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');

    if (formUsername.trim().length < 3) {
      setFormError('Username must be at least 3 characters.');
      return;
    }
    if (!formFullName.trim()) {
      setFormError('Full name is required.');
      return;
    }
    if (formPassword.length < 10) {
      setFormError('Password must be at least 10 characters with letters & numbers.');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('deployhub_auth_token');
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: formUsername.trim(),
          full_name: formFullName.trim(),
          role: formRole,
          password: formPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to create user account.');
        return;
      }

      toast.success(`User "${formUsername}" created successfully!`);
      setIsAddModalOpen(false);
      setFormUsername('');
      setFormFullName('');
      setFormPassword('');
      setFormRole('viewer');
      fetchUsers();
    } catch (err) {
      setFormError('Network error creating user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (userToUpdate) => {
    if (userToUpdate.id === currentUser?.id) {
      toast.error('You cannot deactivate your own account.');
      return;
    }

    try {
      const token = localStorage.getItem('deployhub_auth_token');
      const nextStatus = !userToUpdate.is_active;
      const res = await fetch(`/api/users/${userToUpdate.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: nextStatus ? 1 : 0 }),
      });

      if (res.ok) {
        toast.success(
          `User "${userToUpdate.username}" ${nextStatus ? 'activated' : 'deactivated'}.`
        );
        fetchUsers();
      } else {
        toast.error('Failed to update user status.');
      }
    } catch {
      toast.error('Network error updating user status.');
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <Card className="p-8 text-center max-w-lg mx-auto mt-12">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-heading font-bold text-content-primary">
          Administrator Privilege Required
        </h2>
        <p className="mt-2 text-xs text-content-secondary leading-relaxed">
          User management is strictly limited to users with the Administrator role. Contact your system admin for account changes.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-content-primary tracking-tight">
            User Governance & Roles
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-content-secondary">
            Manage authenticated accounts, assign access levels, and audit activity.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsAddModalOpen(true)}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Add New User
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-4 max-w-md">
        <Input
          placeholder="Filter users by name, username, or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          onClear={() => setSearchQuery('')}
        />
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton variant="card" count={3} />
          </div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title="No Users Found"
            description={
              searchQuery
                ? `No user matched "${searchQuery}". Clear filter to view all users.`
                : 'No users registered in the database.'
            }
            action={
              searchQuery && (
                <Button variant="secondary" size="sm" onClick={() => setSearchQuery('')}>
                  Clear Filter
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-subtle/50 text-content-secondary font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-surface-subtle/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.full_name || u.username} role={u.role} size="sm" />
                        <div>
                          <p className="font-heading font-semibold text-content-primary">
                            {u.full_name || u.username}
                          </p>
                          <p className="text-[11px] font-mono text-content-muted">
                            @{u.username}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge variant={u.role} size="sm">
                        {u.role.toUpperCase()}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge
                        variant={u.is_active ? 'success' : 'danger'}
                        size="sm"
                        dot
                      >
                        {u.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-content-muted font-mono text-[11px]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {u.id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(u)}
                          className={u.is_active ? 'text-rose-600' : 'text-emerald-600'}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Platform User"
        description="Create a credentials pair and assign an access tier for this account."
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Username"
            placeholder="e.g. dev_user"
            value={formUsername}
            onChange={(e) => setFormUsername(e.target.value)}
            hint="3-32 characters of letters, numbers, '.', '_' or '-'"
            required
          />

          <Input
            label="Full Name"
            placeholder="e.g. Sarah Jenkins"
            value={formFullName}
            onChange={(e) => setFormFullName(e.target.value)}
            required
          />

          <Select
            label="Access Role"
            value={formRole}
            onChange={(e) => setFormRole(e.target.value)}
          >
            <option value="viewer">Viewer (Read-only status monitoring)</option>
            <option value="developer">Developer (Deploy rights & log viewer)</option>
            <option value="admin">Administrator (Full cluster management)</option>
          </Select>

          <Input
            label="Initial Password"
            type="password"
            placeholder="Min 10 characters with numbers"
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
            hint="Must be at least 10 chars with both letters and numbers"
            required
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
            <Button
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isSubmitting}
            >
              Create User
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
