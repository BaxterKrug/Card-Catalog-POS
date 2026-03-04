import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, X } from "lucide-react";

import { createUser, updateUser, changeUserPassword, type User } from "../api/users";
import { useUsers } from "../hooks/useUsers";
import { useAuth } from "../contexts/AuthContext";

type UserFormState = {
  name: string;
  username: string;
  password: string;
  role: "owner" | "manager" | "employee";
  title: string;
  email: string;
  is_active: boolean;
};

const DEFAULT_USER_FORM: UserFormState = {
  name: "",
  username: "",
  password: "",
  role: "employee",
  title: "",
  email: "",
  is_active: true,
};

const SettingsPage = () => {
  const { user: currentUser } = useAuth();
  const { data: users = [], isLoading } = useUsers();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<UserFormState>({ ...DEFAULT_USER_FORM });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if current user is owner
  const isOwner = currentUser?.role === "owner";

  const activeUsers = useMemo(() => users.filter((user) => user.is_active), [users]);

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setForm({ ...DEFAULT_USER_FORM });
      setNotice("User created successfully.");
      setError(null);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Unable to create user";
      setError(message);
      setNotice(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: number; payload: any }) =>
      updateUser(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditingUser(null);
      setNotice("User updated successfully.");
      setError(null);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Unable to update user";
      setError(message);
      setNotice(null);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ userId, newPassword }: { userId: number; newPassword: string }) =>
      changeUserPassword(userId, newPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditingUser(null);
      setNotice("Password changed successfully.");
      setError(null);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Unable to change password";
      setError(message);
      setNotice(null);
    },
  });

  const handleInputChange = (field: keyof UserFormState) => (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = field === "is_active" && event.target instanceof HTMLInputElement
      ? event.target.checked
      : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    setError(null);
    
    if (!form.name.trim()) {
      setError("Please provide a user name.");
      return;
    }
    if (!form.username.trim()) {
      setError("Please provide a username.");
      return;
    }
    if (!form.password.trim() || form.password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }

    createMutation.mutate({
      name: form.name.trim(),
      username: form.username.trim(),
      password: form.password,
      role: form.role,
      title: form.title.trim() || undefined,
      email: form.email.trim() || undefined,
      is_active: form.is_active,
    });
  };

  const startEditUser = (user: User) => {
    setEditingUser(user);
    setNotice(null);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setError(null);
  };

  const saveUserEdit = (user: User, updates: Partial<User>) => {
    updateMutation.mutate({
      userId: user.id,
      payload: updates,
    });
  };

  // Don't show user management if not owner
  if (!isOwner) {
    return (
      <div className="space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Controls</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Settings</h1>
          <p className="mt-1 text-sm text-white/60">
            Settings and user management are only available to owners.
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-white/60">
            You don't have permission to access settings.
          </p>
          <p className="mt-2 text-sm text-white/40">
            Contact an owner if you need to manage users or change system settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">Controls</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Settings</h1>
        <p className="mt-1 text-sm text-white/60">
          Manage user accounts, roles, and permissions.
        </p>
      </div>

      {/* User Management Section */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Team</p>
            <h2 className="text-xl font-semibold text-white">User Management</h2>
            <p className="text-sm text-white/60">
              View and edit staff accounts, roles, and permissions.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b0f17] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-white/70">
            <div>
              <p className="text-white text-lg font-semibold">Active users</p>
              <p className="text-white/50">{activeUsers.length} of {users.length} total</p>
            </div>
          </div>

          {/* User List */}
          <div className="mt-4 space-y-2">
            {isLoading ? (
              <span className="text-white/50">Loading users…</span>
            ) : users.length === 0 ? (
              <span className="text-white/50">No users yet. Add one below to get started.</span>
            ) : (
              users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  isEditing={editingUser?.id === user.id}
                  onEdit={startEditUser}
                  onCancel={cancelEdit}
                  onSave={saveUserEdit}
                  isSaving={updateMutation.isPending}
                  onChangePassword={(userId, newPassword) => 
                    changePasswordMutation.mutate({ userId, newPassword })
                  }
                  isChangingPassword={changePasswordMutation.isPending}
                />
              ))
            )}
          </div>
        </div>

        {/* Add New User Form */}
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <h3 className="text-lg font-semibold text-white">Add New User</h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-white/70">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">Full name *</span>
              <input
                className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                value={form.name}
                onChange={handleInputChange("name")}
                placeholder="John Smith"
                required
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-white/70">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">Username *</span>
              <input
                className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                value={form.username}
                onChange={handleInputChange("username")}
                placeholder="john"
                required
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-white/70">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">Password *</span>
              <input
                type="password"
                className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                value={form.password}
                onChange={handleInputChange("password")}
                placeholder="••••••••"
                required
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-white/70">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">Role *</span>
              <select
                className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-white focus:border-accent focus:outline-none"
                value={form.role}
                onChange={handleInputChange("role")}
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="owner">Owner</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm text-white/70">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">Title</span>
              <input
                className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                value={form.title}
                onChange={handleInputChange("title")}
                placeholder="Sales Associate"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-white/70">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">Email</span>
              <input
                type="email"
                className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                value={form.email}
                onChange={handleInputChange("email")}
                placeholder="john@example.com"
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={handleInputChange("is_active")}
                className="h-4 w-4 rounded border-white/30 bg-transparent"
              />
              <div>
                <p className="text-white font-medium">Active user</p>
                <p className="text-xs text-white/50">Inactive users cannot log in.</p>
              </div>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-[#0B0F17] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createMutation.isPending ? "Creating…" : "Add user"}
            </button>
            {error && <p className="text-sm text-rose-200">{error}</p>}
            {!error && notice && <p className="text-sm text-emerald-200">{notice}</p>}
          </div>
        </form>
      </div>
    </div>
  );
};

// UserRow component for editing individual users
interface UserRowProps {
  user: User;
  isEditing: boolean;
  onEdit: (user: User) => void;
  onCancel: () => void;
  onSave: (user: User, updates: Partial<User>) => void;
  isSaving: boolean;
  onChangePassword: (userId: number, newPassword: string) => void;
  isChangingPassword: boolean;
}

function UserRow({ user, isEditing, onEdit, onCancel, onSave, isSaving, onChangePassword, isChangingPassword }: UserRowProps) {
  const [editForm, setEditForm] = useState({
    name: user.name,
    role: user.role,
    title: user.title || "",
    email: user.email || "",
    is_active: user.is_active,
    password: "",
    changePassword: false,
  });

  const handleChange = (field: string, value: string | boolean) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // If changing password, handle that separately
    if (editForm.changePassword && editForm.password) {
      if (editForm.password.length < 4) {
        alert("Password must be at least 4 characters");
        return;
      }
      onChangePassword(user.id, editForm.password);
    } else {
      // Otherwise, save user info updates
      onSave(user, {
        name: editForm.name,
        role: editForm.role,
        title: editForm.title || undefined,
        email: editForm.email || undefined,
        is_active: editForm.is_active,
      });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-500/20 text-purple-200 border-purple-500/30";
      case "manager":
        return "bg-blue-500/20 text-blue-200 border-blue-500/30";
      default:
        return "bg-gray-500/20 text-gray-200 border-gray-500/30";
    }
  };

  if (isEditing) {
    return (
      <div className="rounded-xl border border-accent/50 bg-[#0d1117] p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider">Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#080b12] px-3 py-2 text-white text-sm focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider">Role</label>
            <select
              value={editForm.role}
              onChange={(e) => handleChange("role", e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#080b12] px-3 py-2 text-white text-sm focus:border-accent focus:outline-none"
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="owner">Owner</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider">Title</label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#080b12] px-3 py-2 text-white text-sm focus:border-accent focus:outline-none"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#080b12] px-3 py-2 text-white text-sm focus:border-accent focus:outline-none"
              placeholder="Optional"
            />
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-3 text-sm text-white">
              <input
                type="checkbox"
                checked={editForm.changePassword}
                onChange={(e) => handleChange("changePassword", e.target.checked)}
                className="h-4 w-4 rounded border-white/30"
              />
              <span>Change password</span>
            </label>
            {editForm.changePassword && (
              <div className="mt-2">
                <label className="text-xs text-white/40 uppercase tracking-wider">New Password</label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#080b12] px-3 py-2 text-white text-sm focus:border-accent focus:outline-none"
                  placeholder="At least 4 characters"
                  minLength={4}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 md:col-span-2">
            <input
              type="checkbox"
              checked={editForm.is_active}
              onChange={(e) => handleChange("is_active", e.target.checked)}
              className="h-4 w-4 rounded border-white/30"
            />
            <label className="text-sm text-white">Active (can log in)</label>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={isSaving || isChangingPassword}
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-black disabled:opacity-50"
          >
            {isSaving || isChangingPassword ? "Saving…" : editForm.changePassword ? "Change Password" : "Save"}
          </button>
          <button
            onClick={onCancel}
            disabled={isSaving || isChangingPassword}
            className="rounded-full border border-white/20 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0d1117] p-4">
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h3 className="text-white font-medium">{user.name}</h3>
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
            {user.role}
          </span>
          {!user.is_active && (
            <span className="rounded-full border border-red-500/30 bg-red-500/20 px-2.5 py-0.5 text-xs font-medium text-red-200">
              Inactive
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
          <span>@{user.username}</span>
          {user.title && <span>{user.title}</span>}
          {user.email && <span>{user.email}</span>}
        </div>
      </div>
      <button
        onClick={() => onEdit(user)}
        className="rounded-lg p-2 text-white/60 hover:bg-white/5 hover:text-white transition-colors"
        title="Edit user"
      >
        <Pencil className="h-4 w-4" />
      </button>
    </div>
  );
}

export default SettingsPage;
