import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 794, height: 1123 } });
await p.goto("http://localhost:3020/report/s8-2025-malaga-hyrox-men-1", { waitUntil:"networkidle", timeout:120000 });
await p.emulateMedia({ media: "print" });
console.log(JSON.stringify(await p.evaluate(() => ({
  html: getComputedStyle(document.documentElement).backgroundColor,
  scheme: getComputedStyle(document.documentElement).colorScheme,
  height: getComputedStyle(document.documentElement).height,
})), null, 2));
await p.screenshot({ path: "/private/tmp/claude-501/-Users-kieronhawke/8f8b0d39-1717-432d-adf6-5eb58b1f906b/scratchpad/pdf/shot.png" });
await b.close();
