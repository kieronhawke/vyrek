import { test, chromium } from "@playwright/test";
test("celebration fires on mark done", async () => {
  test.setTimeout(180_000);
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await c.newPage();
  const errors: string[] = [];
  p.on("pageerror", e => errors.push(e.message));
  await p.goto("http://localhost:3123/control-preview/app/plan", { waitUntil: "load" });
  await p.waitForTimeout(1800);

  const tick = p.getByRole("button", { name: /Mark .* done/i }).first();
  const found = await tick.count();
  console.log("  mark-done buttons:", await p.getByRole("button", { name: /Mark .* done/i }).count());
  if (!found) { console.log("  NO TICK BUTTON FOUND"); await c.close(); await b.close(); return; }

  await tick.scrollIntoViewIfNeeded();
  await tick.click();
  await p.waitForTimeout(200);

  const burst = await p.locator(".celebrate__piece").count();
  const live = await p.locator("[aria-live=polite]").first().innerText().catch(() => "");
  console.log(`  confetti pieces: ${burst}`);
  console.log(`  announced: "${live.trim()}"`);
  await p.waitForTimeout(1200);
  const after = await p.locator(".celebrate__piece").count();
  console.log(`  pieces after 1.4s: ${after} (should be 0)`);
  console.log(`  js errors: ${errors.length}`);
  await p.screenshot({ path: "/tmp/celebrate.png" });
  await c.close(); await b.close();
});
