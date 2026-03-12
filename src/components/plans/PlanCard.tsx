import { Link } from "react-router-dom";
import type { PlanWithOptions } from "../../types";
import { formatDateTime } from "../../utils/format";
import PlanStateBadge from "./PlanStateBadge";

type Props = {
  item: PlanWithOptions;
};

export default function PlanCard({ item }: Props) {
  return (
    <article className="rounded-card border border-border bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <h4 className="m-0 text-base font-semibold text-text">{item.plan.title}</h4>
        <PlanStateBadge state={item.plan.state} />
      </div>

      <p className="mt-2 text-sm text-muted">{item.plan.description}</p>
      <p className="mt-2 text-xs text-muted">Voting ends: {formatDateTime(item.plan.votingEndAt)}</p>

      <div className="mt-3 flex flex-col gap-2 text-xs text-muted">
        {item.options.map((option) => (
          <span key={option.id}>
            {option.ordinal}. {option.place} - {formatDateTime(option.time)}
          </span>
        ))}
      </div>

      <div className="mt-4">
        <Link className="text-sm font-semibold text-brand-700 hover:underline" to={`/plans/${item.plan.id}`}>
          Open plan
        </Link>
      </div>
    </article>
  );
}
