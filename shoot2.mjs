import { chromium } from "@playwright/test";
const OUT="/private/tmp/claude-501/-Users-kieronhawke/769cc502-3677-455b-a5e0-2919a34d6d46/scratchpad/shots";
const b=await chromium.launch();
for (const vp of [{n:"mobile",w:390,h:1500},{n:"desktop",w:1440,h:1200}]) {
  const ctx=await b.newContext({viewport:{width:vp.w,height:vp.h},deviceScaleFactor:2});
  const p=await ctx.newPage();
  await p.goto("http://localhost:3000/blog/what-is-a-good-hyrox-time",{waitUntil:"networkidle"});
  const n=await p.locator("figure").count();
  for (let i=0;i<n;i++){
    const t=(await p.locator("figure").nth(i).innerText()).slice(0,45).replace(/\n/g," ");
    if (vp.n==="mobile") console.log(i,"|",t);
  }
  const fig=p.locator("figure").filter({hasText:"BREAKDOWN"}).first();
  await fig.scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
  await fig.screenshot({path:`${OUT}/chart-${vp.n}.png`});
  await ctx.close();
}
await b.close(); console.log("done");
