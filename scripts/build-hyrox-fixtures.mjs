/**
 * Builds the parser fixtures in tests/fixtures/hyrox/.
 *
 * The *markup* is reproduced from a real results.hyrox.com response, tag for
 * tag and class for class, including the details that break naive parsers:
 *
 * - data rows carry `type-*` classes and **no** `field-*` classes (only the
 *   header has those);
 * - the name sits in an `<h4>`, not a `<div>`, formatted `Surname, Firstname`;
 * - the stable per-entry id is in the detail link's `idp`, HTML-escaped, so the
 *   character before it is `;` rather than `&`;
 * - nationality is inside a `nation__abbr` span next to an `<img alt="ITA">`;
 * - each field nests a responsive `list-label` div carrying the column heading;
 * - a missing time renders as `<span class="text-muted">&ndash;</span>`.
 *
 * The *people* are invented. Real rows are third-party personal data, and
 * committing a sample creates a permanent replicated copy in git to test a
 * regex. `scripts/capture-hyrox-fixture.mjs` records genuine samples into a
 * gitignored directory when you want to check against reality.
 *
 *   node scripts/build-hyrox-fixtures.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "tests", "fixtures", "hyrox");
mkdirSync(OUT, { recursive: true });

const EVENT = "H_LR3MS4JI163A";

/** The header row. This is the only row carrying `field-*` classes. */
const HEADER = `<li class="right  list-group row list-group-item  list-group-header ">
<div class="col-xs-12 col-sm-12 col-md-5 list-field-wrap">
  <div class="row">
  <div class=" list-field type-place field-place_all place-primary" style="width: 60px">Rank</div>
  <div class=" list-field type-place field-place_age place-secondary hidden-xs" style="width: 60px">Rank</div>
  <div class=" list-field type-fullname field-__fullname">Name</div>
  </div>
</div>
<div class="col-xs-12 col-sm-12 col-md-7  hidden-xs hidden-sm list-field-wrap">
<div class="pull-left">
  <div class="row">
  <div class=" list-field type-nation_flag field-__nation" style="width: 70px"><div class="visible-xs-block visible-sm-block list-label">Nat</div>Nat</div>
  <div class=" list-field type-age_class field-_type_age_class" style="width: auto"><div class="visible-xs-block visible-sm-block list-label">Age Group</div>Age Group</div>
  </div>
</div>
<div class="pull-right">
  <div class="row">
  <div class=" list-field type-actual_ranking_time field-__time" style="width: 130px"><div class="visible-xs-block visible-sm-block list-label">Time</div>Time</div>
  <div class="right list-field type-time field-time_finish_netto" style="width: 70px"><div class="visible-xs-block visible-sm-block list-label">Total</div>Total</div>
  </div>
</div>
</div>
</li>`;

/** A data row, in the real shape. */
function row({ place, placeAge, name, nation, ageGroup, time, idp }) {
  const total =
    time === null
      ? `<span class="text-muted">&ndash;</span>`
      : time;
  return `<li class=" list-active list-group-item row">
<div class="col-xs-12 col-sm-12 col-md-5 list-field-wrap">
  <div class="row">
  <div class=" list-field type-place place-primary numeric" style="width: 60px">${place}</div>
  <div class=" list-field type-place place-secondary hidden-xs numeric" style="width: 60px">${placeAge}</div>
  <h4 class=" list-field type-fullname"><a href="?content=detail&amp;fpid=list&amp;pid=list&amp;idp=${idp}&amp;lang=EN_CAP&amp;event=${EVENT}&amp;num_results=100">${name}</a></h4>
  </div>
</div>
<div class="col-xs-12 col-sm-12 col-md-7 list-field-wrap">
<div class="pull-left">
  <div class="row">
  <div class=" list-field type-nation_flag" style="width: 70px"><div class="visible-xs-block visible-sm-block list-label">Nat</div><span class="nation__labelled-icon">
                            <img style="width:20px" src="//assets.mikatiming.com/img/mt/results/dark/flags/${nation}.svg" class="nation__icon" alt="${nation}" title="${nation}"/>
                            <span class="nation__abbr">${nation}</span>
                        </span></div>
  <div class=" list-field type-age_class" style="width: auto"><div class="visible-xs-block visible-sm-block list-label">Age Group</div>${ageGroup}</div>
  </div>
</div>
<div class="pull-right">
  <div class="row">
  <div class=" list-field type-actual_ranking_time" style="width: 130px"><div class="visible-xs-block visible-sm-block list-label">Time</div><span class="text-muted">&ndash;</span></div>
  <div class="right list-field type-time" style="width: 70px"><div class="visible-xs-block visible-sm-block list-label">Total</div>${total}</div>
  </div>
</div>
</div>
</li>`;
}

function page(rows, published, sex = "M") {
  return `<!-- SYNTHETIC IDENTITIES, REAL STRUCTURE. See scripts/build-hyrox-fixtures.mjs. -->
<!DOCTYPE html><html><body>
<ul class="list-group list-info row-xs">
<li class="list-group-item"><span class="list-info__text str_num">${published} Results</span> | <span class="list-info__text officiality">Unofficial Results</span> | <span class="list-info__filter sex">${sex === "M" ? "Men" : "Women"}</span>
</li>
</ul>
<div class='col-sm-12 row-xs' data-sex='${sex}'>
<ul class="list-group list-group-multicolumn">
${HEADER}
${rows.join("\n")}
</ul>
</div>
</body></html>
`;
}

// Invented people. Names are stored surname-first, exactly as mika prints them.
const FIELD = [
  { name: "Fenwick, Alaric", nation: "GBR", ageGroup: "30-34", idp: "LRAA0000001", time: "01:02:41" },
  { name: "Oosterhuis, Bram", nation: "NED", ageGroup: "35-39", idp: "LRAA0000002", time: "01:04:07" },
  { name: "Marlowe, Caius", nation: "GBR", ageGroup: "25-29", idp: "LRAA0000003", time: "01:05:52" },
  { name: "Volkov-Reyes, Dmitri", nation: "ESP", ageGroup: "40-44", idp: "LRAA0000004", time: "01:07:19" },
  { name: "Kilbride, Eamon", nation: "IRL", ageGroup: "30-34", idp: "LRAA0000005", time: "01:09:03" },
  { name: "Anwar, Faisal", nation: "IND", ageGroup: "35-39", idp: "LRAA0000006", time: "01:11:44" },
  { name: "Lindqvist, Gustav", nation: "SWE", ageGroup: "45-49", idp: "LRAA0000007", time: "01:14:26" },
  { name: "Rowntree, Hamish", nation: "ENG", ageGroup: "50-54", idp: "LRAA0000008", time: "01:18:02" },
];

/** `order` is the finishing order; ids stay with the person, not the position. */
function build(order) {
  return order.map((idx, i) =>
    row({ place: String(i + 1), placeAge: String(1 + Math.floor(i / 3)), ...FIELD[idx] }),
  );
}

// Snapshot 1 — the board mid-race.
writeFileSync(join(OUT, "list-rows.html"), page(build([0, 1, 2, 3, 4, 5, 6, 7]), 8));

// Snapshot 2 — the top two swap and one time is corrected. The live differ must
// write exactly the rows that changed and no others, and the ids must not move
// with the positions.
writeFileSync(
  join(OUT, "list-rows-2.html"),
  // replaceAll, not replace: a corrected time has to change everywhere the row
  // prints it, or the "corrected" row is not actually different.
  page(build([1, 0, 2, 3, 4, 5, 6, 7]), 8).replaceAll("01:11:44", "01:11:38"),
);

// The board says 8, serves 3: the completeness checksum must flag it.
writeFileSync(join(OUT, "list-rows-short.html"), page(build([0, 1, 2]), 8));

// A shape change: the source renames the name and time columns. The sentinel
// must call this "parser may be broken" rather than quietly quarantine.
writeFileSync(
  join(OUT, "list-rows-renamed.html"),
  page(build([0, 1, 2, 3]), 4)
    .replace(/type-fullname/g, "type-competitorname")
    .replace(/field-__fullname/g, "field-__competitorname")
    .replace(/type-time\b/g, "type-total_net")
    .replace(/field-time_finish_netto/g, "field-time_total_net"),
);

// Implausible rows: a 12-second race and a 15-hour one.
writeFileSync(
  join(OUT, "list-rows-implausible.html"),
  page(
    [
      row({ place: "1", placeAge: "1", name: "Quennell, Ivor", nation: "GBR", ageGroup: "30-34", idp: "LRAA0000101", time: "00:00:12" }),
      row({ place: "2", placeAge: "1", name: "Pemberton, Jocasta", nation: "GBR", ageGroup: "30-34", idp: "LRAA0000102", time: "14:59:59" }),
    ],
    2,
  ),
);

// A DNF: no time at all, which is normal and must not be quarantined.
writeFileSync(
  join(OUT, "list-rows-dnf.html"),
  page(
    [
      row({ place: "1", placeAge: "1", name: "Fenwick, Alaric", nation: "GBR", ageGroup: "30-34", idp: "LRAA0000001", time: "01:02:41" }),
      row({ place: "—", placeAge: "—", name: "Sorrell, Kit", nation: "GBR", ageGroup: "30-34", idp: "LRAA0000201", time: null }),
    ],
    2,
  ),
);

// Doubles: one row per team, both names in the name field.
writeFileSync(
  join(OUT, "list-rows-doubles.html"),
  page(
    [
      row({ place: "1", placeAge: "1", name: "Alaric Fenwick / Caius Marlowe", nation: "GBR", ageGroup: "30-34", idp: "LRAA0000301", time: "00:58:14" }),
      row({ place: "2", placeAge: "2", name: "Bram Oosterhuis / Gustav Lindqvist", nation: "NED", ageGroup: "35-39", idp: "LRAA0000302", time: "01:01:37" }),
    ],
    2,
  ),
);

// The unfiltered board: it refuses to render and says so.
writeFileSync(
  join(OUT, "list-empty.html"),
  `<!-- SYNTHETIC. The unfiltered board declines to render a large set. -->
<!DOCTYPE html><html><body>
<ul class="list-group list-info row-xs">
<li class="list-group-item"><span class="list-info__text str_num">&gt; 200 Results</span> | <span class="list-info__text officiality">Unofficial Results</span></li>
</ul>
<div class='col-sm-12 row-xs' data-sex=''>
<ul class="list-group list-group-multicolumn">
${HEADER}
</ul>
</div>
</body></html>
`,
);

// The per-result detail view: eight runs, eight stations, Roxzone.
const STATIONS = [
  ["1000m SkiErg", "04:12"], ["50m Sled Push", "02:48"], ["50m Sled Pull", "03:31"],
  ["80m Burpee Broad Jump", "04:55"], ["1000m Row", "04:38"], ["200m Farmers Carry", "02:07"],
  ["100m Sandbag Lunges", "04:41"], ["Wall Balls", "05:26"],
];
// Labelled exactly as the real detail view labels them: stations carry their
// distance, the Roxzone row is "Roxzone Time", and the table also contains the
// summary and timing-mat rows that a loose parser turns into extra runs.
const detailRows = [
  `<tr><th class="desc">Bib Number</th><td>163522</td></tr>`,
  // Consistent with the leader's time on the list fixtures (01:02:41), so the
  // splits reconcile with the finish and the validator passes. A fixture whose
  // splits cannot sum to its own finish tests the quarantine path, not the
  // happy one.
  `<tr><th class="desc">Overall Time</th><td class="f-time_finish_netto">01:02:41</td></tr>`,
];
for (let i = 0; i < 8; i += 1) {
  detailRows.push(`<tr class=" f-time_0${i + 1}">
<th class="desc">Running ${i + 1}</th>
<td class="f-time_0${i + 1}">00:03:${String(0 + i).padStart(2, "0")}</td>
<td class=" last"><span class="text-muted">&ndash;</span></td>
</tr>`);
  detailRows.push(`<tr class=" f-station_0${i + 1}">
<th class="desc">${STATIONS[i][0]}</th>
<td class="f-station_0${i + 1}">00:${STATIONS[i][1]}</td>
<td class=" last">${i + 3}</td>
</tr>`);
}
detailRows.push(`<tr><th class="desc">Roxzone Time</th><td>00:06:14</td><td class="last">1</td></tr>`);
// The traps: summary rows and timing-mat rows. "Run Total" must not become a
// ninth run, and "1000m SkiErg In" must not become a second SkiErg split.
detailRows.push(`<tr><th class="desc">Run Total</th><td>00:24:28</td><td class="last">4</td></tr>`);
detailRows.push(`<tr><th class="desc">Best Run Lap</th><td>00:03:00</td><td class="last">13</td></tr>`);
detailRows.push(`<tr><th class="desc">Rox In</th><td>16:37:49</td><td>00:02:48</td></tr>`);
detailRows.push(`<tr><th class="desc">1000m SkiErg In</th><td>16:38:04</td><td>00:03:03</td></tr>`);
detailRows.push(`<tr><th class="desc">1000m SkiErg Out</th><td>16:42:15</td><td>00:07:13</td></tr>`);
writeFileSync(
  join(OUT, "detail-splits.html"),
  `<!-- SYNTHETIC IDENTITIES, REAL STRUCTURE. -->
<!DOCTYPE html><html><body><table class="table-condensed">
${detailRows.join("\n")}
</table></body></html>
`,
);

console.log("✓ hyrox fixtures written to tests/fixtures/hyrox");
