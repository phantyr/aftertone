const releaseDate = new Intl.DateTimeFormat("en", {
  day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
});

export function formatReleaseDate(date) {
  return releaseDate.format(new Date(`${date}T00:00:00Z`));
}
