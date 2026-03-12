import { FiAlertTriangle, FiInbox, FiLoader } from "react-icons/fi";
import Button from "./Button";

type Props = {
  title: string;
  description?: string;
  type: "loading" | "error" | "empty";
  actionText?: string;
  onAction?: () => void;
};

export default function StateMessage({ title, description, type, actionText, onAction }: Props) {
  const Icon = type === "loading" ? FiLoader : type === "error" ? FiAlertTriangle : FiInbox;

  return (
    <div className="rounded-card border border-dashed border-border bg-surface p-6 text-center shadow-card">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-muted">
        <Icon className={type === "loading" ? "animate-spin" : ""} />
      </div>

      <h2 className="m-0 text-base font-semibold text-text">{title}</h2>
      {description && <p className="mt-2 text-sm text-muted">{description}</p>}

      {actionText && onAction && (
        <div className="mt-4">
          <Button variant="secondary" onClick={onAction}>
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
}
