import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createUser } from "../api/users";
import { useUsers } from "../hooks/useUsers";

const toggles = [
  {
    label: "Enable preorder deposits",
    description: "Collect 30% upfront and enforce release windows.",
  },
  {
    label: "Sync with accounting",
    description: "Push nightly summaries to your ledger provider.",
  },
  {
    label: "Auto-reserve low stock",
    description: "Pause web sales when on-hand drops below safety stock.",
  },
];

type UserFormState = {
  name: string;
  title: string;
  email: string;
  is_active: boolean;
};

const DEFAULT_USER_FORM: UserFormState = {
  name: "Baxter Krug",
  title: "Developer",
  email: "",
  is_active: true,
};

const SettingsPage = () => {
  const { data: users = [], isLoading } = useUsers();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<UserFormState>({ ...DEFAULT_USER_FORM });
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeUsers = useMemo(() => users.filter((user) => user.is_active), [users]);

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["users"] });
  setForm({ ...DEFAULT_USER_FORM });
      setNotice("User saved. Baxter is ready for testing.");
      setError(null);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Unable to save user";
      setError(message);
      setNotice(null);
    },
  });

  const handleInputChange = (field: keyof UserFormState) => (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === "is_active" ? event.target.checked : event.target.value;
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
    mutation.mutate({
      name: form.name.trim(),
      title: form.title.trim() || undefined,
      email: form.email.trim() || undefined,
      is_active: form.is_active,
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">Controls</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Settings</h1>
        <p className="mt-1 text-sm text-white/60">
          Configure operations, payments, automation policies, and test user accounts.
        </p>
      </div>

      <div className="space-y-4">
        {toggles.map((setting) => (
          <label
            key={setting.label}
            className="flex cursor-pointer items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-5 py-4"
          >
            <div>
              <p className="text-white font-medium">{setting.label}</p>
              <p className="text-sm text-white/60">{setting.description}</p>
            </div>
            <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-white/20">
              <span className="inline-block h-4 w-4 translate-x-1 rounded-full bg-white transition" />
            </span>
          </label>
        ))}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Team</p>
            <h2 className="text-xl font-semibold text-white">User directory</h2>
            <p className="text-sm text-white/60">
              Defaults to Baxter Krug (Developer) for testing, but you can add additional staff.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b0f17] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-white/70">
            <div>
              <p className="text-white text-lg font-semibold">Active users</p>
              <p className="text-white/50">{activeUsers.length} of {users.length} total</p>
            </div>
            {isLoading ? (
              <span className="text-white/50">Loading users…</span>
            ) : users.length === 0 ? (
              <span className="text-white/50">No users yet. Add Baxter below to get started.</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {users.map((user) => (
                  <span
                    key={user.id}
                    className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/80"
                  >
                    {user.name} · {user.title || "No title"}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1 text-sm text-white/70">
            <span className="text-xs uppercase tracking-[0.3em] text-white/40">Full name</span>
            <input
              className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
              value={form.name}
              onChange={handleInputChange("name")}
              placeholder="Baxter Krug"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-white/70">
            <span className="text-xs uppercase tracking-[0.3em] text-white/40">Title</span>
            <input
              className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
              value={form.title}
              onChange={handleInputChange("title")}
              placeholder="Developer"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-white/70">
            <span className="text-xs uppercase tracking-[0.3em] text-white/40">Email (optional)</span>
            <input
              type="email"
              className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
              value={form.email}
              onChange={handleInputChange("email")}
              placeholder="baxter@example.com"
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
              <p className="text-xs text-white/50">Inactive users retain history but cannot log in.</p>
            </div>
          </label>
          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-[#0B0F17] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending ? "Saving…" : "Add user"}
            </button>
            {error && <p className="text-sm text-rose-200">{error}</p>}
            {!error && notice && <p className="text-sm text-emerald-200">{notice}</p>}
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;
