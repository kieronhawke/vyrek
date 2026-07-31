import { NextResponse } from "next/server";
import { render } from "@react-email/components";
import { EMAIL_SAMPLES } from "@/lib/email/catalogue";
import { sendRawTest } from "@/lib/email/send";

export const dynamic = "force-dynamic";

/**
 * Dev-only template validator.
 *
 * Email templates can only be trusted once they've actually been rendered,
 * and the Playwright runner applies its own JSX transform, so importing the
 * templates into a spec produces elements React refuses to render. This
 * route renders them inside Next, in the same runtime that will send them,
 * and returns a diagnosis the test can assert on.
 *
 * 404s in production: it exposes internal lifecycle copy and there is no
 * reason for it to exist on a live site.
 */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  // `?id=lead-confirmation` returns that template's raw HTML, so a single
  // email can be opened in a browser or screenshotted without going
  // through the admin gate.
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const sample = EMAIL_SAMPLES.find((s) => s.id === id);
    if (!sample) {
      return new NextResponse(`Unknown template: ${id}`, { status: 404 });
    }
    return new NextResponse(await render(sample.element), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const results = await Promise.all(
    EMAIL_SAMPLES.map(async (sample) => {
      try {
        const html = await render(sample.element);
        // The text/plain alternative Resend sends alongside the HTML.
        const plain = await render(sample.element, { plainText: true });
        const relativeLinks = [
          ...html.matchAll(/href="(?!https?:|mailto:|tel:|#)([^"]+)"/g),
        ].map((m) => m[1]);
        const images = [...html.matchAll(/<img[^>]*>/g)].map((m) => m[0]);

        return {
          id: sample.id,
          audience: sample.audience,
          subject: sample.subject,
          subjectLength: sample.subject.length,
          ok: true,
          bytes: html.length,
          hasHtmlTag: html.includes("<html") && html.includes("</html>"),
          rendersUndefined: html.includes("undefined"),
          rendersObject: html.includes("[object Object]"),
          relativeLinks,
          imagesWithoutAlt: images.filter((i) => !/alt="[^"]+"/.test(i)).length,
          mentionsStalePrice: html.includes("£8.99"),
          // Gmail clips anything past ~102KB and shows a "view entire
          // message" link, which breaks tracking and looks broken.
          overGmailClipLimit: html.length > 102_000,
          plainTextChars: plain.trim().length,
          // Clients that force light mode will invert a dark design unless
          // it declares itself, and Outlook ignores CSS backgrounds.
          declaresColorScheme: html.includes('name="color-scheme"'),
          hasOutlookBgcolor: html.includes("bgcolor="),
        };
      } catch (err) {
        return {
          id: sample.id,
          audience: sample.audience,
          subject: sample.subject,
          subjectLength: sample.subject.length,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );

  return NextResponse.json({ count: results.length, results });
}

/**
 * Dev-only test send. `POST { id, to }` renders one template and sends it
 * through the real pipeline, so it can be checked in an actual inbox on an
 * actual phone, which is the only way to know how Gmail and Outlook really
 * treat it.
 *
 * Locked to non-production and to the CONSULTATION_INBOX address, so it can
 * never be used to send to an arbitrary recipient.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  const { id, to } = (await req.json().catch(() => ({}))) as {
    id?: string;
    to?: string;
  };

  const allowed = (
    process.env.CONSULTATION_INBOX ?? "kieron.hawke@gmail.com"
  ).toLowerCase();
  const recipient = (to ?? allowed).toLowerCase();
  if (recipient !== allowed) {
    return NextResponse.json(
      { ok: false, error: `Test sends are limited to ${allowed}` },
      { status: 403 },
    );
  }

  const sample = EMAIL_SAMPLES.find((s) => s.id === id);
  if (!sample) {
    return NextResponse.json(
      { ok: false, error: `Unknown template: ${id}` },
      { status: 404 },
    );
  }

  const result = await sendRawTest({
    to: recipient,
    subject: `[TEST] ${sample.subject}`,
    react: sample.element,
  });
  return NextResponse.json({ ok: result.ok, id: sample.id, result });
}
