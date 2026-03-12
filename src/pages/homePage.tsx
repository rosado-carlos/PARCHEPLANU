import { useCallback, useEffect, useState, type FormEvent } from "react";
import ParcheCard from "../components/parches/ParcheCard";
import Button from "../components/ui/Button";
import StateMessage from "../components/ui/StateMessage";
import {
  createParche,
  getUserParches,
  joinParcheByInvite,
  resetSeedData,
} from "../services/parchePlanService";
import type { ParcheSummary, UserProfile } from "../types";

type Props = {
  currentUser: UserProfile;
};

export default function HomePage({ currentUser }: Props) {
  const [parches, setParches] = useState<ParcheSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [coverImageUrl, setCoverImageUrl] = useState<string>("");
  const [inviteCode, setInviteCode] = useState<string>("");

  const loadParches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUserParches(currentUser.id);
      setParches(data);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unexpected error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  async function onCreateParche(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await createParche(currentUser.id, {
        name,
        description,
        coverImageUrl,
      });
      setName("");
      setDescription("");
      setCoverImageUrl("");
      await loadParches();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unexpected error";
      setError(message);
    }
  }

  async function onJoinParche(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await joinParcheByInvite(currentUser.id, inviteCode);
      setInviteCode("");
      await loadParches();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unexpected error";
      setError(message);
    }
  }

  async function onResetData() {
    await resetSeedData();
    await loadParches();
  }

  useEffect(() => {
    void loadParches();
  }, [loadParches]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="m-0 text-2xl font-semibold text-text">My Parches</h1>
          <p className="mt-2 text-sm text-muted">Create, join and coordinate decisions without chat chaos.</p>
        </div>

        <Button variant="secondary" onClick={onResetData}>
          Reload seed data
        </Button>
      </div>

      {error && (
        <div className="mt-4">
          <StateMessage type="error" title="Something went wrong" description={error} />
        </div>
      )}

      <section className="mt-6 grid gap-4 rounded-card border border-border bg-surface p-4 shadow-card lg:grid-cols-2">
        <form className="flex flex-col gap-3" onSubmit={onCreateParche}>
          <h2 className="m-0 text-base font-semibold text-text">Create parche</h2>
          <input
            className="rounded-input border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
            type="text"
            placeholder="Parche name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <textarea
            className="rounded-input border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
            placeholder="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
          />
          <input
            className="rounded-input border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
            type="url"
            placeholder="Cover image URL"
            value={coverImageUrl}
            onChange={(event) => setCoverImageUrl(event.target.value)}
            required
          />
          <Button type="submit">Create</Button>
        </form>

        <form className="flex flex-col gap-3" onSubmit={onJoinParche}>
          <h2 className="m-0 text-base font-semibold text-text">Join with invite code</h2>
          <input
            className="rounded-input border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
            type="text"
            placeholder="PARCHE-CODE"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            required
          />
          <p className="text-xs text-muted">You can paste the code or the full invite URL.</p>
          <Button type="submit" variant="secondary">
            Join
          </Button>
        </form>
      </section>

      <section className="mt-6">
        {loading ? (
          <StateMessage type="loading" title="Loading parches" description="Please wait..." />
        ) : parches.length === 0 ? (
          <StateMessage type="empty" title="No parches yet" description="Create one or join using an invite code." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {parches.map((item) => (
              <ParcheCard key={item.parche.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
