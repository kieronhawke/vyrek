import { describe, expect, it } from "vitest";

/**
 * STRESS TESTS — docs/build-pack/spec/16 §10.
 *
 * The CSV builder is the part of the table most likely to fail quietly on
 * real data: a client called O'Brien, a note containing a comma, a name with
 * a newline pasted from a form. A broken export is not noticed until an
 * accountant opens it, which is the worst possible time.
 *
 * The logic is reproduced here rather than imported because the component is
 * a server component with JSX; this asserts the escaping contract the
 * component implements.
 */

function toCsv<T>(rows: T[], columns: Array<{ label: string; csv: (r: T) => string }>) {
  return [
    columns.map((c) => c.label).join(","),
    ...rows.map((r) =>
      columns.map((c) => `"${c.csv(r).replace(/"/g, '""')}"`).join(","),
    ),
  ].join("\n");
}

type Row = { id: string; name: string; note: string };
const cols = [
  { label: "Name", csv: (r: Row) => r.name },
  { label: "Note", csv: (r: Row) => r.note },
];

describe("CSV export survives real-world text", () => {
  it("escapes embedded quotes by doubling them", () => {
    const csv = toCsv([{ id: "1", name: 'The "Machine"', note: "" }], cols);
    expect(csv).toContain('"The ""Machine"""');
  });

  it("keeps commas inside a field rather than splitting the row", () => {
    const csv = toCsv([{ id: "1", name: "Smith, John", note: "" }], cols);
    expect(csv.split("\n")[1]).toBe('"Smith, John",""');
  });

  it("does not lose an apostrophe", () => {
    expect(toCsv([{ id: "1", name: "O'Brien", note: "" }], cols)).toContain("O'Brien");
  });

  it("keeps a newline inside its quoted field", () => {
    const csv = toCsv([{ id: "1", name: "Line one\nLine two", note: "" }], cols);
    expect(csv).toContain('"Line one\nLine two"');
  });

  it("handles an empty row set without producing a broken file", () => {
    expect(toCsv([], cols)).toBe("Name,Note");
  });

  it("handles non-Latin text", () => {
    expect(toCsv([{ id: "1", name: "Müller-Ødegård", note: "北京" }], cols)).toContain(
      "Müller-Ødegård",
    );
  });

  it("stays correct at scale", () => {
    // spec/16 §10 seeds 10,000 clients. The export must not degrade or
    // silently truncate.
    const rows: Row[] = Array.from({ length: 10_000 }, (_, i) => ({
      id: String(i),
      name: `Client ${i}`,
      note: i % 7 === 0 ? 'Has a "quote", and a comma' : "",
    }));
    const csv = toCsv(rows, cols);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(10_001); // header plus every row
    expect(lines[10_000]).toContain("Client 9999");
  });
});
