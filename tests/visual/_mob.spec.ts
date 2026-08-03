import { test, chromium } from "@playwright/test";
test("slider drag, scrolled into view", async () => {
  test.setTimeout(180_000);
  const b = await chromium.launch();
  for (const [label, mobile] of [["phone", true], ["desktop", false]] as [string, boolean][]) {
    const c = await b.newContext({
      viewport: { width: mobile ? 390 : 1280, height: 844 },
      hasTouch: mobile, isMobile: mobile,
    });
    const p = await c.newPage();
    await p.goto("http://localhost:3123/simulator", { waitUntil: "load" });
    await p.waitForTimeout(1800);

    const slider = p.locator('input[type="range"]').first();
    await slider.scrollIntoViewIfNeeded();
    await p.waitForTimeout(400);

    const box = (await slider.boundingBox())!;
    const read = () => p.evaluate(() => (document.querySelector('input[type="range"]') as HTMLInputElement).value);
    const hit = await p.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return el?.tagName.toLowerCase() ?? "none";
    }, [box.x + box.width * 0.8, box.y + box.height / 2]);

    const start = await read();
    await p.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2);
    await p.mouse.down();
    await p.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2, { steps: 10 });
    await p.mouse.up();
    await p.waitForTimeout(400);
    const end = await read();

    console.log(`  ${label.padEnd(8)} h=${Math.round(box.height)}px hitTest=${hit}  ${start} -> ${end}  ${end !== start ? "DRAG WORKS" : "NO CHANGE"}`);
    await c.close();
  }
  await b.close();
});
