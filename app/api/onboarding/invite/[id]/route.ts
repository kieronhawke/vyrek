import { NextResponse } from "next/server";
import { deleteInvite } from "@/lib/onboarding/invite-store";
import { supabaseServer } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/auth";

/**
 * CANCEL A LINK BEN HAS SENT.
 *
 * He reviewed it, sent it, then noticed the wrong figure — or the client rang
 * to move the date. The row is removed, so the link resolves to "expired" and
 * tells the client to ask Ben for a new one, and he sends the corrected link
 * from the same form. Nothing is charged by a link that no longer resolves.
 *
 * Admin-only, like creating one. A signed-token fallback link (no store) has
 * no row to remove; the admin never offers the button for those.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const sb = await supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await params;
  const removed = await deleteInvite(id);
  if (!removed) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
