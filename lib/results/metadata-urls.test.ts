/**
 * Guard against interpolating `siteUrl` without calling it.
 *
 * `siteUrl` is a function. `${siteUrl}` in a template literal is valid
 * TypeScript and silently stringifies the function's source into the URL, so
 * every canonical, og:image and JSON-LD `url` on the page becomes garbage.
 * Typecheck and lint both pass; only reading the rendered HTML catches it —
 * which is how it was found. This makes it fail a test instead.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(tsx?|jsx?)$/.test(entry)) out.push(path);
  }
  return out;
}

describe("metadata URLs", () => {
  it("never interpolates siteUrl without calling it", () => {
    const roots = ["app", "components/results", "lib/results"];
    const offenders: string[] = [];

    for (const root of roots) {
      for (const file of walk(join(process.cwd(), root))) {
        if (file.endsWith("metadata-urls.test.ts")) continue; // this file describes the pattern
        const source = readFileSync(file, "utf8");

        // Files that bind it locally first (`const siteUrl = siteUrl()`) are
        // fine — there `siteUrl` really is a string. app/robots.ts does this.
        if (/\b(const|let)\s+siteUrl\s*=/.test(source)) continue;

        // `${siteUrl}` — but allow `${siteUrl()}`.
        if (/\$\{\s*siteUrl\s*\}/.test(source)) {
          offenders.push(file.replace(process.cwd() + "/", ""));
        }
      }
    }

    expect(offenders, `siteUrl used without () in:\n${offenders.join("\n")}`).toEqual([]);
  });
});

/**
 * Guard against the brand appearing twice in one title.
 *
 * `app/layout.tsx` sets `title.template = "%s · Suth Performance"`, so every
 * page-level title gets the brand appended for free. Seventeen Results pages
 * also hard-coded "| Suth Performance" into their own title, which rendered as
 * "…| Suth Performance · Suth Performance" in every tab and every SERP entry.
 *
 * Typecheck cannot see this and neither can a screenshot — the title tag is not
 * on the page. It survived because nothing ever asserted on it.
 */
describe("page titles", () => {
  it("never hard-codes the brand that the layout template already appends", () => {
    const offenders: string[] = [];

    for (const file of walk(join(process.cwd(), "app/(results)"))) {
      const source = readFileSync(file, "utf8");
      // The template joins with "·", so a page adding its own "| Suth
      // Performance" is always a duplicate rather than a deliberate variant.
      if (/\|\s*Suth Performance/.test(source)) {
        offenders.push(file.replace(process.cwd() + "/", ""));
      }
    }

    expect(
      offenders,
      `title already gets "· Suth Performance" from the layout template; drop the suffix in:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
