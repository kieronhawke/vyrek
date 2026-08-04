import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
const BASE = "http://localhost:3030";
const routes = JSON.parse(readFileSync("/tmp/dynroutes.json", "utf8"));
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const out = [];
for (const route of routes) {
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text().slice(0,140)); });
  page.on("pageerror", e => consoleErrors.push("PAGEERROR " + String(e).slice(0,140)));
  let status = 0, meta = {};
  try {
    const res = await page.goto(BASE + route, { waitUntil: "load", timeout: 60000 });
    status = res?.status() ?? 0;
    await page.waitForTimeout(350);
    meta = await page.evaluate(() => {
      const g = (s,a) => document.querySelector(s)?.getAttribute(a) ?? null;
      const imgs = [...document.querySelectorAll("img")];
      return {
        title: document.title,
        desc: (g('meta[name="description"]',"content") ?? "").length,
        h1: [...document.querySelectorAll("h1")].map(h=>h.textContent.trim().slice(0,50)),
        canonical: !!g('link[rel="canonical"]',"href"),
        og: !!g('meta[property="og:image"]',"content"),
        broken: imgs.filter(i=>i.complete && i.naturalWidth===0).length,
        rawImgs: imgs.map(i=>i.getAttribute("src")??"").filter(s=>s.startsWith("/media/")).length,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        textLen: (document.body.innerText||"").length,
        jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>{
          try { const d = JSON.parse(s.textContent); return Array.isArray(d)?d.map(x=>x["@type"]).join("+"):d["@type"]; }
          catch { return "INVALID"; }
        }),
      };
    });
    const t = await page.evaluate(() => {
      const r = performance.getEntriesByType("resource");
      return { kb: Math.round(r.reduce((s,x)=>s+(x.transferSize||0),0)/1024),
               imgKb: Math.round(r.filter(x=>x.initiatorType==="img").reduce((s,x)=>s+(x.transferSize||0),0)/1024) };
    });
    Object.assign(meta, t);
  } catch (e) { meta.error = String(e).slice(0,120); }
  out.push({ route, status, ...meta, consoleErrors });
  await page.close();
}
await b.close();
writeFileSync("/tmp/dyncrawl.json", JSON.stringify(out, null, 1));
console.log("crawled", out.length);
