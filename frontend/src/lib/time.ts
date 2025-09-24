export function formatDateTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(iso: string) {
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const target = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = target - now;
  const diffMinutes = Math.round(diffMs / 60000);

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return formatter.format(diffDays, "day");
  }

  const diffWeeks = Math.round(diffDays / 7);
  return formatter.format(diffWeeks, "week");
}
