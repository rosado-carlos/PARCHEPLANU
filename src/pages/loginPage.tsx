import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import StateMessage from "../components/ui/StateMessage";
import { login } from "../services/parchePlanService";
import type { UserProfile } from "../types";

type Props = {
  onLogin: (user: UserProfile) => void;
};

export default function LoginPage({ onLogin }: Props) {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setError(null);
      const user = await login(email, password);
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
    <main className="mx-auto max-w-md px-6 py-10">
      <section className="rounded-card border border-border bg-surface p-6 shadow-card">
        <h1 className="m-0 text-xl font-semibold text-text">Log in</h1>
        <p className="mt-2 text-sm text-muted">Use your university account to continue.</p>

        <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit}>
          <label className="flex flex-col gap-2">
            <span className="text-xs text-muted">University email</span>
            <input
              className="rounded-input border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
              type="email"
              value={email}
              placeholder="student@uni.edu"
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs text-muted">Password</span>
            <input
              className="rounded-input border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
              type="password"
              value={password}
              placeholder="******"
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <Button type="submit" disabled={loading}>
            {loading ? "Loading..." : "Log in"}
          </Button>
        </form>

        {error && (
          <div className="mt-4">
            <StateMessage type="error" title="Login failed" description={error} />
          </div>
        )}

        <p className="mt-4 text-sm text-muted">
          Need an account?{" "}
          <Link className="text-brand-700 hover:underline" to="/signup">
            Sign up
          </Link>
        </p>
      </section>
    </main>
  );
}
