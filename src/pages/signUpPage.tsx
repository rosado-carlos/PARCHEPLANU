import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import StateMessage from "../components/ui/StateMessage";
import { registerUser } from "../services/parchePlanService";
import type { UserProfile } from "../types";

type Props = {
  onLogin: (user: UserProfile) => void;
};

export default function SignUpPage({ onLogin }: Props) {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState<string>("");
  const [universityEmail, setUniversityEmail] = useState<string>("");
  const [universityIdentifier, setUniversityIdentifier] = useState<string>("");
  const [major, setMajor] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const user = await registerUser({
        fullName,
        universityEmail,
        universityIdentifier,
        major,
        avatarUrl,
        password,
      });

      onLogin(user);
      navigate("/");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unexpected error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <section className="rounded-card border border-border bg-surface p-6 shadow-card">
        <h1 className="m-0 text-xl font-semibold text-text">Create account</h1>
        <p className="mt-2 text-sm text-muted">Create your profile to join and coordinate plans.</p>

        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-xs text-muted">Full name</span>
            <input
              className="rounded-input border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs text-muted">University email</span>
            <input
              className="rounded-input border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
              type="email"
              value={universityEmail}
              onChange={(event) => setUniversityEmail(event.target.value)}
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs text-muted">University ID</span>
            <input
              className="rounded-input border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
              type="text"
              value={universityIdentifier}
              onChange={(event) => setUniversityIdentifier(event.target.value)}
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs text-muted">Major</span>
            <input
              className="rounded-input border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
              type="text"
              value={major}
              onChange={(event) => setMajor(event.target.value)}
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs text-muted">Avatar URL (optional)</span>
            <input
              className="rounded-input border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
              type="url"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs text-muted">Password</span>
            <input
              className="rounded-input border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs text-muted">Confirm password</span>
            <input
              className="rounded-input border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </label>

          <div className="sm:col-span-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create account"}
            </Button>
          </div>
        </form>

        {error && (
          <div className="mt-4">
            <StateMessage type="error" title="Sign up failed" description={error} />
          </div>
        )}

        <p className="mt-4 text-sm text-muted">
          Already have an account?{" "}
          <Link className="text-brand-700 hover:underline" to="/login">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
