import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * The adapter's contract with the v1 API.
 *
 * These lock the two things that would break silently on connection: the
 * response envelope, and the exact route paths. Both were wrong in the first
 * version — the paths were invented against a guessed contract, and the
 * envelope was not unwrapped at all, so every call would have returned
 * `undefined` while looking fine in code review.
 */

const ORIGINAL = { ...process.env };

async function loadAdapter() {
  vi.resetModules();
  return (await import("./api-source")).apiDataSource;
}

beforeEach(() => {
  process.env.RESULTS_API_URL = "https://example.test/api/results/v1";
});

afterEach(() => {
  process.env = { ...ORIGINAL };
  vi.restoreAllMocks();
});

function mockJson(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("v1 envelope", () => {
  it("unwraps data", async () => {
    mockJson({ data: [{ slug: "s9-2026-london" }], attribution: null, mode: "demo" });
    const events = await (await loadAdapter()).listEvents();
    expect(events).toEqual([{ slug: "s9-2026-london" }]);
  });

  it("tolerates a bare payload, so an unwrapped endpoint is not silently empty", async () => {
    mockJson([{ slug: "s9-2026-london" }]);
    expect(await (await loadAdapter()).listEvents()).toHaveLength(1);
  });

  it("keeps the attribution the API returned", async () => {
    mockJson({
      data: [],
      attribution: { timing: "mika:Timing", organiser: "HYROX", note: "n", url: "u" },
      mode: "live",
    });
    // `module` is a reserved-ish identifier in this codebase's lint rules.
    const adapter = await import("./api-source");
    await adapter.apiDataSource.listEvents();
    expect(adapter.lastAttribution()?.timing).toBe("mika:Timing");
  });
});

describe("route paths match the API that exists", () => {
  const cases: [string, (a: Awaited<ReturnType<typeof loadAdapter>>) => Promise<unknown>][] = [
    ["/events", (a) => a.listEvents()],
    ["/event/s9-2026-london", (a) => a.getEvent("s9-2026-london")],
    ["/ranking/s9-2026-london-hyrox-men", (a) => a.getRanking("s9-2026-london", "hyrox-men")],
    ["/result/abc", (a) => a.getResult("abc")],
    ["/athlete/charlie", (a) => a.getAthlete("charlie")],
    ["/starters/s9-2026-london", (a) => a.getStarters("s9-2026-london")],
    ["/search", (a) => a.searchAll("patel")],
    ["/records", (a) => a.getRecords()],
    ["/finish-times", (a) => a.getDivisionFinishTimes("s9-2026-london", "hyrox-men")],
    ["/distribution", (a) => a.getStationDistribution("row", "hyrox-men")],
  ];

  for (const [path, call] of cases) {
    it(`calls ${path}`, async () => {
      const fetchMock = mockJson({ data: [] });
      await call(await loadAdapter());
      const url = new URL(fetchMock.mock.calls[0][0] as URL);
      expect(url.pathname).toBe(`/api/results/v1${path}`);
    });
  }

  it("asks for the server cap rather than pretending to want everything", async () => {
    const fetchMock = mockJson({ data: {} });
    await (await loadAdapter()).getRanking("e", "d", { limit: Number.MAX_SAFE_INTEGER });
    const url = new URL(fetchMock.mock.calls[0][0] as URL);
    expect(url.searchParams.get("limit")).toBe("500");
  });
});

describe("failure never takes the page down", () => {
  it("returns an empty list when the API errors", async () => {
    mockJson({ error: "boom" }, 500);
    expect(await (await loadAdapter()).listEvents()).toEqual([]);
  });

  it("returns null on 404 so the caller renders not-found", async () => {
    mockJson({}, 404);
    expect(await (await loadAdapter()).getEvent("nope")).toBeNull();
  });

  it("returns no search matches rather than throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    expect(await (await loadAdapter()).searchAll("patel")).toEqual({ athletes: [], events: [] });
  });

  it("does not call the API for a query too short to mean anything", async () => {
    const fetchMock = mockJson({ data: {} });
    await (await loadAdapter()).searchAll("a");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
