import { describe, it } from "vitest";
const t = async (label: string, fn: () => Promise<unknown>) => {
  const s = Date.now();
  try { await fn(); console.log(`[p] ${label.padEnd(26)} ${String(Date.now() - s).padStart(6)}ms`); }
  catch (e) { console.log(`[p] ${label.padEnd(26)} THREW ${(e as Error).message.slice(0,80)}`); }
};
describe("timing", () => {
  it("final numbers", async () => {
    const { getResultsService } = await import("@/lib/results/engine");
    const src = getResultsService();
    await t("listEvents", () => src.listEvents());
    await t("getEvent rotterdam", () => src.getEvent("s8-2026-rotterdam"));
    await t("getRanking hyrox-men", () => src.getRanking("s8-2026-rotterdam", "hyrox-men"));
    const r = await src.getRanking("s8-2026-rotterdam", "hyrox-men");
    await t("getResult", () => src.getResult(r!.rows[0].id));
    await t("searchAll('smith')", () => src.searchAll("smith"));
    await t("getRecords", () => src.getRecords());
    await t("getStarters", () => src.getStarters("s8-2026-rotterdam"));
    await t("getStationDistribution", () => src.getStationDistribution("wall-balls", "hyrox-men"));
  }, 900000);
});
