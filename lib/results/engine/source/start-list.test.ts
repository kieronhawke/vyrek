/**
 * How the entrants for a race that has not happened yet are actually fetched.
 *
 * ⚠️ The failure this guards against is silent by construction.
 *
 * `?pid=startlist` is the search *form*. It answers 200 with a complete, valid
 * page — race picker, division picker, navigation — and no entrants, whatever
 * query parameters are attached. Nothing about the response says it is empty
 * for the wrong reason, so the old GET implementation returned zero rows for
 * every upcoming event and every layer above it faithfully reported none.
 *
 * Our HYROX Chiba 2026 page read "0 athletes" two days before the race while
 * the source held over a thousand.
 *
 * The entrants come back from a POST to `startlist_list`. These pin that, so a
 * regression to GET fails here rather than in production as an empty page.
 */

import { describe, expect, it, vi } from "vitest";
import { createHyroxChain } from "./hyrox-adapter";
import { SourceFetcher } from "../fetch/fetcher";

/** The form page: what the source returns for a GET to `pid=startlist`. */
const FORM_ONLY = `
  <html><body>
    <h2>Start List</h2>
    <form name="form_search_simple" action="?pid=startlist_list&pidp=upcoming_nav" method="post">
      <select name="event_main_group"><option value="2026 Chiba">2026 Chiba</option></select>
      <select name="event"><option value="H_LR3MS4JI1738">HYROX (Saturday)</option></select>
    </form>
  </body></html>`;

/** Two entrants, in the markup the real board uses. */
const WITH_ENTRANTS = `
  <html><body>
    <h2>Start List: 2026 Chiba / HYROX (Saturday)</h2>
    <div class='col-sm-12 row-xs' data-sex='M'>
    <ul class="list-group">
      <li class="list-group-item">
        <div class="list-field type-fullname"><a href="?content=detail&idp=AAA1">Hudson Chan</a></div>
        <div class="list-field type-age_class">40-44</div>
        <div class="list-field type-nation_flag">HKG</div>
      </li>
      <li class="list-group-item">
        <div class="list-field type-fullname"><a href="?content=detail&idp=AAA2">Simon McIntyre</a></div>
        <div class="list-field type-age_class">35-39</div>
        <div class="list-field type-nation_flag">AUS</div>
      </li>
    </ul>
    </div>
  </body></html>`;

type Seen = { url: string; method?: string; body?: string };

function harness(body: string) {
  const seen: Seen[] = [];
  const fetchImpl = vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
    seen.push({ url, method: init?.method, body: init?.body });
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => body,
    };
  });
  const chain = createHyroxChain(
    new SourceFetcher({ fetchImpl, authorised: true, maxAttempts: 1 }),
  );
  return { chain, seen };
}

describe("fetching a start list", () => {
  it("posts to startlist_list rather than getting the form", async () => {
    const { chain, seen } = harness(WITH_ENTRANTS);

    await chain.fetchStartList("season-9", "H_LR3MS4JI1738#men");

    const request = seen[0];
    expect(request.method).toBe("POST");
    expect(request.url).toContain("pid=startlist_list");
    // The bug, named: this is the page that only ever renders a form.
    expect(request.url).not.toMatch(/pid=startlist(&|$)/);
  });

  it("sends the division as the form's event field", async () => {
    const { chain, seen } = harness(WITH_ENTRANTS);

    await chain.fetchStartList("season-9", "H_LR3MS4JI1738#men");

    const body = new URLSearchParams(seen[0].body ?? "");
    expect(body.get("event")).toBe("H_LR3MS4JI1738");
    // The `#men` suffix is ours, not theirs; it becomes the sex filter.
    expect(body.get("search[sex]")).toBe("M");
  });

  it("asks for a full page rather than the default 25", async () => {
    const { chain, seen } = harness(WITH_ENTRANTS);

    await chain.fetchStartList("season-9", "H_LR3MS4JI1738#men");

    expect(new URLSearchParams(seen[0].body ?? "").get("num_results")).toBe("100");
  });

  it("returns the entrants", async () => {
    const { chain } = harness(WITH_ENTRANTS);

    const page = await chain.fetchStartList("season-9", "H_LR3MS4JI1738#men");

    expect(page.rows.map((r) => r.name)).toEqual(["Hudson Chan", "Simon McIntyre"]);
  });

  it("reports the weekend the division belongs to", async () => {
    const { chain } = harness(WITH_ENTRANTS);

    const page = await chain.fetchStartList("season-9", "H_LR3MS4JI1738#men");

    expect(page.sourceDivisionId).toBe("H_LR3MS4JI1738#men");
  });

  it("comes back empty when the source really has published nothing", async () => {
    // Chiba's doubles and relay boards genuinely answer with no entrants. That
    // has to stay distinguishable from a broken request only by what was asked
    // for — hence the assertions above about *how* it asks.
    const { chain } = harness(FORM_ONLY);

    const page = await chain.fetchStartList("season-9", "HD_LR3MS4JI1739#women");

    expect(page.rows).toEqual([]);
  });
});
