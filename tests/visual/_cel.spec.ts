import { test, chromium } from "@playwright/test";
test("what blocks the tick", async () => {
  test.setTimeout(120_000);
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 390, height: 844 } });
  c.setDefaultTimeout(8000);
  const p = await c.newPage();
  await p.goto("http://localhost:3123/control-preview/app/plan", { waitUntil: "load" });
  await p.waitForTimeout(1800);

  const tick = p.getByRole("button", { name: /Mark .* done/i }).first();
  await tick.scrollIntoViewIfNeeded().catch(() => console.log("  scrollIntoView failed"));
  await p.waitForTimeout(400);

  const info = await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button")).filter(b => /Mark .* done/i.test(b.getAttribute("aria-label") ?? ""));
    const el = btns[0];
    if (!el) return { found: false };
    const r = el.getBoundingClientRect();
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    const top = document.elementFromPoint(cx, cy) as HTMLElement | null;
    const s = getComputedStyle(el);
    return {
      found: true,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      inViewport: r.top >= 0 && r.bottom <= window.innerHeight,
      viewportH: window.innerHeight,
      topElement: top ? `${top.tagName.toLowerCase()}.${(top.className?.toString?.() ?? "").slice(0,40)}` : "none",
      isSelf: top === el,
      pointerEvents: s.pointerEvents,
      visibility: s.visibility,
      opacity: s.opacity,
    };
  });
  console.log("  " + JSON.stringify(info, null, 1).replace(/\n/g, "\n  "));
  await c.close(); await b.close();
});
