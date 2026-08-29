/**
 * Group the open days into months the calendar can draw.
 *
 * Built from the diary rather than from today's date, so a month with nothing
 * in it never appears and the arrows never walk into empty space. Weeks start
 * on Monday, as they do everywhere else on the site.
 */
export type Cell = { iso: string; day: number; free: boolean } | null;
export type Month = { key: string; label: string; cells: Cell[] };

export function monthsFor(open: string[]): Month[] {
  if (open.length === 0) return [];
  const free = new Set(open);
  const sorted = [...open].sort();
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;

  const months: Month[] = [];
  let y = Number(first.slice(0, 4));
  let m = Number(first.slice(5, 7));
  const endY = Number(last.slice(0, 4));
  const endM = Number(last.slice(5, 7));

  while (y < endY || (y === endY && m <= endM)) {
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    /* getUTCDay is Sunday-first; shift so Monday is column one. */
    const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
    const cells: Cell[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= days; d += 1) {
      const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ iso, day: d, free: free.has(iso) });
    }
    months.push({
      key: `${y}-${m}`,
      label: new Intl.DateTimeFormat("en-GB", {
        month: "long",
        year: "numeric",
        timeZone: "Europe/London",
      }).format(new Date(Date.UTC(y, m - 1, 1))),
      cells,
    });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}
