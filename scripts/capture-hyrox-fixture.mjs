/**
 * Records genuine source samples as parser fixtures.
 *
 * Refuses to run unless HYROX_SOURCE_ACCESS=authorised, for the same reason the
 * fetcher does: results.hyrox.com publishes Disallow: / and blocks non-browser
 * agents, so recording a fixture is an outbound request like any other.
 * See docs/results/SOURCE.md §1.
 *
 * Captured files land in tests/fixtures/hyrox/captured/ and are gitignored —
 * real rows are third-party personal data and do not belong in the repo. Point
 * the parser tests at them locally to verify against reality, then delete.
 *
 *   HYROX_SOURCE_ACCESS=authorised node scripts/capture-hyrox-fixture.mjs season-9 H_LR3MS4JI1738
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const UA =
  process.env.HYROX_SOURCE_USER_AGENT ??
  "SuthPerformanceResultsBot/1.0 (+https://www.suthperformance.com/about; contact: hello@suthperformance.com)";

if (process.env.HYROX_SOURCE_ACCESS !== "authorised") {
  console.error(
    "Refusing to fetch. results.hyrox.com disallows automated access and blocks\n" +
      "non-browser agents. Set HYROX_SOURCE_ACCESS=authorised only once HYROX have\n" +
      "granted access. See docs/results/SOURCE.md §1 and ACTION-REQUIRED.md item 1.",
  );
  process.exit(1);
}

const [seasonPath = "season-9", division] = process.argv.slice(2);
const origin = process.env.HYROX_SOURCE_ORIGIN ?? "https://results.hyrox.com";
const out = join(process.cwd(), "tests", "fixtures", "hyrox", "captured");
mkdirSync(out, { recursive: true });

async function grab(name, url) {
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  const body = await response.text();
  writeFileSync(join(out, name), body);
  console.log(`${response.status}  ${name}  ${body.length}b  ${url}`);
  // One request per second, floor. This is a courtesy call, not a crawl.
  await new Promise((r) => setTimeout(r, 1500));
}

await grab("season-index.html", `${origin}/${seasonPath}/?pid=list&lang=EN`);
if (division) {
  await grab(
    "list-rows.html",
    `${origin}/${seasonPath}/?pid=list&event=${division}&num_results=100&lang=EN`,
  );
  await grab(
    "ajax2-page.json",
    `${origin}/${seasonPath}/?content=ajax2&client=js&pid=list&event=${division}&page=1&num_results=100&lang=EN`,
  );
}
console.log("\nCaptured to tests/fixtures/hyrox/captured/ (gitignored).");
