#!/usr/bin/env node
// Strip every em-dash and spaced en-dash from user-facing source files.
// Brief B3 §1.3 requires `grep` to return zero hits across .tsx/.ts/.md/.mdx/.json.

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const EM = "—"; // —
const EN = "–"; // –

const EXCLUDE = [
  "node_modules",
  ".next",
  "tsbuildinfo",
  "pnpm-lock",
  "package-lock",
  // Brief docs and historical reports preserve their own dashes.
  "docs/vyrek-",
  "docs/landing-audit",
  "docs/NIGHT-OF",
  "scripts/audit-shots",
  "scripts/test-quiz-helpers",
];

const out = execSync(
  `grep -rl '${EM}\\|${EN}' --include="*.tsx" --include="*.ts" --include="*.md" --include="*.mdx" --include="*.json" .`,
  { cwd: "/Users/kieronhawke/code/vyrek", encoding: "utf8" },
).trim();

const files = out
  .split("\n")
  .filter(Boolean)
  .filter((p) => !EXCLUDE.some((ex) => p.includes(ex)));

let changed = 0;
let totalReplaced = 0;

for (const rel of files) {
  const path = `/Users/kieronhawke/code/vyrek/${rel.replace(/^\.\//, "")}`;
  const before = readFileSync(path, "utf8");
  let after = before;

  // Replace `space-em-space` and `space-en-space` with `, `.
  // Several places use ` — ` as a parenthetical separator; the comma works.
  after = after.replaceAll(` ${EM} `, ", ");
  after = after.replaceAll(` ${EN} `, ", ");

  // Replace bare em-dashes used as placeholder strings ("—", '—').
  after = after.replaceAll(`"${EM}"`, '"-"');
  after = after.replaceAll(`'${EM}'`, "'-'");
  after = after.replaceAll(`"${EN}"`, '"-"');
  after = after.replaceAll(`'${EN}'`, "'-'");

  // Anything still left: prefer ", " for prose, "-" for tight contexts.
  // We default to ", " because the remaining cases tend to be inline JSX
  // text where a comma reads naturally.
  const remaining = (after.match(new RegExp(`[${EM}${EN}]`, "g")) ?? []).length;
  if (remaining > 0) {
    after = after.replaceAll(EM, ", ");
    after = after.replaceAll(EN, ", ");
  }

  const delta = (before.match(new RegExp(`[${EM}${EN}]`, "g")) ?? []).length;
  if (after !== before) {
    writeFileSync(path, after, "utf8");
    changed++;
    totalReplaced += delta;
    console.log(`  ${rel}  (${delta} replacements)`);
  }
}

console.log(`\nFiles changed: ${changed}`);
console.log(`Dashes replaced: ${totalReplaced}`);
