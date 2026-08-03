import { chromium } from "@playwright/test";
const [url, out] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(url, { waitUntil: "networkidle", timeout: 120000 });
await p.emulateMedia({ media: "print" });
// No `margin` option: passing one overrides the stylesheet's @page rule, so
// the generated PDF would not match what a real Cmd+P produces.
await p.pdf({ path: out, format: "A4", printBackground: true, preferCSSPageSize: true });
await b.close();
console.log("wrote", out);
