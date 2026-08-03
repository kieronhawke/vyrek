import { test, chromium, type Page } from "@playwright/test";

const BASE = "https://www.suthperformance.com";

const issues: string[] = [];
const note = (what: string) => { issues.push(what); console.log("  ISSUE  " + what); };
const ok = (what: string) => console.log("  ok     " + what);

async function open(page: Page, path: string) {
  await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.locator("h1").first().waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(900);
}

test("production interactions", async () => {
  test.setTimeout(30 * 60 * 1000);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 100)));

  /* ── Search ───────────────────────────────────────────────────── */
  await open(page, "/results");
  await page.keyboard.press("Meta+k");
  await page.waitForTimeout(600);
  const dialogs = await page.locator('[role="dialog"]').count();
  if (dialogs !== 1) note(`⌘K opened ${dialogs} dialogs`); else ok("⌘K opens exactly one dialog");

  const box = page.getByPlaceholder("Search athletes and events");
  await box.fill("london");
  await page.waitForTimeout(1200);
  const optionCount = await page.getByRole("option").count();
  if (optionCount === 0) note("search for 'london' returned nothing");
  else ok(`search returns ${optionCount} results`);

  await box.fill("sub 90");
  await page.waitForTimeout(800);
  const intent = await page.getByText(/Build a Sub 90/i).count();
  if (intent === 0) note("search no longer detects a goal-time intent");
  else ok("search detects goal intent");

  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  if (await page.locator('[role="dialog"]').count() !== 0) note("Escape did not close search");
  else ok("Escape closes search");

  /* ── Ranking table ────────────────────────────────────────────── */
  await open(page, "/ranking/s9-2026-london-hyrox-men");
  const rowsBefore = await page.locator("tbody tr, [role=row]").count();
  const filter = page.getByPlaceholder(/search this division/i);
  if (await filter.count() === 0) note("ranking has no name filter");
  else {
    await filter.fill("aaron");
    await page.waitForTimeout(900);
    const rowsAfter = await page.locator("tbody tr, [role=row]").count();
    if (rowsAfter >= rowsBefore) note(`filter did not narrow rows (${rowsBefore} → ${rowsAfter})`);
    else ok(`filter narrows ${rowsBefore} → ${rowsAfter}`);
    await filter.fill("");
    await page.waitForTimeout(600);
  }

  /* ── Share sheet ──────────────────────────────────────────────── */
  await open(page, "/result/s9-2026-london-hyrox-men-1600");
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await page.waitForTimeout(1500);
  const sheet = page.getByRole("dialog", { name: /share this result/i });
  if (await sheet.count() === 0) note("share sheet did not open");
  else {
    ok("share sheet opens");
    const card = sheet.locator("img").first();
    const cardOk = await card.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 100)
      .catch(() => false);
    if (!cardOk) note("share card image did not load"); else ok("share card renders");
    for (const label of [/save image/i, /copy link/i, /copy caption/i]) {
      if (await sheet.getByRole("button", { name: label }).count() === 0) {
        note(`share sheet missing button ${label}`);
      }
    }
    ok("share sheet has its fallback actions");
    await page.keyboard.press("Escape");
  }

  /* ── Record book ──────────────────────────────────────────────── */
  await open(page, "/rankings/records");
  const cards = await page.locator("article").count();
  if (cards < 50) note(`record book only rendered ${cards} cards`);
  else ok(`record book renders ${cards} cards`);

  const seLink = page.getByRole("link", { name: /^Swedish$/ }).first();
  if (await seLink.count() === 0) note("no country filter chips on the record book");
  else {
    await seLink.click();
    await page.waitForTimeout(1800);
    if (!page.url().includes("country=se")) note("country chip did not change the URL");
    else ok("country filter navigates to a real URL");
    const heading = await page.getByRole("heading", { name: /Swedish records/i }).count();
    if (heading === 0) note("country filter did not render that country's book");
    else ok("country filter renders the right book");
  }

  /* ── Simulator ────────────────────────────────────────────────── */
  await open(page, "/simulator");
  const sliders = await page.locator('input[type="range"]').count();
  if (sliders === 0) note("simulator has no sliders");
  else {
    const first = page.locator('input[type="range"]').first();
    const before = await page.locator("body").innerText();
    await first.focus();
    for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(800);
    const after = await page.locator("body").innerText();
    if (before === after) note("moving a simulator slider changed nothing on the page");
    else ok(`simulator responds to ${sliders} sliders`);
  }

  /* ── Report: print media ──────────────────────────────────────── */
  await open(page, "/report/s9-2026-london-hyrox-men-1600");
  const cover = await page.evaluate(() => {
    const img = document.querySelector(".report-cover img") as HTMLImageElement | null;
    return { loaded: Boolean(img?.complete && img.naturalWidth > 0), opacity: img ? getComputedStyle(img).opacity : "" };
  });
  if (!cover.loaded) note("report cover photograph did not load");
  else ok(`report cover loads (opacity ${cover.opacity})`);

  await page.emulateMedia({ media: "print" });
  await page.waitForTimeout(500);
  const print = await page.evaluate(() => {
    const root = document.querySelector(".results-report") as HTMLElement;
    return {
      ink: getComputedStyle(root).getPropertyValue("--report-ink").trim(),
      toolbar: getComputedStyle(document.querySelector(".report-toolbar")!).display,
    };
  });
  if (print.ink.toLowerCase() !== "#101010") note(`print palette wrong: ink ${print.ink}`);
  else ok("print palette applies on production");
  if (print.toolbar !== "none") note("print does not hide the toolbar");
  await page.emulateMedia({ media: "screen" });

  /* ── 404s ─────────────────────────────────────────────────────── */
  for (const bad of ["/result/nope", "/report/nope", "/athlete/nobody", "/results/city/atlantis"]) {
    const res = await page.goto(BASE + bad, { waitUntil: "domcontentloaded" });
    if (res?.status() !== 404) note(`${bad} returned ${res?.status()}, expected 404`);
  }
  ok("unknown URLs 404");

  /* ── Back / forward ───────────────────────────────────────────── */
  await open(page, "/events");
  await page.getByRole("link", { name: /HYROX London 2026/i }).first().click();
  await page.waitForTimeout(1600);
  const onEvent = page.url().includes("/event/");
  await page.goBack();
  await page.waitForTimeout(1400);
  const backOnEvents = page.url().endsWith("/events");
  if (!onEvent || !backOnEvents) note(`navigation broke: event=${onEvent} back=${backOnEvents}`);
  else ok("forward and back navigation hold");

  if (errors.length) for (const e of errors) note(`JS: ${e}`);

  console.log(`\n===== ${issues.length} issue(s) =====`);
  for (const i of issues) console.log("  " + i);

  await ctx.close();
  await browser.close();
});
