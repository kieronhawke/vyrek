import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Storing and reading inbound client SMS replies. Both sides fail soft: a
 * store failure must never make the Twilio webhook retry (that's how one bad
 * message becomes a retry storm), and a read failure must never break the
 * admin page — if the table isn't there yet, the inbox is simply empty.
 */

export type InboundMessage = {
  id: string;
  fromNumber: string;
  body: string;
  receivedISO: string;
  handled: boolean;
};

/** Best-effort persist. Returns whether it stored; never throws. */
export async function saveInboundMessage(msg: {
  from: string;
  body: string;
  messageSid?: string | null;
}): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin()
      .from("inbound_messages")
      .upsert(
        {
          from_number: msg.from,
          body: msg.body,
          message_sid: msg.messageSid || null,
        },
        { onConflict: "message_sid" },
      );
    return !error;
  } catch {
    return false;
  }
}

export async function recentInboundMessages(limit = 20): Promise<InboundMessage[]> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("inbound_messages")
      .select("id, from_number, body, received_at, handled")
      .order("received_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []).map((r) => ({
      id: r.id as string,
      fromNumber: r.from_number as string,
      body: r.body as string,
      receivedISO: r.received_at as string,
      handled: r.handled as boolean,
    }));
  } catch {
    return [];
  }
}
