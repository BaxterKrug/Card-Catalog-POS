import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";

import { login as apiLogin } from "../api/users";
import { useAuth } from "../contexts/AuthContext";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: apiLogin,
    onSuccess: (data) => {
      login(data.user, data.token);
      navigate("/");
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Login failed. Check your credentials.";
      setError(message);
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }
    mutation.mutate({ username: username.trim(), password });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0B0F17] via-[#0e1219] to-[#0B0F17] px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-accent to-indigo-500">
            <span className="text-4xl font-black text-white">CD</span>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">SK R&D</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">CheckoutDesignator</h1>
          <p className="mt-2 text-sm text-white/60">Sign in to your account</p>
        </div>

        <form className="mt-8 space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <label className="flex flex-col gap-2 text-sm text-white/70">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">Username</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-3 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                placeholder="cayle"
                autoFocus
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-white/70">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-3 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                placeholder="••••••••"
                required
              />
            </label>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent to-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogIn size={18} />
            {mutation.isPending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-xs text-white/40">
          Default credentials: <span className="text-white/60">cayle / dev123</span>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
