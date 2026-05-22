/**
 * Walk the V3 quiz on three alternate paths to verify conditional screens,
 * routing logic, and storage shape.
 *
 *   PATH A: doubles intent → partner screen skipped, doubles programme
 *   PATH B: raced-many → best-time appears; sub-75 best time → pro programme
 *   PATH C: home setup → equipment screen appears; injury knee → DB stores
 *
 * Usage: node scripts/test-quiz-alt-paths.mjs [baseUrl]
 */

import puppeteer from "puppeteer-core";

const BASE = process.argv[2] || "http://localhost:3000";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const settle = (ms = 350) => new Promise((r) => setTimeout(r, ms));

const clickByText = (page, text) =>
  page.evaluate((needle) => {
    const els = Array.from(document.querySelectorAll("button, a"));
    const target = els.find((b) =>
      (b.textContent || "")
        .trim()
        .toLowerCase()
        .includes(needle.toLowerCase()),
    );
    if (!target) return false;
    target.click();
    return true;
  }, text);

const clickContinue = (page) =>
  page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) => {
      const t = (b.textContent || "").trim().toLowerCase();
      return (
        t.startsWith("continue") ||
        t.startsWith("save my plan") ||
        t.startsWith("see my plan")
      );
    });
    if (!btn || btn.disabled) return false;
    btn.click();
    return true;
  });

const visibleQuestion = (page) =>
  page.evaluate(() => {
    return {
      h1: document.querySelector("h1")?.textContent?.trim() ?? null,
      counter:
        document
          .querySelector('[class*="font-mono"][class*="tracking-"]')
          ?.textContent?.trim() ?? null,
    };
  });

async function freshQuiz(page) {
  await page.goto(`${BASE}/quiz`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    window.localStorage.removeItem("vyrek:quiz:v3:state");
    window.localStorage.removeItem("vyrek:customer:uuid");
  });
  await page.reload({ waitUntil: "networkidle2" });
  await settle(700);
  // Leave the welcome carousel
  await clickByText(page, "Find your plan");
  await settle(500);
}

async function pickCalibration(page) {
  await clickByText(page, "Men's standards");
  await page.evaluate(() => {
    const input = document.querySelector('input[type="number"]');
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    if (setter) setter.call(input, "78");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await settle(200);
}

async function pathDoubles(page) {
  await freshQuiz(page);
  // intent: training with a partner
  await clickByText(page, "Training with a partner");
  await clickContinue(page); await settle(400);
  await clickContinue(page); await settle(400); // reassurance-1
  await clickByText(page, "Never raced");
  await clickContinue(page); await settle(400);
  await clickByText(page, "No race booked");
  await settle(400);
  await clickContinue(page); await settle(400); // reassurance-2
  await clickByText(page, "Training 3-4 days a week");
  await clickContinue(page); await settle(400);
  await pickCalibration(page);
  await clickContinue(page); await settle(400);
  await clickByText(page, "4 days");
  await clickContinue(page); await settle(400);
  await clickByText(page, "60 min");
  await clickContinue(page); await settle(400);
  await clickByText(page, "Standard commercial gym");
  await clickContinue(page); await settle(400);
  // Partner screen should be SKIPPED (intent includes doubles)
  await clickByText(page, "No injuries");
  await clickContinue(page); await settle(700);
  return await page.evaluate(() => {
    const raw = window.localStorage.getItem("vyrek:quiz:v3:state");
    const parsed = raw ? JSON.parse(raw) : null;
    const summary = document.body.innerText;
    return {
      answers: parsed?.answers,
      summaryProgramme: summary.match(/(FIRST RACE|SUB-90|DOUBLES|PRO) PROGRAMME/)?.[1],
      partnerInSummary: summary.includes("Doubles") || summary.includes("Solo"),
    };
  });
}

async function pathRacedMany(page) {
  await freshQuiz(page);
  await clickByText(page, "Done a Hyrox, want to go faster");
  await clickContinue(page); await settle(400);
  await clickContinue(page); await settle(400); // reassurance-1
  await clickByText(page, "Raced multiple times");
  await clickContinue(page); await settle(400);
  // Best-time should appear here
  const bestInfo = await visibleQuestion(page);
  await clickByText(page, "Under 75 min");
  await clickContinue(page); await settle(400);
  await clickByText(page, "No race booked");
  await settle(400);
  await clickContinue(page); await settle(400); // reassurance-2
  await clickByText(page, "Training 5+ days a week");
  await clickContinue(page); await settle(400);
  await pickCalibration(page);
  await clickContinue(page); await settle(400);
  await clickByText(page, "5 days");
  await clickContinue(page); await settle(400);
  await clickByText(page, "60 min");
  await clickContinue(page); await settle(400);
  await clickByText(page, "Full Hyrox gym");
  await clickContinue(page); await settle(400);
  // Partner screen visible (no doubles intent)
  await clickByText(page, "Solo for now, partner later");
  await clickContinue(page); await settle(400);
  await clickByText(page, "No injuries");
  await clickContinue(page); await settle(700);
  return await page.evaluate(() => {
    const raw = window.localStorage.getItem("vyrek:quiz:v3:state");
    const parsed = raw ? JSON.parse(raw) : null;
    const summary = document.body.innerText;
    return {
      bestTimeQuestionAppeared: true,
      answers: parsed?.answers,
      summaryProgramme: summary.match(/(FIRST RACE|SUB-90|DOUBLES|PRO) PROGRAMME/)?.[1],
    };
  }).then((r) => ({ ...r, bestSeen: bestInfo.h1 }));
}

async function pathHomeKnee(page) {
  await freshQuiz(page);
  await clickByText(page, "Training for my first Hyrox");
  await clickContinue(page); await settle(400);
  await clickContinue(page); await settle(400); // reassurance-1
  await clickByText(page, "Never raced");
  await clickContinue(page); await settle(400);
  await clickByText(page, "No race booked");
  await settle(400);
  await clickContinue(page); await settle(400); // reassurance-2
  await clickByText(page, "Training 1-2 days a week");
  await clickContinue(page); await settle(400);
  await pickCalibration(page);
  await clickContinue(page); await settle(400);
  await clickByText(page, "4 days");
  await clickContinue(page); await settle(400);
  await clickByText(page, "45 min");
  await clickContinue(page); await settle(400);
  await clickByText(page, "Home setup");
  await clickContinue(page); await settle(500);
  // Equipment screen should appear now
  const eqInfo = await visibleQuestion(page);
  // Pick 3 kit items
  await page.evaluate(() => {
    const wanted = ["Dumbbells", "Kettlebell", "Rower"];
    const chips = Array.from(document.querySelectorAll("button"));
    for (const w of wanted) {
      const chip = chips.find((b) => (b.textContent || "").trim() === w);
      if (chip) chip.click();
    }
  });
  await settle(200);
  await clickContinue(page); await settle(400);
  await clickByText(page, "Solo for now, partner later");
  await clickContinue(page); await settle(400);
  await clickByText(page, "Knee");
  await clickContinue(page); await settle(700);
  return await page.evaluate(() => {
    const raw = window.localStorage.getItem("vyrek:quiz:v3:state");
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      equipmentQuestionAppeared: true,
      answers: parsed?.answers,
    };
  }).then((r) => ({ ...r, eqSeen: eqInfo.h1 }));
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});

const results = [];

try {
  const page = await browser.newPage();
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  console.log("\n=== PATH A: doubles intent ===");
  const a = await pathDoubles(page);
  console.log(JSON.stringify(a, null, 2));
  if (a.summaryProgramme !== "DOUBLES") {
    results.push("A: programme expected DOUBLES, got " + a.summaryProgramme);
  }
  if (a.answers?.partner !== undefined) {
    results.push(
      "A: partner field set when intent already has 'doubles' — should be undefined (screen skipped)",
    );
  }

  console.log("\n=== PATH B: raced-many + under-75 ===");
  const b = await pathRacedMany(page);
  console.log(JSON.stringify(b, null, 2));
  if (b.bestSeen !== "What's your best Hyrox time?") {
    results.push("B: best-time screen not shown for raced-many");
  }
  if (b.summaryProgramme !== "PRO") {
    results.push("B: programme expected PRO, got " + b.summaryProgramme);
  }
  if (b.answers?.partner !== "solo-partner-later") {
    results.push(
      "B: partner expected 'solo-partner-later', got " + b.answers?.partner,
    );
  }

  console.log("\n=== PATH C: home + equipment + knee ===");
  const c = await pathHomeKnee(page);
  console.log(JSON.stringify(c, null, 2));
  if (c.eqSeen !== "What kit do you have at home?") {
    results.push("C: equipment screen not shown for home setup");
  }
  if (!c.answers?.equipment || c.answers.equipment.length === 0) {
    results.push("C: equipment array empty");
  }
  if (c.answers?.injuries !== "knee") {
    results.push("C: injuries expected 'knee', got " + c.answers?.injuries);
  }

  console.log("\n=== Summary ===");
  if (results.length === 0) {
    console.log("✓ All three alternate paths PASS");
  } else {
    console.log(`✗ ${results.length} issues:`);
    results.forEach((r) => console.log("  - " + r));
  }
} finally {
  await browser.close();
}

process.exit(results.length ? 1 : 0);
