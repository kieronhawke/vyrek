import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
  type LinkProps,
} from "@react-email/components";
import type { ReactNode } from "react";
import {
  ACCENT,
  BG,
  BORDER,
  SURFACE,
  TEXT,
  TEXT_DIM,
  TEXT_FAINT,
  bodyStyle,
  containerStyle,
  ctaPrimary,
  fontStack,
  hrRule,
  monoEyebrow,
  monoStack,
} from "@/lib/email/templates/_styles";

/**
 * Shared chrome for every Suth Performance email.
 *
 * Before this, each template repeated its own Html/Head/Body/Container and
 * a text-only "[ SUTH PERFORMANCE ]" eyebrow, so nothing carried the brand
 * and nothing linked back to the site. This gives all of them one header,
 * one footer, one set of links, and one signature from Ben.
 *
 * Email-client constraints this is built around, none of them optional:
 *
 *  - Inline styles only. Gmail strips <style> blocks and every class.
 *  - Single column, max 560px, fluid below that. Multi-column breaks in
 *    Outlook and on phones.
 *  - Images are blocked by default in a lot of clients, so the logo carries
 *    real alt text and no email depends on an image to make sense.
 *  - Absolute URLs everywhere. Relative paths resolve against the mail
 *    client's own domain and 404.
 *  - Minimum 16px body text: anything smaller triggers iOS auto-zoom and
 *    the layout jumps.
 *  - Buttons are padded links, not <button>. Buttons don't work in email.
 */

/**
 * The bgcolor attribute, spread onto raw table elements. React's types
 * dropped it (it is deprecated HTML) but Outlook still needs it, so it goes
 * on as a plain attribute record.
 */
const OUTLOOK_BG = { bgcolor: BG } as Record<string, string>;

/** Absolute base for links and images. Never use a relative path here. */
function base(): string {
  // The www host is the canonical one: the apex 308-redirects to it. Email
  // clients are far less forgiving of redirects than browsers, and some
  // simply will not follow one for an <img>, so links and images must point
  // at the final destination rather than the hop.
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://www.suthperformance.com"
  );
}

export function url(path: string): string {
  return `${base()}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Adds a UTM tag so email traffic is attributable in analytics rather than
 * landing in "direct" and looking like it came from nowhere.
 */
export function trackedUrl(path: string, campaign: string): string {
  const u = new URL(url(path));
  u.searchParams.set("utm_source", "email");
  u.searchParams.set("utm_medium", "lifecycle");
  u.searchParams.set("utm_campaign", campaign);
  return u.toString();
}

const headerStyle = {
  /* Room to breathe. At 8px the wordmark sat directly on top of the eyebrow
     and the two read as one four-line block. */
  paddingBottom: 26,
};

const h1Style = {
  color: TEXT,
  fontFamily: fontStack,
  fontSize: 28,
  fontWeight: 800,
  letterSpacing: "-0.02em",
  lineHeight: "1.15",
  margin: "16px 0 0",
};

const pStyle = {
  color: TEXT_DIM,
  fontFamily: fontStack,
  fontSize: 16,
  lineHeight: "1.6",
  margin: "16px 0 0",
};

const footerLinkStyle = {
  color: TEXT_FAINT,
  fontFamily: fontStack,
  fontSize: 13,
  textDecoration: "underline",
};

/** Body copy. Use instead of raw <Text> so sizing stays consistent. */
export function P({
  children,
  dim = true,
}: {
  children: ReactNode;
  dim?: boolean;
}) {
  return <Text style={{ ...pStyle, color: dim ? TEXT_DIM : TEXT }}>{children}</Text>;
}

export function H1({ children }: { children: ReactNode }) {
  return <Text style={h1Style}>{children}</Text>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={monoEyebrow}>[ {children} ]</Text>;
}

/** Primary call to action. One per email: two competing buttons halves both. */
export function Btn({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
} & Partial<LinkProps>) {
  return (
    <Section style={{ margin: "28px 0 8px" }}>
      <Link href={href} style={ctaPrimary}>
        {children}
      </Link>
    </Section>
  );
}

/** Boxed aside: plan details, what happens next, a summary of answers. */
export function Panel({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <Section
      style={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        margin: "24px 0 0",
        padding: "20px 22px",
      }}
    >
      {title ? (
        <Text
          style={{
            ...monoEyebrow,
            color: TEXT_FAINT,
            margin: "0 0 12px",
          }}
        >
          {title}
        </Text>
      ) : null}
      {children}
    </Section>
  );
}

/** Label/value row inside a Panel. */
export function Row({ label, value }: { label: string; value: string }) {
  return (
    <Text
      style={{
        color: TEXT,
        fontFamily: fontStack,
        fontSize: 15,
        lineHeight: "1.5",
        margin: "0 0 8px",
      }}
    >
      <span style={{ color: TEXT_FAINT }}>{label}: </span>
      {value}
    </Text>
  );
}

/** Ben's signature. Every lifecycle email is from a person, never a brand. */
export function SignOff({ line }: { line?: string }) {
  return (
    <>
      {line ? <P>{line}</P> : null}
      <Text
        style={{
          color: TEXT,
          fontFamily: fontStack,
          fontSize: 16,
          lineHeight: "1.6",
          margin: "24px 0 0",
        }}
      >
        Ben
        <br />
        <span style={{ color: TEXT_FAINT, fontSize: 14 }}>
          Suth Performance
        </span>
      </Text>
    </>
  );
}

export function EmailLayout({
  preview,
  children,
  /** Adds the one-click unsubscribe line. Off for transactional mail. */
  marketing = false,
  /**
   * An email to Ben rather than to a client.
   *
   * Drops the marketing footer. "Suth Club · HYROX guides · Journal · Contact"
   * is a set of links inviting the reader to go and look at the website — and
   * the reader here owns the website. On an internal email it is four links
   * nobody will ever press, sitting under the one thing he is meant to do,
   * competing with it.
   */
  internal = false,
  /**
   * The four site links in the footer.
   *
   * Off for anything transactional. A payment email asks the reader to do one
   * thing, and "Suth Club · HYROX guides · Journal · Contact" underneath it is
   * four invitations to go and do something else instead — which is most of
   * what "too much going on" means on a screen that small.
   */
  nav = true,
  campaign = "general",
}: {
  preview: string;
  children: ReactNode;
  marketing?: boolean;
  internal?: boolean;
  nav?: boolean;
  campaign?: string;
}) {
  return (
    <Html lang="en">
      <Head>
        {/* Declares the design as dark so Gmail, Apple Mail and Outlook.com
            stop auto-inverting it. Without this a dark email gets its
            colours "helpfully" flipped and the result is unreadable. */}
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
      </Head>
      {/* The preview line is the third piece of copy in an inbox after the
          sender and subject, and the most commonly wasted. */}
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        {/* Outlook's Word rendering engine ignores CSS backgrounds on
            <body>. A full-width wrapper table carrying the deprecated
            bgcolor attribute is the only thing it reliably honours, and
            it is what keeps the design dark instead of falling back to
            white with near-white text on it. */}
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          style={{ background: BG, width: "100%" }}
          {...OUTLOOK_BG}
        >
          <tbody>
            <tr>
              <td align="center" style={{ background: BG }} {...OUTLOOK_BG}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            {/*
              THE WORDMARK IS TEXT, NOT A PICTURE OF TEXT.
              ⚠️ IT USED TO BE A 13KB PNG, AND THAT WAS THE PROBLEM.

              Two complaints, one cause. It "took a few seconds to appear"
              because /public on Vercel is served `max-age=0,
              must-revalidate`, so every open of every email made a fresh
              conditional request — measured at 0.4 to 1.1 seconds, every
              time, for ever. And it "sometimes didn't appear at all" because
              blocking remote images is the DEFAULT in Outlook desktop and
              most corporate mail, so for those readers the header was empty
              space above the message.

              Text has neither problem: it is in the message, it paints with
              the message, and no client can decline to show it. The letter-
              forms are not Oswald — email strips @font-face — but a wordmark
              that is always there in Helvetica beats a perfect one that is
              sometimes missing. The square full stop is the brand's, and it
              is a styled table cell rather than an image so it survives too.
            */}
            <Link
              href={trackedUrl("/", campaign)}
              style={{ color: TEXT, textDecoration: "none" }}
            >
              <table role="presentation" cellPadding={0} cellSpacing={0} border={0}>
                <tbody>
                  <tr>
                    <td>
                      {/* The full stop is a character, not a coloured cell.
                          A filled table cell would have been a second block
                          of chartreuse in the markup, which is how the "one
                          call to action" guard counts buttons — and it needed
                          a 1px font size to stop the spacer growing, which
                          the "nothing under 11px" guard rightly refuses. A
                          period in the accent colour needs neither.

                          Both lines share one cell, separated by a break,
                          because two table rows come out of the plain-text
                          renderer as "SUTH.Performance" on a single line —
                          and the text alternative is the whole email for a
                          screen reader. */}
                      <span
                        style={{
                          color: TEXT,
                          fontFamily: fontStack,
                          fontSize: 30,
                          fontWeight: 800,
                          letterSpacing: "0.01em",
                          lineHeight: "1.2",
                        }}
                      >
                        SUTH<span style={{ color: ACCENT }}>.</span>
                      </span>
                      <br />
                      <span
                        style={{
                          color: TEXT_DIM,
                          fontFamily: monoStack,
                          fontSize: 11,
                          letterSpacing: "0.3em",
                          lineHeight: "1.6",
                          textTransform: "uppercase",
                        }}
                      >
                        Performance
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Link>
          </Section>

          {children}

          <Hr style={hrRule} />

          <Section>
            {internal || !nav ? null : (
            <Text
              style={{
                color: TEXT_FAINT,
                fontFamily: fontStack,
                fontSize: 13,
                lineHeight: "1.7",
                margin: 0,
              }}
            >
              <Link href={trackedUrl("/club", campaign)} style={footerLinkStyle}>
                Suth Club
              </Link>
              {"  ·  "}
              <Link
                href={trackedUrl("/hyrox", campaign)}
                style={footerLinkStyle}
              >
                HYROX guides
              </Link>
              {"  ·  "}
              <Link
                href={trackedUrl("/blog", campaign)}
                style={footerLinkStyle}
              >
                Journal
              </Link>
              {"  ·  "}
              <Link
                href={trackedUrl("/contact", campaign)}
                style={footerLinkStyle}
              >
                Contact
              </Link>
            </Text>
            )}

            <Text
              style={{
                color: TEXT_FAINT,
                fontFamily: monoStack,
                fontSize: 11,
                letterSpacing: "0.16em",
                lineHeight: "1.8",
                margin: "16px 0 0",
                textTransform: "uppercase",
              }}
            >
              Suth Performance · Made in UK
            </Text>

            {marketing ? (
              <Text
                style={{
                  color: TEXT_FAINT,
                  fontFamily: fontStack,
                  fontSize: 12,
                  lineHeight: "1.6",
                  margin: "10px 0 0",
                }}
              >
                You&apos;re getting this because you asked us for a training
                plan.{" "}
                <Link
                  href={trackedUrl("/app/account", campaign)}
                  style={footerLinkStyle}
                >
                  Unsubscribe
                </Link>{" "}
                in one click, any time.
              </Text>
            ) : null}
          </Section>
        </Container>
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  );
}

export { ACCENT, BG, BORDER, SURFACE, TEXT, TEXT_DIM, TEXT_FAINT };
