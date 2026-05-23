#!/usr/bin/env node
// Run N sessions per persona with bounded concurrency. Capture timings,
// hesitation, abandonment, console errors, requestfailed events.
//
// Default: 5 sessions per persona × 8 personas = 40 sessions, concurrency 8.
// Override with: SESSIONS_PER_PERSONA=25 CONCURRENCY=10 node run-stress.mjs

import { chromium } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
import { PERSONAS } from "./personas.mjs";

const BASE = process.env.SMOKE_BASE ?? "https://vyrek.vercel.app";
const SESSIONS_PER_PERSONA = Number(process.env.SESSIONS_PER_PERSONA ?? 5);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 8);
const OUT = "/Users/kieronhawke/code/vyrek/scripts/stress-test/results";
await mkdir(OUT, { recursive: true });

const queue = [];
for (const p of PERSONAS) {
  for (let i = 0; i < SESSIONS_PER_PERSONA; i++) {
    queue.push({ persona: p, run: i });
  }
}
console.log(`\n${queue.length} sessions queued, concurrency=${CONCURRENCY}`);

const runs = [];
const t0 = Date.now();

async function runOne({ persona, run }) {
  const consoleErrs = [];
  const failedRequests = [];
  const browser = await chromium.launch();
  const ctxOpts = { ...persona.context };
  const browserCtx = await browser.newContext(ctxOpts);
  const page = await browserCtx.newPage();

  if (persona.cdpThrottle) {
    const cdp = await browserCtx.newCDPSession(page);
    await cdp.send("Network.emulateNetworkConditions", persona.cdpThrottle);
  }

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const t = msg.text();
    if (/posthog|gtag|gtm|sentry|hotjar|onesignal|cookie|favicon|hydration/i.test(t)) return;
    consoleErrs.push(t.slice(0, 220));
  });
  page.on("pageerror", (e) => consoleErrs.push(`pageerror: ${e.message.slice(0, 220)}`));
  page.on("requestfailed", (req) => {
    const u = req.url();
    if (!u.startsWith(BASE)) return;
    if (/[?&]_rsc=|\/api\/presence\/ping|_next\/image|favicon/i.test(u)) return;
    failedRequests.push({ url: u, err: req.failure()?.errorText });
  });

  const ctx = { base: BASE, t0: Date.now(), events: [] };
  const start = Date.now();
  let outcome = "complete";
  try {
    await persona.journey(page, ctx);
  } catch (e) {
    outcome = "errored";
    ctx.events.push({ t: Date.now() - ctx.t0, kind: "journey-error", err: e.message.slice(0, 200) });
  }
  const elapsed = Date.now() - start;

  // Find first interaction time (first click event)
  const firstClick = ctx.events.find((e) => e.kind === "click");
  const firstScroll = ctx.events.find((e) => e.kind === "scroll");
  const reachedQuiz = ctx.events.some((e) => e.kind === "quiz-step");
  const completedQuiz = ctx.events.some((e) => e.kind === "quiz-completed");
  const abandoned = ctx.events.some((e) => e.kind === "abandon");
  const stuck = ctx.events.find((e) => e.kind === "quiz-stuck");
  const hesitations = ctx.events.filter((e) => e.kind === "hesitation");
  const totalHesitationMs = hesitations.reduce((s, h) => s + h.ms, 0);

  await browser.close();

  return {
    persona: persona.id,
    run,
    outcome,
    elapsedMs: elapsed,
    timeToFirstClickMs: firstClick?.t ?? null,
    timeToFirstScrollMs: firstScroll?.t ?? null,
    reachedQuiz,
    completedQuiz,
    abandoned,
    stuckAtQuizStep: stuck?.step ?? null,
    hesitationCount: hesitations.length,
    totalHesitationMs,
    consoleErrors: consoleErrs,
    failedRequests,
    eventCount: ctx.events.length,
  };
}

async function worker() {
  while (queue.length) {
    const job = queue.shift();
    if (!job) return;
    try {
      const r = await runOne(job);
      runs.push(r);
      const tag = r.outcome === "errored" ? "✗" : r.completedQuiz ? "✓✓" : r.reachedQuiz ? "✓" : r.abandoned ? "—" : "·";
      console.log(`  ${tag} ${r.persona}#${r.run} ${r.elapsedMs}ms ${r.consoleErrors.length}cons ${r.failedRequests.length}fail`);
    } catch (e) {
      console.log(`  ✗ ${job.persona.id}#${job.run} ${e.message.slice(0, 80)}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const totalMs = Date.now() - t0;

const summary = {
  base: BASE,
  generatedAt: new Date().toISOString(),
  sessionsRun: runs.length,
  totalWallMs: totalMs,
  byPersona: PERSONAS.map((p) => {
    const r = runs.filter((x) => x.persona === p.id);
    if (!r.length) return { persona: p.id, n: 0 };
    return {
      persona: p.id,
      label: p.label,
      n: r.length,
      meanElapsedMs: Math.round(r.reduce((s, x) => s + x.elapsedMs, 0) / r.length),
      meanFirstClickMs: Math.round(r.reduce((s, x) => s + (x.timeToFirstClickMs ?? 0), 0) / r.length),
      reachedQuizPct: Math.round((r.filter((x) => x.reachedQuiz).length / r.length) * 100),
      completedQuizPct: Math.round((r.filter((x) => x.completedQuiz).length / r.length) * 100),
      abandonedPct: Math.round((r.filter((x) => x.abandoned).length / r.length) * 100),
      meanHesitationMs: Math.round(r.reduce((s, x) => s + x.totalHesitationMs, 0) / r.length),
      consoleErrorRate: Math.round((r.filter((x) => x.consoleErrors.length > 0).length / r.length) * 100),
      failedReqRate: Math.round((r.filter((x) => x.failedRequests.length > 0).length / r.length) * 100),
    };
  }),
  runs,
};

await writeFile(`${OUT}/sessions.json`, JSON.stringify(summary, null, 2));

console.log(`\nWall: ${(totalMs / 1000).toFixed(1)}s, ${runs.length} sessions`);
console.log(`Saved: ${OUT}/sessions.json`);

for (const p of summary.byPersona) {
  if (p.n === 0) continue;
  console.log(`  ${p.persona.padEnd(20)}  reach=${p.reachedQuizPct}%  done=${p.completedQuizPct}%  abandon=${p.abandonedPct}%  errs=${p.consoleErrorRate}%`);
}
