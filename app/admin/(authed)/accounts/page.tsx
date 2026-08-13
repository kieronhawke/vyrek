import { PageHeader, NoticeCard } from "@/components/admin/ui";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin/auth";
import {
  AccountsManager,
  type AccountRow,
} from "@/components/admin/accounts-manager";

export const dynamic = "force-dynamic";

export const metadata = { title: "Accounts" };

/**
 * Customer login accounts, read live from Supabase Auth.
 *
 * A "disabled" account is one Supabase has banned into the far future
 * (banned_until in the future). It still exists and keeps its data, it just
 * cannot sign in. Enabling clears that ban.
 */
export default async function AdminAccountsPage() {
  let accounts: AccountRow[] | null = null;

  try {
    const { data, error } = await supabaseAdmin().auth.admin.listUsers({
      perPage: 200,
    });
    if (error) throw error;

    const now = Date.now();
    accounts = data.users
      .map((u) => {
        // banned_until is present on the admin API response but not on the
        // base User type, so read it defensively.
        const bannedUntil = (u as { banned_until?: string | null })
          .banned_until;
        const disabled =
          !!bannedUntil && new Date(bannedUntil).getTime() > now;
        return {
          id: u.id,
          email: u.email ?? "(no email)",
          createdISO: u.created_at,
          confirmed: !!u.email_confirmed_at,
          disabled,
          isAdmin: isAdminEmail(u.email),
        };
      })
      .sort((a, b) => (a.createdISO < b.createdISO ? 1 : -1));
  } catch {
    accounts = null;
  }

  return (
    <>
      <PageHeader
        eyebrow="Members"
        title="Accounts"
        description="Customer login accounts. Create a login, or disable one so it can no longer sign in."
      />
      {accounts === null ? (
        <NoticeCard
          title="Auth unavailable"
          body="Couldn't reach Supabase Auth just now. Refresh in a moment. Nothing is wrong with the accounts themselves."
        />
      ) : (
        <AccountsManager accounts={accounts} />
      )}
    </>
  );
}
