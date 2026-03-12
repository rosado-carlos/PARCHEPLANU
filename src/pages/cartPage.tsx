import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import MemberList from "../components/parches/MemberList";
import PlanCard from "../components/plans/PlanCard";
import Button from "../components/ui/Button";
import StateMessage from "../components/ui/StateMessage";
import {
  createPlan,
  getInviteLink,
  getParcheActivity,
  getParcheDetails,
  getParcheMembers,
  getParcheRanking,
  getPlansByParche,
  updateMemberRole,
} from "../services/parchePlanService";
import { formatDateTime } from "../utils/format";
import type { ParcheRole, PlanWithOptions, UserProfile } from "../types";

type Props = {
  currentUser: UserProfile;
};

type PlanOptionInput = {
  place: string;
  time: string;
};

export default function CartPage({ currentUser }: Props) {
  const { id } = useParams();
  const parcheId = Number(id);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [parcheName, setParcheName] = useState<string>("");
  const [parcheDescription, setParcheDescription] = useState<string>("");
  const [inviteCode, setInviteCode] = useState<string>("");
  const [role, setRole] = useState<ParcheRole>("MEMBER");

  const [members, setMembers] = useState<Array<{ user: UserProfile; role: ParcheRole }>>([]);
  const [plans, setPlans] = useState<PlanWithOptions[]>([]);
  const [ranking, setRanking] = useState<Array<{ name: string; organizer: number; ghost: number }>>([]);
  const [activity, setActivity] = useState<Array<{ id: number; text: string; createdAt: string }>>([]);

  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [dateWindowStart, setDateWindowStart] = useState<string>("");
  const [dateWindowEnd, setDateWindowEnd] = useState<string>("");
  const [votingEndAt, setVotingEndAt] = useState<string>("");
  const [options, setOptions] = useState<PlanOptionInput[]>([
    { place: "", time: "" },
    { place: "", time: "" },
    { place: "", time: "" },
  ]);

  const canModerate = role === "OWNER" || role === "MODERATOR";
  const canManageRoles = role === "OWNER";
  const inviteLink = inviteCode ? getInviteLink(inviteCode) : "";

  const loadParcheData = useCallback(async () => {
    if (!Number.isFinite(parcheId)) {
      setError("Invalid parche id");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [details, memberRows, plansRows, rankingRows, activityRows] = await Promise.all([
        getParcheDetails(currentUser.id, parcheId),
        getParcheMembers(currentUser.id, parcheId),
        getPlansByParche(currentUser.id, parcheId),
        getParcheRanking(currentUser.id, parcheId),
        getParcheActivity(currentUser.id, parcheId),
      ]);

      setParcheName(details.parche.name);
      setParcheDescription(details.parche.description);
      setInviteCode(details.parche.inviteCode);
      setRole(details.role);

      setMembers(memberRows);
      setPlans(plansRows);
      setRanking(
        rankingRows.map((row) => ({
          name: row.user.fullName,
          organizer: row.organizerScore,
          ghost: row.ghostScore,
        })),
      );
      setActivity(
        activityRows.map((row) => ({
          id: row.event.id,
          text: `${row.user.fullName}: ${row.event.eventType}`,
          createdAt: row.event.createdAt,
        })),
      );
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unexpected error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id, parcheId]);

  async function onRoleChange(userId: number, nextRole: ParcheRole) {
    try {
      await updateMemberRole(currentUser.id, parcheId, userId, nextRole);
      await loadParcheData();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unexpected error";
      setError(message);
    }
  }

  function onOptionChange(index: number, key: "place" | "time", value: string) {
    setOptions((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
  }

  function addOption() {
    setOptions((prev) => [...prev, { place: "", time: "" }]);
  }

  async function onCreatePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setError(null);
      await createPlan(currentUser.id, parcheId, {
        title,
        description,
        dateWindowStart: new Date(dateWindowStart).toISOString(),
        dateWindowEnd: new Date(dateWindowEnd).toISOString(),
        votingEndAt: new Date(votingEndAt).toISOString(),
        options: options
          .filter((item) => item.place.trim() && item.time)
          .map((item) => ({
            place: item.place,
            time: new Date(item.time).toISOString(),
          })),
      });

      setTitle("");
      setDescription("");
      setDateWindowStart("");
      setDateWindowEnd("");
      setVotingEndAt("");
      setOptions([
        { place: "", time: "" },
        { place: "", time: "" },
        { place: "", time: "" },
      ]);

      await loadParcheData();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unexpected error";
      setError(message);
    }
  }

  const orderedPlans = useMemo(() => {
    return [...plans].sort((a, b) => b.plan.id - a.plan.id);
  }, [plans]);

  useEffect(() => {
    void loadParcheData();
  }, [loadParcheData]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-6">
        <StateMessage type="loading" title="Loading parche" description="Fetching members, plans and ranking..." />
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-6">
        <StateMessage
          type="error"
          title="Cannot load parche"
          description={error}
          actionText="Try again"
          onAction={loadParcheData}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <Link to="/" className="text-sm text-brand-700 hover:underline">
        Back to parches
      </Link>

      <section className="mt-3 rounded-card border border-border bg-surface p-5 shadow-card">
        <h1 className="m-0 text-2xl font-semibold text-text">{parcheName}</h1>
        <p className="mt-2 text-sm text-muted">{parcheDescription}</p>
        <p className="mt-2 text-xs text-muted">Invite code: {inviteCode}</p>
        <p className="mt-1 break-all text-xs text-muted">Invite link: {inviteLink}</p>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr,1fr]">
        <div className="flex flex-col gap-4">
          <section className="rounded-card border border-border bg-surface p-4 shadow-card">
            <h3 className="m-0 text-base font-semibold text-text">Plans</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {orderedPlans.map((item) => (
                <PlanCard key={item.plan.id} item={item} />
              ))}
            </div>
          </section>

          <section className="rounded-card border border-border bg-surface p-4 shadow-card">
            <h3 className="m-0 text-base font-semibold text-text">Create Plan</h3>
            <form className="mt-3 flex flex-col gap-3" onSubmit={onCreatePlan}>
              <input
                className="rounded-input border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="Plan title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
              <textarea
                className="rounded-input border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="Plan description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
              />

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1 text-xs text-muted">
                  Window start
                  <input
                    className="rounded-input border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
                    type="datetime-local"
                    value={dateWindowStart}
                    onChange={(event) => setDateWindowStart(event.target.value)}
                    required
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs text-muted">
                  Window end
                  <input
                    className="rounded-input border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
                    type="datetime-local"
                    value={dateWindowEnd}
                    onChange={(event) => setDateWindowEnd(event.target.value)}
                    required
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs text-muted">
                  Voting end
                  <input
                    className="rounded-input border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
                    type="datetime-local"
                    value={votingEndAt}
                    onChange={(event) => setVotingEndAt(event.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="flex flex-col gap-2">
                {options.map((option, index) => (
                  <div key={`option-${index}`} className="grid gap-2 sm:grid-cols-2">
                    <input
                      className="rounded-input border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
                      placeholder={`Place option ${index + 1}`}
                      value={option.place}
                      onChange={(event) => onOptionChange(index, "place", event.target.value)}
                      required={index < 3}
                    />
                    <input
                      className="rounded-input border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-300"
                      type="datetime-local"
                      value={option.time}
                      onChange={(event) => onOptionChange(index, "time", event.target.value)}
                      required={index < 3}
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={addOption}>
                  Add option
                </Button>
                <Button type="submit">Save draft plan</Button>
              </div>
            </form>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <MemberList members={members} canManageRoles={canManageRoles} onRoleChange={onRoleChange} />

          <section className="rounded-card border border-border bg-surface p-4 shadow-card">
            <h3 className="m-0 text-base font-semibold text-text">Ranking</h3>
            <div className="mt-3 flex flex-col gap-2">
              {ranking.map((row) => (
                <div key={row.name} className="rounded-btn border border-border p-3 text-sm">
                  <p className="m-0 font-semibold text-text">{row.name}</p>
                  <p className="mt-1 text-xs text-muted">Organizer: {row.organizer} - Ghost: {row.ghost}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-card border border-border bg-surface p-4 shadow-card">
            <h3 className="m-0 text-base font-semibold text-text">Activity</h3>
            <div className="mt-3 flex flex-col gap-2">
              {activity.map((item) => (
                <p key={item.id} className="m-0 text-xs text-muted">
                  {item.text} - {formatDateTime(item.createdAt)}
                </p>
              ))}
              {activity.length === 0 && <p className="m-0 text-xs text-muted">No activity yet.</p>}
            </div>
          </section>

          {canModerate && (
            <p className="text-xs text-muted">You can move plan states from Draft to Scheduled in each plan detail.</p>
          )}
        </div>
      </div>
    </main>
  );
}
