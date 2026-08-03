import { test, chromium } from "@playwright/test";
test("walkthrough at the bottom", async () => {
  test.setTimeout(120_000);
  const b = await chromium.launch();
  for (const [tag, w, h] of [["se", 375, 667], ["p15", 390, 844]] as [string, number, number][]) {
    const c = await b.newContext({ viewport: { width: w, height: h } });
    const p = await c.newPage();
    await p.goto("http://localhost:3123/control-preview/app/plan", { waitUntil: "load" });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `/tmp/wt-${tag}.png` });
    const info = await p.evaluate(() => {
      const card = document.querySelector(".walkthrough__card") as HTMLElement | null;
      const nav = document.querySelector("nav[class*='bottom'], .tabbar, [class*='bottom-nav']") as HTMLElement | null;
      if (!card) return { card: false };
      const r = card.getBoundingClientRect();
      const buttons = Array.from(card.querySelectorAll("button")).map(x => (x.textContent ?? "").trim());
      return {
        card: true,
        rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) },
        viewportH: window.innerHeight,
        clippedBelow: r.bottom > window.innerHeight,
        buttons,
        navBottom: nav ? Math.round(nav.getBoundingClientRect().top) : null,
      };
    });
    console.log(`  ${tag}: ${JSON.stringify(info)}`);
    await c.close();
  }
  await b.close();
});
