import { test, chromium } from "@playwright/test";
test("session can be finished; voice note is honest", async () => {
  test.setTimeout(180_000);
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 390, height: 844 } });
  c.setDefaultTimeout(10000);
  const p = await c.newPage();
  const errs: string[] = [];
  p.on("pageerror", e => errs.push(e.message));

  // ── Workout player ──
  await p.goto("http://localhost:3123/train", { waitUntil: "load" });
  await p.waitForTimeout(1500);
  let next = p.getByRole("button", { name: "Next exercise" });
  let hops = 0;
  while (await next.count() && hops < 6) { await next.click(); await p.waitForTimeout(300); hops++; }
  const finish = p.getByRole("button", { name: "Finish session" });
  console.log(`  advanced ${hops} exercises; finish button present: ${await finish.count() > 0}`);
  if (await finish.count()) {
    await finish.click();
    await p.waitForTimeout(500);
    const done = await p.getByTestId("workout-finished").count();
    const heading = await p.getByRole("heading", { name: /session done/i }).count();
    console.log(`  finished screen: ${done > 0}, heading: ${heading > 0}`);
  }

  // ── Voice note ──
  await p.goto("http://localhost:3123/control-preview/app/plan", { waitUntil: "load" });
  await p.waitForTimeout(1500);
  const skip = p.getByRole("button", { name: "Skip" });
  if (await skip.count()) await skip.click();
  await p.waitForTimeout(400);
  const player = await p.locator(".week__media-player").count();
  const none = await p.locator(".week__media--none").count();
  console.log(`  voice note: player=${player} noneMessage=${none}`);
  console.log(`  js errors: ${errs.length}`);
  await c.close(); await b.close();
});
