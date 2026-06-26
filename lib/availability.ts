export const sampleBlockedDates = ["2026-06-13", "2026-06-20", "2026-09-05"];
export const samplePendingRequestDates = ["2026-07-18", "2026-10-10"];

export function dateLabel(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export function isDateBlocked(date: string, blockedDates: string[] = []) {
  return blockedDates.includes(date);
}
