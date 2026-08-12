import {
  EmailLayout,
  Eyebrow,
  H1,
  P,
  SignOff,
} from "@/lib/email/templates/_layout";

/**
 * A one-off note from Ben, sent from Coach Mode. Kept deliberately
 * plain: his words are the content.
 */
export function CoachNoteEmail({
  firstName,
  body,
}: {
  firstName: string;
  body: string;
}) {
  return (
    <EmailLayout preview={body.slice(0, 90)} campaign="coach-note">
      <Eyebrow>From Ben</Eyebrow>
      <H1>Hi {firstName},</H1>
      {body.split(/\n{2,}/).map((para, i) => (
        <P key={i}>{para}</P>
      ))}
      <SignOff />
    </EmailLayout>
  );
}
