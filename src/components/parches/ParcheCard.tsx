import { Link } from "react-router-dom";
import type { ParcheSummary } from "../../types";
import Button from "../ui/Button";

type Props = {
  item: ParcheSummary;
};

export default function ParcheCard({ item }: Props) {
  return (
    <article className="rounded-card border border-border bg-surface p-4 shadow-card">
      <img
        src={item.parche.coverImageUrl}
        alt={item.parche.name}
        className="h-32 w-full rounded-btn object-cover"
      />
      <div className="mt-3">
        <h2 className="m-0 text-lg font-semibold text-text">{item.parche.name}</h2>
        <p className="mt-2 text-sm text-muted">{item.parche.description}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
        <span>Role: {item.role}</span>
        <span>Members: {item.membersCount}</span>
        <span>Plans: {item.plansCount}</span>
        <span className="truncate">Code: {item.parche.inviteCode}</span>
      </div>

      <div className="mt-4">
        <Link to={`/parches/${item.parche.id}`}>
          <Button variant="primary">Open parche</Button>
        </Link>
      </div>
    </article>
  );
}
