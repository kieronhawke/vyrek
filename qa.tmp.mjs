import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
const OUT = "refs/self-shots"; mkdirSync(OUT, { recursive: true });
const URL = "http://localhost:3005/ranking/s9-2026-london-hyrox-men";
const b = await chromium.launch();

// ---------- DESKTOP ----------
const d = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await d.newPage();
const errs = []; p.on("pageerror", e => errs.push(e.message));
p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });

await p.goto(URL, { waitUntil: "networkidle" });
await p.waitForTimeout(1200);

// virtualisation: how many rows in DOM vs total
const domRows = await p.locator('[class*="results-band"]').count();
const counter = await p.locator('p[aria-live="polite"]').innerText();
console.log("DOM rows:", domRows, "| counter:", counter.trim());

await p.screenshot({ path: `${OUT}/desktop-ranking.png` });

// sort by time desc
await p.getByRole("button", { name: /^Time/ }).click();
await p.waitForTimeout(300);
await p.getByRole("button", { name: /^Time/ }).click();
await p.waitForTimeout(300);
const firstAfterSort = await p.locator('[class*="results-band"]').first().innerText();
console.log("after Time desc, first row:", firstAfterSort.replace(/\n/g, " | ").slice(0, 80));

// search
await p.getByPlaceholder("Find an athlete").fill("patel");
await p.waitForTimeout(300);
const searchCount = await p.locator('p[aria-live="polite"]').innerText();
console.log("search 'patel':", searchCount.trim());
await p.getByPlaceholder("Find an athlete").fill("");
await p.waitForTimeout(200);

// re-sort to rank asc, expand first row
await p.getByRole("button", { name: /^#/ }).click();
await p.waitForTimeout(300);
await p.locator('button[aria-label^="Show splits"]').first().click();
await p.waitForTimeout(900);
const splitsVisible = await p.getByText("Splits vs division average").first().isVisible();
console.log("splits expanded:", splitsVisible);
await p.screenshot({ path: `${OUT}/desktop-ranking-expanded.png` });

// scroll deep to check windowing holds
await p.locator('.max-h-\\[70vh\\]').evaluate(el => el.scrollTop = 60000);
await p.waitForTimeout(500);
const domRowsDeep = await p.locator('[class*="results-band"]').count();
console.log("DOM rows after deep scroll:", domRowsDeep);
await p.screenshot({ path: `${OUT}/desktop-ranking-deep.png` });

// ---------- MOBILE ----------
const m = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const mp = await m.newPage();
mp.on("pageerror", e => errs.push("mobile: " + e.message));
await mp.goto(URL, { waitUntil: "networkidle" });
await mp.waitForTimeout(1200);
const scrollX = await mp.evaluate(() => { window.scrollTo(9999,0); const x = window.scrollX; window.scrollTo(0,0); return x; });
console.log("mobile horizontal scroll:", scrollX);
await mp.screenshot({ path: `${OUT}/mobile-ranking.png` });
await mp.locator("li button[aria-expanded]").first().click();
await mp.waitForTimeout(900);
await mp.screenshot({ path: `${OUT}/mobile-ranking-expanded.png` });

console.log("JS errors:", errs.length ? errs.slice(0,5) : "none");
await b.close();
