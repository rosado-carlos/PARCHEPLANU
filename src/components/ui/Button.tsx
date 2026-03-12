import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
};

export default function Button({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  type = "button",
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-btn border px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-50";

  const variants = {
    primary: "border-brand-700 bg-brand-600 text-white hover:bg-brand-700",
    secondary: "border-border bg-surface text-text hover:bg-gray-50",
    danger: "border-red-200 bg-surface text-danger-600 hover:bg-red-50",
  };

  return (
    <button type={type} className={`${base} ${variants[variant]}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
