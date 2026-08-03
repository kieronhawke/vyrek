import { describe, it } from "vitest";
describe("pagination", () => {
  it("reads past 1000", async () => {
    const { SupabaseResultsRepository } = await import("@/lib/results/engine/supabase-repo");
    const repo = new SupabaseResultsRepository();
    const divs = await repo.listAllDivisions();
    console.log(`[g] listAllDivisions=${divs.length} (expect ~2692)`);
    const ev = await repo.getEventBySlug("s8-2026-rotterdam");
    const rd = await repo.listDivisions(ev!.id);
    const big = rd.find((d) => d.divisionKey === "open-men")!;
    const rows = await repo.listResultsForDivision(big.id);
    const count = await repo.countResultsForDivision(big.id);
    const times = await repo.listFinishTimesForDivision(big.id);
    console.log(`[g] rotterdam open-men rows=${rows.length} count=${count} finishTimes=${times.length}`);
    const evs = await repo.listEvents();
    console.log(`[g] listEvents=${evs.length}`);
  }, 900000);
});
