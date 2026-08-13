"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Badge, Table } from "@/components/admin/ui";
import { createAccount, setAccountDisabled } from "@/lib/admin/account-actions";

export type AccountRow = {
  id: string;
  email: string;
  createdISO: string;
  confirmed: boolean;
  disabled: boolean;
  /** An admin-allowlisted login — never offered a Disable control. */
  isAdmin?: boolean;
};

/**
 * Lists customer login accounts with an enable/disable toggle per row and a
 * small create-account form. All mutations go through the "use server"
 * actions, then router.refresh() re-reads the list from Supabase Auth.
 */
export function AccountsManager({ accounts }: { accounts: AccountRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createOk, setCreateOk] = useState<string | null>(null);

  async function toggle(row: AccountRow) {
    setBusyId(row.id);
    setRowError(null);
    try {
      const r = await setAccountDisabled(row.id, !row.disabled);
      if (!r.ok) {
        setRowError(r.error ?? "Something went wrong.");
      } else {
        router.refresh();
      }
    } catch {
      setRowError("Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  async function submitCreate() {
    setCreating(true);
    setCreateError(null);
    setCreateOk(null);
    try {
      const r = await createAccount(email, password);
      if (!r.ok) {
        setCreateError(r.error ?? "Couldn't create the account.");
      } else {
        setCreateOk(`Account created for ${email.trim().toLowerCase()}.`);
        setEmail("");
        setPassword("");
        router.refresh();
      }
    } catch {
      setCreateError("Couldn't create the account.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          Create account
        </h2>
        <div className="rounded-lg border border-suth-border-subtle bg-suth-elevated p-5">
          <p className="mb-4 text-sm text-suth-text-secondary">
            Creates a confirmed login straight away. The customer can sign in
            with this email and password at once. Password must be at least 8
            characters.
          </p>
          {createOk ? (
            <p className="mb-3 text-sm text-emerald-300" role="status">
              {createOk}
            </p>
          ) : null}
          {createError ? (
            <p className="mb-3 text-sm text-suth-danger" role="alert">
              {createError}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="new-email" className="sr-only">
              Email
            </label>
            <input
              id="new-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="h-12 w-full rounded-lg border border-suth-border bg-suth-base px-3 text-[16px] text-suth-text outline-none focus:border-suth-accent sm:w-64"
            />
            <label htmlFor="new-password" className="sr-only">
              Password
            </label>
            <input
              id="new-password"
              type="text"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 8 chars)"
              className="h-12 w-full rounded-lg border border-suth-border bg-suth-base px-3 text-[16px] text-suth-text outline-none focus:border-suth-accent sm:w-64"
            />
            <button
              type="button"
              disabled={creating || !email || !password}
              onClick={submitCreate}
              className="inline-flex h-12 items-center justify-center rounded-pill bg-suth-accent px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {creating ? "Creating…" : "Create account"}
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          Login accounts
        </h2>
        {rowError ? (
          <p className="mb-3 text-sm text-suth-danger" role="alert">
            {rowError}
          </p>
        ) : null}
        <Table
          headers={["Email", "Created", "Status", ""]}
          empty="No login accounts yet."
          rows={accounts.map((row) => [
            <span key="e" className="text-suth-text">
              {row.email}
            </span>,
            <span key="c" className="text-suth-text-secondary">
              {format(new Date(row.createdISO), "dd MMM yyyy")}
            </span>,
            <span key="s" className="flex flex-wrap gap-2">
              {row.disabled ? (
                <Badge tone="bad">disabled</Badge>
              ) : (
                <Badge tone="good">active</Badge>
              )}
              {row.isAdmin ? <Badge tone="neutral">admin</Badge> : null}
              {row.confirmed ? (
                <Badge tone="neutral">confirmed</Badge>
              ) : (
                <Badge tone="warn">unconfirmed</Badge>
              )}
            </span>,
            row.isAdmin ? (
              <span key="a" className="text-xs text-suth-text-tertiary">
                Managed via ADMIN_EMAILS
              </span>
            ) : (
              <button
                key="a"
                type="button"
                disabled={busyId === row.id}
                onClick={() => toggle(row)}
                className="inline-flex h-9 items-center justify-center rounded-pill border border-suth-border px-4 text-xs font-semibold text-suth-text transition-colors hover:border-suth-border-strong disabled:opacity-40"
              >
                {busyId === row.id
                  ? "Working…"
                  : row.disabled
                    ? "Enable"
                    : "Disable"}
              </button>
            ),
          ])}
        />
      </section>
    </div>
  );
}
