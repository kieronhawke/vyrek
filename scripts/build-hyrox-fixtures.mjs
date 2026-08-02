/**
 * Builds the parser fixtures in tests/fixtures/hyrox/.
 *
 * The *markup* is reproduced field for field and class for class from a real
 * results.hyrox.com response (see docs/results/SOURCE.md §5). The *people* are
 * invented.
 *
 * Why not just save a real page: real rows are third-party personal data —
 * names, nationalities, age groups — belonging to people who never agreed to be
 * in our repository. Committing a sample creates a permanent replicated copy
 * with no lawful basis and no erasure path, to test a regex. The structure is
 * what the parser cares about, and the structure is real.
 *
 * `scripts/capture-hyrox-fixture.mjs` records genuine samples the moment access
 * is authorised; these tests then run against those unchanged.
 *
 *   node scripts/build-hyrox-fixtures.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "tests", "fixtures", "hyrox");
mkdirSync(OUT, { recursive: true });

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

/** One data row, in the same nesting as the header. */
function row({ place, placeAge, name, nation, ageGroup, time, bib }) {
  return `<li class="row list-group-item list-group-item">
<div class="col-xs-12 col-sm-12 col-md-5 list-field-wrap">
  <div class="row">
  <div class=" list-field type-place field-place_all place-primary" style="width: 60px">${place}</div>
  <div class=" list-field type-place field-place_age place-secondary hidden-xs" style="width: 60px">${placeAge}</div>
  <div class=" list-field type-fullname field-__fullname"><a href="?content=detail&amp;idp=${bib}">${name}</a></div>
  <div class=" list-field type-field field-startnumber" style="width: 60px"><div class="visible-xs-block visible-sm-block list-label">Bib</div>${bib}</div>
  </div>
</div>
<div class="col-xs-12 col-sm-12 col-md-7  hidden-xs hidden-sm list-field-wrap">
<div class="pull-left">
  <div class="row">
  <div class=" list-field type-nation_flag field-__nation" style="width: 70px"><div class="visible-xs-block visible-sm-block list-label">Nat</div>${nation}</div>
  <div class=" list-field type-age_class field-_type_age_class" style="width: auto"><div class="visible-xs-block visible-sm-block list-label">Age Group</div>${ageGroup}</div>
  </div>
</div>
<div class="pull-right">
  <div class="row">
  <div class=" list-field type-actual_ranking_time field-__time" style="width: 130px"><div class="visible-xs-block visible-sm-block list-label">Time</div>${time}</div>
  <div class="right list-field type-time field-time_finish_netto" style="width: 70px"><div class="visible-xs-block visible-sm-block list-label">Total</div>${time}</div>
  </div>
</div>
</div>
</li>`;
}

function page(rows, published) {
  return `<!-- SYNTHETIC IDENTITIES, REAL STRUCTURE. See scripts/build-hyrox-fixtures.mjs. -->
<!DOCTYPE html><html><body>
<div class='col-sm-12 row-xs' data-sex='M'>
<ul class="list-group list-info"><li class="list-group-item"><span class="list-info__text str_num">${published} Results</span></li></ul>
<ul class="list-group list-group-multicolumn">
${HEADER}
${rows.join("\n")}
</ul>
</div>
</body></html>
`;
}

// Invented people. Any resemblance is coincidence, which is the point.
const FIELD = [
  { name: "Alaric Fenwick", nation: "GBR", ageGroup: "30-34", bib: "1101", time: "01:02:41" },
  { name: "Bram Oosterhuis", nation: "NED", ageGroup: "35-39", bib: "1102", time: "01:04:07" },
  { name: "Caius Marlowe", nation: "GBR", ageGroup: "25-29", bib: "1103", time: "01:05:52" },
  { name: "Dmitri Volkov-Reyes", nation: "ESP", ageGroup: "40-44", bib: "1104", time: "01:07:19" },
  { name: "Eamon Kilbride", nation: "IRL", ageGroup: "30-34", bib: "1105", time: "01:09:03" },
  { name: "Faisal Anwar", nation: "IND", ageGroup: "35-39", bib: "1106", time: "01:11:44" },
  { name: "Gustav Lindqvist", nation: "SWE", ageGroup: "45-49", bib: "1107", time: "01:14:26" },
  { name: "Hamish Rowntree", nation: "GBR", ageGroup: "50-54", bib: "1108", time: "01:18:02" },
];

function build(order) {
  return order.map((idx, i) =>
    row({
      place: String(i + 1),
      placeAge: String(1 + Math.floor(i / 3)),
      ...FIELD[idx],
    }),
  );
}

// Snapshot 1 — mid-race board.
writeFileSync(join(OUT, "list-rows.html"), page(build([0, 1, 2, 3, 4, 5, 6, 7]), 8));

// Snapshot 2 — two positions swapped and one time corrected. The live differ
// must write exactly the rows that changed, and no others.
const swapped = build([1, 0, 2, 3, 4, 5, 6, 7]);
writeFileSync(
  join(OUT, "list-rows-2.html"),
  // replaceAll, not replace: the row prints the time in both the ranking-time
  // and net-time columns, and correcting only one is not a corrected time.
  page(swapped, 8).replaceAll("01:11:44", "01:11:38"),
);

// A division whose published count exceeds the rows served: the completeness
// checksum must flag this rather than accept a short page.
writeFileSync(join(OUT, "list-rows-short.html"), page(build([0, 1, 2]), 8));

// A batch with the name and time columns renamed: the parser-shape sentinel
// must call this "parser may be broken", not quietly quarantine 8 rows.
writeFileSync(
  join(OUT, "list-rows-renamed.html"),
  page(build([0, 1, 2, 3]), 4)
    .replace(/field-__fullname/g, "field-__competitorname")
    .replace(/field-time_finish_netto/g, "field-time_total_net"),
);

// Implausible row: splits that cannot sum to the finish, and a 12-second race.
writeFileSync(
  join(OUT, "list-rows-implausible.html"),
  page(
    [
      row({ place: "1", placeAge: "1", name: "Ivor Quennell", nation: "GBR", ageGroup: "30-34", bib: "1201", time: "00:00:12" }),
      row({ place: "2", placeAge: "1", name: "Jocasta Pemberton", nation: "GBR", ageGroup: "30-34", bib: "1202", time: "14:59:59" }),
    ],
    2,
  ),
);

// Doubles: one row per team, both names in the name field (SOURCE.md §8).
writeFileSync(
  join(OUT, "list-rows-doubles.html"),
  page(
    [
      row({ place: "1", placeAge: "1", name: "Alaric Fenwick / Caius Marlowe", nation: "GBR", ageGroup: "30-34", bib: "2101", time: "00:58:14" }),
      row({ place: "2", placeAge: "2", name: "Bram Oosterhuis / Gustav Lindqvist", nation: "NED", ageGroup: "35-39", bib: "2102", time: "01:01:37" }),
    ],
    2,
  ),
);

// The per-result detail view: eight runs, eight stations, Roxzone.
const STATIONS = [
  ["SkiErg", "04:12"],
  ["Sled Push", "02:48"],
  ["Sled Pull", "03:31"],
  ["Burpee Broad Jump", "04:55"],
  ["Rowing", "04:38"],
  ["Farmers Carry", "02:07"],
  ["Sandbag Lunges", "04:41"],
  ["Wall Balls", "05:26"],
];
const detailRows = [];
for (let i = 0; i < 8; i += 1) {
  detailRows.push(`<tr><td class="desc">Running ${i + 1}</td><td class="time">00:04:${String(20 + i).padStart(2, "0")}</td></tr>`);
  detailRows.push(`<tr><td class="desc">${STATIONS[i][0]}</td><td class="time">00:${STATIONS[i][1]}</td></tr>`);
}
detailRows.push(`<tr><td class="desc">Roxzone</td><td class="time">00:06:14</td></tr>`);
writeFileSync(
  join(OUT, "detail-splits.html"),
  `<!-- SYNTHETIC IDENTITIES, REAL STRUCTURE. -->
<!DOCTYPE html><html><body><table class="table-condensed">
${detailRows.join("\n")}
</table></body></html>
`,
);

// The ajax2 envelope: shape inferred, not observed (SOURCE.md §4, §9).
writeFileSync(
  join(OUT, "ajax2-page.json"),
  JSON.stringify(
    {
      status: "ok",
      page: 1,
      html: page(build([0, 1, 2, 3, 4, 5, 6, 7]), 8),
    },
    null,
    2,
  ),
);

console.log("✓ hyrox fixtures written to tests/fixtures/hyrox");
