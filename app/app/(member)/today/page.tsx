import { assertMember } from "@/lib/member/auth";
import { programmeLabel } from "@/lib/member/demo";
import { TodayScreen } from "@/components/member/screens/today-screen";

/**
 * TODAY — the tab the app opens on.
 *
 * The page is the auth boundary and nothing else; the screen is in
 * components/member/screens so the ungated preview can render it too.
 */
export default async function TodayPage() {
  const ctx = await assertMember("/app/today");
  const firstName =
    ctx.user.email
      .replace(/@.*/, "")
      .split(/[\W_]+/)[0]
      ?.replace(/^./, (c) => c.toUpperCase()) ?? "athlete";

  return (
    <TodayScreen firstName={firstName} programme={programmeLabel(ctx.programme)} />
  );
}
