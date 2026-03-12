import type { PlanState } from "../../types";

type Props = {
  state: PlanState;
};

export default function PlanStateBadge({ state }: Props) {
  const classes =
    state === "DRAFT"
      ? "border-border bg-white text-muted"
      : state === "VOTING_OPEN"
        ? "border-brand-200 bg-brand-50 text-brand-700"
        : state === "VOTING_CLOSED"
          ? "border-warning-600/30 bg-amber-50 text-warning-600"
          : "border-green-200 bg-green-50 text-success-600";

  return <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${classes}`}>{state}</span>;
}
