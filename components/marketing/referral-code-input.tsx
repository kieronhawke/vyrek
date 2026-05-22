"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Status = "idle" | "checking" | "valid" | "invalid";

export function ReferralCodeInput() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const validate = async (value: string) => {
    setStatus("checking");
    try {
      const res = await fetch("/api/referral/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value }),
      });
      const data = (await res.json()) as { valid: boolean };
      setStatus(data.valid ? "valid" : "invalid");
    } catch {
      setStatus("invalid");
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-vyrek-text-secondary underline-offset-4 hover:underline"
      >
        Have a code from a friend?
      </button>
    );
  }

  return (
    <div className="w-full space-y-2">
      <label
        htmlFor="referral-code"
        className="block font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary"
      >
        Referral code
      </label>
      <div className="flex items-center gap-2">
        <input
          id="referral-code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setStatus("idle");
          }}
          onBlur={() => code && validate(code)}
          autoComplete="off"
          spellCheck={false}
          maxLength={12}
          placeholder="K7M9X2P4"
          className={cn(
            "flex-1 rounded-md border bg-vyrek-base px-3 py-2.5 font-mono text-sm uppercase tracking-[0.12em] text-vyrek-text outline-none transition-colors",
            status === "valid"
              ? "border-vyrek-success"
              : status === "invalid"
                ? "border-vyrek-danger"
                : "border-vyrek-border",
          )}
        />
        {status === "checking" && (
          <span className="text-xs text-vyrek-text-tertiary">Checking…</span>
        )}
        {status === "valid" && (
          <span className="text-xs text-vyrek-success">✓ Applied</span>
        )}
        {status === "invalid" && (
          <span className="text-xs text-vyrek-danger">Not valid</span>
        )}
      </div>
    </div>
  );
}
