const joinedFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatJoined(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : joinedFormat.format(date);
}
