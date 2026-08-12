"use client";

/**
 * One-click CSV of a client's payment history, built in the browser from
 * the rows already on the page. Opens straight into Excel or Numbers.
 */
export function ExportPaymentsCsv({
  rows,
  filename,
}: {
  rows: Array<{
    createdISO: string;
    description: string | null;
    amountPence: number;
    status: string;
    paid: boolean;
    refundedPence: number;
  }>;
  filename: string;
}) {
  function download() {
    const esc = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      ["Date", "Description", "Amount (GBP)", "Status", "Refunded (GBP)"].join(","),
      ...rows.map((r) =>
        [
          new Date(r.createdISO).toLocaleDateString("en-GB"),
          esc(r.description ?? ""),
          (r.amountPence / 100).toFixed(2),
          r.paid ? "paid" : r.status,
          r.refundedPence ? (r.refundedPence / 100).toFixed(2) : "",
        ].join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      className="inline-flex h-9 items-center rounded-pill border border-suth-border px-3 text-xs text-suth-text-secondary hover:border-suth-border-strong hover:text-suth-text"
    >
      Export CSV ↓
    </button>
  );
}
