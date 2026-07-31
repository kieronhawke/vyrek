import { AdminShell } from "@/components/control/admin-shell";
import { DataTable, type Column } from "@/components/control/data-table";
import { USER_ROWS, type UserRow } from "@/lib/control/admin-fixtures";
import { ModuleNote, StatStrip } from "@/components/control/stat-strip";

const BASE = "/control-preview/admin";

/**
 * ACCOUNTS & SECURITY — spec/09 §13. 2FA is mandatory for Owner and Staff
 * and optional for Coach: forcing it on Ben causes friction, and his role
 * has no destructive permissions, so the risk is acceptable.
 */
const COLUMNS: Column<UserRow>[] = [
  { key: "name", label: "User", render: (r) => r.name, csv: (r) => r.name },
  { key: "role", label: "Role", render: (r) => r.role, csv: (r) => r.role },
  {
    key: "tfa", label: "2FA",
    render: (r) => {
      const required = r.role !== "Coach";
      if (r.twoFactor) return <span style={{ color: "var(--accent)" }}>On</span>;
      return (
        <span style={{ color: required ? "var(--danger)" : "var(--text-muted)" }}>
          {required ? "Required, not set" : "Off, optional for coaches"}
        </span>
      );
    },
    csv: (r) => (r.twoFactor ? "on" : "off"),
  },
  { key: "seen", label: "Last seen", render: (r) => r.lastSeen, csv: (r) => r.lastSeen },
];

export default function AdminAccounts() {
  return (
    <AdminShell base={BASE} title="Accounts">
      <StatStrip
        stats={[
          { label: "Users", value: String(USER_ROWS.length) },
          {
            label: "2FA on",
            value: String(USER_ROWS.filter((u) => u.twoFactor).length),
          },
          {
            label: "Required but unset",
            value: String(
              USER_ROWS.filter((u) => u.role !== "Coach" && !u.twoFactor).length,
            ),
            tone: "danger",
          },
          {
            label: "Audit entries",
            value: "0",
            note: "Append-only, enforced by a database trigger",
          },
        ]}
      />
      <DataTable rows={USER_ROWS} columns={COLUMNS} caption="users" />
      <ModuleNote>
        Roles, granular permissions, session management and the full audit log
        arrive with Phase A. The audit log is already written as append-only,
        enforced by a database trigger rather than application code.
      </ModuleNote>
    </AdminShell>
  );
}
