import { render } from "@react-email/components";
import { PageHeader } from "@/components/admin/ui";
import { EMAIL_SAMPLES } from "@/lib/email/catalogue";
import { SMS_SAMPLES, isGsm7, segments, smsLength } from "@/lib/sms/messages";

export const dynamic = "force-dynamic";

/**
 * Messaging preview: every lifecycle email and text message, rendered with
 * realistic sample data.
 *
 * Emails are notoriously hard to review before they're live, so this exists
 * to make the whole set reviewable in one place, on a phone, before anything
 * is wired to a provider. Each email renders in an iframe at 390px, which is
 * the width most of them will actually be read at.
 *
 * Nothing here sends anything.
 */
export default async function AdminMessagingPage() {
  const emails = await Promise.all(
    EMAIL_SAMPLES.map(async (sample) => ({
      ...sample,
      html: await render(sample.element, { pretty: false }),
    })),
  );

  return (
    <>
      <PageHeader
        eyebrow="Messaging"
        title="Emails and texts"
        description="Every lifecycle message with sample data. Previews only, nothing sends from this page."
      />

      <section className="mt-10">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
          [ {emails.length} emails ]
        </h2>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          {emails.map((e) => (
            <article
              key={e.id}
              className="rounded-lg border border-suth-border-subtle bg-suth-elevated p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-suth-text-tertiary">
                  {e.audience} · {e.when}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-suth-text-tertiary">
                  {e.id}
                </p>
              </div>

              <p className="mt-3 text-sm font-semibold text-suth-text">
                Subject: {e.subject}
              </p>

              {/* 390px is an iPhone 13. If it works here it works anywhere. */}
              <div className="mt-4 overflow-hidden rounded-md border border-suth-border">
                <iframe
                  title={`${e.id} preview`}
                  srcDoc={e.html}
                  sandbox=""
                  className="h-[560px] w-full bg-[#0A0A0A]"
                  style={{ colorScheme: "dark" }}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
          [ {SMS_SAMPLES.length} text messages ]
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-suth-text-secondary">
          One segment is 160 characters. Anything longer bills as two and can
          be truncated, and a single emoji or curly quote drops the limit to
          70. Every message below is checked against both.
        </p>

        <div className="mt-6 space-y-3">
          {SMS_SAMPLES.map((s) => {
            const len = smsLength(s.text);
            const segs = segments(s.text);
            const gsm = isGsm7(s.text);
            const ok = segs === 1 && gsm;
            return (
              <article
                key={s.id}
                className="rounded-lg border border-suth-border-subtle bg-suth-elevated p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-suth-text-tertiary">
                    {s.audience} · {s.when}
                  </p>
                  <p
                    className={`font-mono text-[10px] uppercase tracking-[0.2em] ${
                      ok ? "text-suth-accent" : "text-red-400"
                    }`}
                  >
                    {len} chars · {segs} segment{segs === 1 ? "" : "s"}
                    {gsm ? "" : " · NOT GSM-7"}
                  </p>
                </div>

                {/* Bubble, so the length is judged the way it will be read. */}
                <div className="mt-4 max-w-sm rounded-2xl rounded-bl-sm bg-suth-base px-4 py-3">
                  <p className="text-[15px] leading-relaxed text-suth-text">
                    {s.text}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
