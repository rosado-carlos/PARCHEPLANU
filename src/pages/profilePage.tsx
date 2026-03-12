import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import StateMessage from "../components/ui/StateMessage";
import { getUserProfile, updateUserProfile } from "../services/parchePlanService";
import type { UserProfile } from "../types";

type Props = {
  currentUser: UserProfile;
  onProfileUpdated: (user: UserProfile) => void;
};

export default function ProfilePage({ currentUser, onProfileUpdated }: Props) {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarLoadError, setAvatarLoadError] = useState<boolean>(false);

  const [fullName, setFullName] = useState<string>("");
  const [universityIdentifier, setUniversityIdentifier] = useState<string>("");
  const [major, setMajor] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  const avatarPreview = avatarUrl.trim() || currentUser.avatarUrl || "";

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const profile = await getUserProfile(currentUser.id);
      setFullName(profile.fullName);
      setUniversityIdentifier(profile.universityIdentifier);
      setMajor(profile.major);
      setAvatarUrl(profile.avatarUrl ?? "");
      setAvatarLoadError(false);
      onProfileUpdated(profile);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unexpected error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id, onProfileUpdated]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError(null);
      const updated = await updateUserProfile(currentUser.id, {
        fullName,
        universityIdentifier,
        major,
        avatarUrl,
      });
      setAvatarLoadError(false);
      onProfileUpdated(updated);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unexpected error";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-6">
        <StateMessage type="loading" title="Loading profile" description="Please wait..." />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-6">
      <Link to="/" className="text-sm text-brand-700 hover:underline">
        Back to dashboard
      </Link>

      <section className="mt-3 rounded-card border border-border bg-surface p-6 shadow-card">
        <h1 className="m-0 text-xl font-semibold text-text">My profile</h1>
        <p className="mt-2 text-sm text-muted">Keep your university profile updated.</p>

        <div className="mt-4 flex items-center gap-3 rounded-btn border border-border p-3">
          {avatarPreview && !avatarLoadError ? (
            <img
              src={avatarPreview}
              alt={fullName || "Avatar preview"}
              className="h-14 w-14 rounded-full border border-border object-cover"
              onError={() => setAvatarLoadError(true)}
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-gray-50 text-sm text-muted">
              No img
            </div>
          )}
          <p className="m-0 text-xs text-muted">Avatar preview</p>
        </div>

        <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
          <label className="flex flex-col gap-2">
            <span className="text-xs text-muted">University email</span>
            <input
              className="rounded-input border border-border bg-gray-50 px-3 py-2 text-sm text-muted"
              type="email"
              value={currentUser.universityEmail}
              disabled
            />
          </label>

          <label className="flex flex-col gap-2">
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
            <span className="text-xs text-muted">University identifier</span>
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
              onChange={(event) => {
                setAvatarLoadError(false);
                setAvatarUrl(event.target.value);
              }}
            />
          </label>

          <div className="mt-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save profile"}
            </Button>
          </div>
        </form>

        {error && (
          <div className="mt-4">
            <StateMessage type="error" title="Profile error" description={error} />
          </div>
        )}
      </section>
    </main>
  );
}
