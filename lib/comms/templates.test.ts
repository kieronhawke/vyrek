import { describe, expect, it } from "vitest";
import {
  TEMPLATES, TOKENS, draftSegments, draftIsGsm7, effective,
  preview, render, tokensUsed, unknownTokens, templateById,
} from "./templates";
import { segments, isGsm7, smsLength } from "@/lib/sms/messages";

describe("message templates", () => {
  it("fills tokens, and leaves a missing one visible rather than blank", () => {
    expect(render("Hi {{firstName}}", { firstName: "Jess" })).toBe("Hi Jess");
    // A hole in a message somebody receives is worse than an obvious mistake.
    expect(render("Hi {{firstName}}", {})).toBe("Hi {{firstName}}");
    expect(render("Hi {{firstName}}", { firstName: "" })).toBe("Hi {{firstName}}");
  });

  it("only lets a template use the tokens it declares", () => {
    for (const t of TEMPLATES) {
      const used = tokensUsed(t.defaultBody + " " + (t.defaultSubject ?? ""));
      for (const u of used) {
        expect(t.tokens, `${t.id} uses {{${u}}} without declaring it`).toContain(u);
      }
    }
  });

  it("flags a token the editor should not have allowed", () => {
    expect(unknownTokens("Hi {{firstName}} {{nope}}", ["firstName"])).toEqual(["nope"]);
    expect(unknownTokens("Hi {{amount}}", ["firstName"])).toEqual(["amount"]);
    expect(unknownTokens("Hi {{firstName}}", ["firstName"])).toEqual([]);
  });

  it("every declared token exists and has an example to preview with", () => {
    for (const t of TEMPLATES) {
      for (const id of t.tokens) {
        expect(TOKENS[id], `${t.id} declares unknown token ${id}`).toBeTruthy();
        expect(TOKENS[id].example.length).toBeGreaterThan(0);
      }
    }
  });

  it("previews with no tokens left unresolved", () => {
    for (const t of TEMPLATES) {
      expect(preview(t.defaultBody), `${t.id} preview`).not.toMatch(/\{\{/);
    }
  });

  it("keeps every default SMS to one segment once tokens are filled", () => {
    for (const t of TEMPLATES.filter((x) => x.channel === "sms")) {
      const rendered = preview(t.defaultBody);
      expect(draftSegments(rendered), `${t.id}: "${rendered}"`).toBeLessThanOrEqual(1);
      expect(draftIsGsm7(rendered), `${t.id} has a non-GSM character`).toBe(true);
    }
  });

  it("counts segments the same way the send path does", () => {
    // The editor re-states these rules; if the two ever disagree the sender
    // wins, so this pins them together.
    for (const s of ["Hi Jess", "x".repeat(160), "x".repeat(161), "Hi Jess €", "naïve"]) {
      expect(draftSegments(s), s).toBe(segments(s));
      expect(draftIsGsm7(s), s).toBe(isGsm7(s));
    }
    expect(smsLength("Hi")).toBe(2);
  });

  it("prefers an override and can always fall back to the default", () => {
    const def = templateById("sms.first-contact")!;
    expect(effective(def, {}).edited).toBe(false);
    expect(effective(def, {}).body).toBe(def.defaultBody);
    const edited = effective(def, {
      [def.id]: { body: "New words {{firstName}}", editedAt: "2026-08-04" },
    });
    expect(edited.edited).toBe(true);
    expect(edited.body).toBe("New words {{firstName}}");
  });
});
