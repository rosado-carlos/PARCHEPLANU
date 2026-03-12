import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PlanStateBadge from "../components/plans/PlanStateBadge";
import VoteResults from "../components/plans/VoteResults";
import Button from "../components/ui/Button";
import StateMessage from "../components/ui/StateMessage";
import {
  advancePlanState,
  castVote,
  checkIn,
  getAttendance,
  getPlanDetail,
  getVoteSummary,
  hasUserCheckedIn,
  setAttendance,
} from "../services/parchePlanService";
import { formatDateTime, formatRelativeWindow } from "../utils/format";
import type { AttendanceStatus, PlanState, UserProfile } from "../types";

type Props = {
  currentUser: UserProfile;
};

const ATTENDANCE_OPTIONS: AttendanceStatus[] = ["YES", "NO", "MAYBE"];

export default function ConcertDetails({ currentUser }: Props) {
  const { id } = useParams();
  const planId = Number(id);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [state, setState] = useState<PlanState>("DRAFT");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [votingEndAt, setVotingEndAt] = useState<string>("");
  const [checkInOpenAt, setCheckInOpenAt] = useState<string | null>(null);
  const [checkInCloseAt, setCheckInCloseAt] = useState<string | null>(null);
  const [role, setRole] = useState<"OWNER" | "MODERATOR" | "MEMBER">("MEMBER");

  const [rows, setRows] = useState<Awaited<ReturnType<typeof getVoteSummary>>["rows"]>([]);
  const [totalVotes, setTotalVotes] = useState<number>(0);
  const [myVoteOptionId, setMyVoteOptionId] = useState<number | null>(null);

  const [attendanceRows, setAttendanceRows] = useState<Awaited<ReturnType<typeof getAttendance>>>([]);
  const [myAttendance, setMyAttendance] = useState<AttendanceStatus | null>(null);
  const [hasCheckedIn, setHasCheckedInState] = useState<boolean>(false);

  const [winningOptionText, setWinningOptionText] = useState<string>("");

  const canModerate = role === "OWNER" || role === "MODERATOR";
  const canVote = state === "VOTING_OPEN";
  const canCheckIn = state === "SCHEDULED";

  function nextStateLabel(current: PlanState): string {
    if (current === "DRAFT") return "Open voting";
    if (current === "VOTING_OPEN") return "Close voting";
    if (current === "VOTING_CLOSED") return "Schedule plan";
    return "Final state";
  }

  const loadPlanData = useCallback(
    async (silent = false) => {
      if (!Number.isFinite(planId)) {
        if (!silent) {
          setLoading(false);
          setError("Invalid plan id");
        }
        return;
      }

      try {
        if (!silent) {
          setLoading(true);
          setError(null);
        }

        const [detail, voteSummary, attendanceSummary, checkedIn] = await Promise.all([
          getPlanDetail(currentUser.id, planId),
          getVoteSummary(currentUser.id, planId),
          getAttendance(currentUser.id, planId),
          hasUserCheckedIn(currentUser.id, planId),
        ]);

        setTitle(detail.plan.title);
        setDescription(detail.plan.description);
        setState(detail.plan.state);
        setVotingEndAt(detail.plan.votingEndAt);
        setCheckInOpenAt(detail.plan.checkInOpenAt);
        setCheckInCloseAt(detail.plan.checkInCloseAt);
        setRole(detail.role);

        setRows(voteSummary.rows);
        setTotalVotes(voteSummary.totalVotes);
        setMyVoteOptionId(voteSummary.myVoteOptionId);

        setAttendanceRows(attendanceSummary);
        const myRow = attendanceSummary.find((item) => item.user.id === currentUser.id);
        setMyAttendance(myRow ? myRow.status : null);
        setHasCheckedInState(checkedIn);

        const winner = detail.options.find((option) => option.id === detail.plan.winningOptionId);
        setWinningOptionText(winner ? `${winner.place} - ${formatDateTime(winner.time)}` : "Not computed yet");
      } catch (requestError) {
        if (!silent) {
          const message = requestError instanceof Error ? requestError.message : "Unexpected error";
          setError(message);
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [currentUser.id, planId],
  );

  async function onVote(optionId: number) {
    try {
      setError(null);
      await castVote(currentUser.id, planId, optionId);
      await loadPlanData(true);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unexpected error";
      setError(message);
    }
  }

  async function onAttendance(status: AttendanceStatus) {
    try {
      setError(null);
      await setAttendance(currentUser.id, planId, status);
      await loadPlanData(true);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unexpected error";
      setError(message);
    }
  }

  async function onAdvanceState() {
    try {
      setError(null);
      await advancePlanState(currentUser.id, planId);
      await loadPlanData(true);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unexpected error";
      setError(message);
    }
  }

  async function onCheckIn() {
    try {
      setError(null);
      await checkIn(currentUser.id, planId);
      await loadPlanData(true);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unexpected error";
      setError(message);
    }
  }

  const attendanceByStatus = useMemo(() => {
    return {
      YES: attendanceRows.filter((item) => item.status === "YES").length,
      NO: attendanceRows.filter((item) => item.status === "NO").length,
      MAYBE: attendanceRows.filter((item) => item.status === "MAYBE").length,
    };
  }, [attendanceRows]);

  useEffect(() => {
    void loadPlanData(false);
  }, [loadPlanData]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadPlanData(true);
    }, 10000);

    return () => window.clearInterval(timer);
  }, [loadPlanData]);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-6">
        <StateMessage type="loading" title="Loading plan" description="Fetching votes and attendance..." />
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-6">
        <StateMessage
          type="error"
          title="Cannot load plan"
          description={error}
          actionText="Try again"
          onAction={() => {
            void loadPlanData(false);
          }}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-6">
      <Link to="/" className="text-sm text-brand-700 hover:underline">
        Back to parches
      </Link>

      <section className="mt-3 rounded-card border border-border bg-surface p-5 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-2xl font-semibold text-text">{title}</h1>
            <p className="mt-2 text-sm text-muted">{description}</p>
          </div>
          <PlanStateBadge state={state} />
        </div>

        <p className="mt-3 text-xs text-muted">Voting ends: {formatDateTime(votingEndAt)}</p>
        <p className="mt-1 text-xs text-muted">Check-in window: {formatRelativeWindow(checkInOpenAt, checkInCloseAt)}</p>

        <p className="mt-2 text-xs text-muted">Winner: {winningOptionText}</p>

        {canModerate && state !== "SCHEDULED" && (
          <div className="mt-3">
            <Button variant="secondary" onClick={onAdvanceState}>
              {nextStateLabel(state)}
            </Button>
          </div>
        )}
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr,1fr]">
        <VoteResults
          rows={rows}
          totalVotes={totalVotes}
          selectedOptionId={myVoteOptionId}
          onVote={onVote}
          canVote={canVote}
        />

        <section className="rounded-card border border-border bg-surface p-4 shadow-card">
          <h3 className="m-0 text-base font-semibold text-text">Attendance</h3>
          <p className="mt-2 text-xs text-muted">
            Yes: {attendanceByStatus.YES} - No: {attendanceByStatus.NO} - Maybe: {attendanceByStatus.MAYBE}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {ATTENDANCE_OPTIONS.map((status) => (
              <Button
                key={status}
                variant={myAttendance === status ? "primary" : "secondary"}
                onClick={() => onAttendance(status)}
              >
                {status}
              </Button>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {attendanceRows.map((item) => (
              <p key={item.user.id} className="m-0 text-xs text-muted">
                {item.user.fullName}: {item.status}
              </p>
            ))}
            {attendanceRows.length === 0 && <p className="m-0 text-xs text-muted">No attendance responses yet.</p>}
          </div>

          {canCheckIn && (
            <div className="mt-4">
              <Button variant={hasCheckedIn ? "secondary" : "primary"} onClick={onCheckIn} disabled={hasCheckedIn}>
                {hasCheckedIn ? "Already checked-in" : "Check-in"}
              </Button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
