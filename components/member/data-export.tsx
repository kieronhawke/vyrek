"use client";

import { useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";

/**
 * DOWNLOAD EVERYTHING — and this time it downloads something.
 *
 * The row on Account said "Request →" and had no handler on it at all. It was
 * a link to nowhere on the one control that exists to satisfy a legal right,
 * which is a bad thing to get wrong twice: once because the athlete cannot
 * get their data, and once because a UK subject access request has a
 * statutory deadline and a button that quietly does nothing does not stop the
 * clock.
 *
 * WHAT IT EXPORTS
 * ---------------
 * Everything the app is actually holding, which today is everything in this
 * browser: the profile, the food log, the thread, the tracker, the settings.
 * That is the honest scope — the server holds an account row and a Stripe
 * customer, and those come out of the server side when it exists.
 *
 * A JSON file rather than a PDF: it is the format a person can open, a
 * developer can read, and another service can import. A prettier export
 * nobody can use is not a better one.
 */

const PREFIX = "suth.store.v1.";

export function DataExport({ email }: { email: string }) {
  const mounted = useHydrated();
  const [done, setDone] = useState(false);

  function download() {
    const data: Record<string, unknown> = {};
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key?.startsWith(PREFIX)) continue;
        const raw = window.localStorage.getItem(key);
        if (raw === null) continue;
        try {
          data[key.slice(PREFIX.length)] = JSON.parse(raw);
        } catch {
          // Not JSON. Include it as written rather than dropping it — an
          // export that silently omits something is not an export.
          data[key.slice(PREFIX.length)] = raw;
        }
      }
    } catch {
      /* Storage blocked. The file still downloads, with whatever was
         readable and the note below saying what it covers. */
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      account: { email },
      note:
        "Everything Suth Performance holds in this browser. Account and billing records held on our servers are not in this file — ask Ben and they will be sent within one month, which is the statutory deadline.",
      data,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suth-performance-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    /* Revoked on the next tick rather than immediately: Safari has not always
       started the download by the time this line runs. */
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDone(true);
  }

  return (
    <span className="de">
      <button
        type="button"
        className="member-linkbtn"
        onClick={download}
        disabled={!mounted}
      >
        {done ? "Downloaded" : "Download →"}
      </button>
    </span>
  );
}
