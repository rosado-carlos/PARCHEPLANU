import type { VoteResultRow } from "../../types";
import { formatDateTime } from "../../utils/format";

type Props = {
  rows: VoteResultRow[];
  totalVotes: number;
  selectedOptionId: number | null;
  onVote: (optionId: number) => void;
  canVote: boolean;
};

export default function VoteResults({ rows, totalVotes, selectedOptionId, onVote, canVote }: Props) {
  return (
    <section className="rounded-card border border-border bg-surface p-4 shadow-card">
      <h3 className="m-0 text-base font-semibold text-text">Voting</h3>
      <p className="mt-2 text-sm text-muted">Total votes: {totalVotes}</p>

      <div className="mt-3 flex flex-col gap-3">
        {rows.map((row) => {
          const isSelected = row.option.id === selectedOptionId;
          return (
            <div key={row.option.id} className="rounded-btn border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="m-0 text-sm font-semibold text-text">
                  {row.option.place} {isSelected ? "(Your vote)" : ""}
                </p>
                {canVote && (
                  <button
                    type="button"
                    className="rounded-full border border-brand-300 px-2 py-1 text-xs text-brand-700 hover:bg-brand-50"
                    onClick={() => onVote(row.option.id)}
                  >
                    Vote
                  </button>
                )}
              </div>

              <p className="mt-1 text-xs text-muted">{formatDateTime(row.option.time)}</p>
              <p className="mt-2 text-xs text-muted">
                {row.votes} votes ({row.percentage}%)
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
