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
