export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatRelativeWindow(start: string | null, end: string | null): string {
  if (!start || !end) return "Not configured";
  return `${formatDateTime(start)} - ${formatDateTime(end)}`;
}
