/**
 * HOW GOOD IS THIS PASSWORD, AND WHAT WOULD MAKE IT BETTER.
 *
 * Shown live while somebody types one. Two jobs, and the second matters more:
 * score it honestly, and say the ONE thing that would improve it most. A bar
 * that goes red and says nothing is a scold; a bar that says "a couple more
 * words would do it" is a coach.
 *
 * ── ENCOURAGE, DO NOT BLOCK ───────────────────────────────────────────────
 * The only hard rule is eight characters, which is what the server already
 * enforces (`MIN_PASSWORD` in /api/onboarding/account). Everything above that
 * is advice. A person moving their existing coaching payments onto a card is
 * not signing up for online banking, and a form that refuses "one uppercase,
 * one symbol, one digit" at the moment they are handing over money loses more
 * to abandonment than it ever gains in entropy. Long beats complicated
 * anyway: "walked the dog twice" is far stronger than "P@ssw0rd!" and NIST
 * SP 800-63B has said so since 2017.
 *
 * ── SCORED ON WHAT ACTUALLY BREAKS PASSWORDS ──────────────────────────────
 * Length first, because every extra character multiplies the search space.
 * Variety second, and worth much less than people assume. Then the penalties,
 * which is where real accounts are lost:
 *
 *   - a password that IS their own name, email or the brand — the first
 *     things anybody guesses about a coaching client
 *   - the small set of passwords that appear at the top of every breach list
 *   - one character repeated, or a run off the keyboard
 *
 * No dependency. zxcvbn is the better scorer and it is ~800KB before
 * compression, on a screen a client reaches on mobile data seconds before
 * paying. This is a few hundred bytes and catches the same three mistakes.
 */

/** The one hard rule, matching the server. */
export const MIN_PASSWORD_LENGTH = 8;

/** Where the meter stops nagging: four words or a good long phrase. */
export const STRONG_LENGTH = 16;

export type PasswordScore = 0 | 1 | 2 | 3 | 4;

export type PasswordStrength = {
  /** 0 empty · 1 weak · 2 fair · 3 good · 4 strong. */
  score: PasswordScore;
  /** What the meter says: "Weak", "Strong"… Empty string for no password. */
  label: string;
  /**
   * The single most useful next step, or null when there is nothing worth
   * saying. Never a list: one instruction gets followed, four get ignored.
   */
  hint: string | null;
  /** Long enough to submit. The ONLY thing that gates the button. */
  ok: boolean;
  /** True once they have typed something but not yet enough. */
  tooShort: boolean;
};

/**
 * The passwords that turn up at the top of every breach corpus, plus the ones
 * this particular product invites: a gym brand, a coach's name, a sport.
 * Compared after stripping digits and punctuation, so "Suth2026!" is caught
 * by "suth".
 */
const COMMON = new Set([
  "password", "passw0rd", "pass", "letmein", "welcome", "monkey", "dragon",
  "qwerty", "qwertyuiop", "asdf", "asdfgh", "zxcvbn", "abc", "abcd",
  "iloveyou", "admin", "login", "master", "sunshine", "princess", "football",
  "baseball", "liverpool", "arsenal", "chelsea", "charlie", "shadow",
  "superman", "batman", "trustno", "starwars", "whatever", "freedom",
  "suth", "suthperformance", "performance", "hyrox", "fitness", "training",
  "gym", "coach", "ben", "bensutherland", "changeme", "temp", "secret",
]);

/** Straight runs off a keyboard row or the alphabet, forwards or backwards. */
const SEQUENCES = [
  "abcdefghijklmnopqrstuvwxyz",
  "01234567890",
  "qwertyuiop",
  "asdfghjkl",
  "zxcvbnm",
];

/** Strip everything but letters, so "P4ssw0rd!" reduces to "psswrd". */
function letters(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

/** Digits and punctuation removed AND leetspeak undone: "P@ssw0rd" → "password". */
function deleet(value: string): string {
  return value
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/[3]/g, "e")
    .replace(/[!1|]/g, "i")
    .replace(/[0]/g, "o")
    .replace(/[$5]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/[^a-z]/g, "");
}

function hasSequence(value: string): boolean {
  const v = value.toLowerCase();
  for (const row of SEQUENCES) {
    const back = [...row].reverse().join("");
    for (let i = 0; i + 4 <= row.length; i++) {
      if (v.includes(row.slice(i, i + 4))) return true;
    }
    for (let i = 0; i + 4 <= back.length; i++) {
      if (v.includes(back.slice(i, i + 4))) return true;
    }
  }
  return false;
}

/** "aaaa", "!!!!", "abababab" — a short unit doing all the work. */
function isRepetitive(value: string): boolean {
  if (/(.)\1{3,}/.test(value)) return true;
  for (let unit = 1; unit <= 4; unit++) {
    if (value.length < unit * 3) continue;
    const chunk = value.slice(0, unit);
    if (chunk.repeat(Math.ceil(value.length / unit)).slice(0, value.length) === value) {
      return true;
    }
  }
  return false;
}

/**
 * Words that belong to the mail provider rather than to the person.
 *
 * Without this, "gmail" counts as personal for every client with a Gmail
 * address, so "demolition gmail" — and, worse, any password containing the
 * letters "gmail" — is reported as using their own email. The domain says
 * nothing about who they are.
 */
const EMAIL_NOISE = new Set([
  "gmail", "googlemail", "google", "yahoo", "ymail", "hotmail", "outlook",
  "live", "msn", "icloud", "me", "mac", "aol", "btinternet", "sky", "virgin",
  "talktalk", "protonmail", "proton", "gmx", "mail", "email", "com", "co",
  "uk", "net", "org", "www",
]);

/**
 * Words drawn from what we already know about this person: their name and the
 * local part of their email. A password built out of those is the first thing
 * anyone who has seen one of Ben's invites would try.
 *
 * ⚠️ IT ASKS WHAT IS LEFT, NOT WHETHER THE NAME APPEARS. "sarahreeves99" is
 * her name and nothing else, and is genuinely weak. "sarah walked the dog on
 * tuesday" contains her name and is a thirty-character passphrase — calling
 * that "too easy to guess" is both wrong and the kind of scolding that makes
 * somebody give up and use their name on its own instead. So the test is what
 * survives once every personal word is removed: if that is still a decent
 * password, the name inside it was incidental.
 */
function usesPersonal(password: string, personal: string[]): boolean {
  const p = deleet(password);
  if (p.length < 3) return false;

  let remaining = p;
  let matched = false;
  for (const raw of personal) {
    for (const word of String(raw ?? "").toLowerCase().split(/[^a-z0-9]+/i)) {
      const w = deleet(word);
      // Three letters is too short to be meaningful ("ben" is caught by the
      // common list instead, where it belongs).
      if (w.length < 4 || EMAIL_NOISE.has(w)) continue;
      if (remaining.includes(w)) {
        matched = true;
        remaining = remaining.split(w).join("");
      }
    }
  }
  // Their name plus a couple of digits is their name. Their name inside a
  // real phrase is a real phrase.
  return matched && remaining.length < MIN_PASSWORD_LENGTH;
}

/**
 * Score a password, optionally against what we know about the person.
 *
 * `personal` takes their name and email; anything falsy is ignored, so a
 * caller with only half the details does not need to filter first.
 */
export function scorePassword(
  password: string,
  personal: (string | null | undefined)[] = [],
): PasswordStrength {
  const value = password ?? "";

  if (value.length === 0) {
    return { score: 0, label: "", hint: null, ok: false, tooShort: false };
  }

  if (value.length < MIN_PASSWORD_LENGTH) {
    return {
      score: 1,
      label: "Too short",
      hint: `${MIN_PASSWORD_LENGTH - value.length} more character${
        MIN_PASSWORD_LENGTH - value.length === 1 ? "" : "s"
      } to go.`,
      ok: false,
      tooShort: true,
    };
  }

  const known = personal.filter(Boolean) as string[];
  const bare = deleet(value);
  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;

  /* ── The disqualifiers ────────────────────────────────────────────────
     Long enough to submit, and still a bad idea. Each says exactly what is
     wrong, because "weak" on its own leaves somebody adding an exclamation
     mark to the end and wondering why nothing moved. */
  if (COMMON.has(bare) || COMMON.has(letters(value))) {
    return {
      score: 1,
      label: "Too easy to guess",
      hint: "That one is on every guessing list. Try a few words only you would put together.",
      ok: true,
      tooShort: false,
    };
  }
  if (isRepetitive(value)) {
    return {
      score: 1,
      label: "Too easy to guess",
      hint: "Repeating the same characters does not add much. Try a short phrase instead.",
      ok: true,
      tooShort: false,
    };
  }
  if (usesPersonal(value, known)) {
    return {
      score: 1,
      label: "Too easy to guess",
      hint: "It uses your name or email, which is the first thing anyone would try.",
      ok: true,
      tooShort: false,
    };
  }

  /* ── Points ───────────────────────────────────────────────────────────
     Length carries it. The variety bonuses are deliberately small: they are
     worth about one extra character each, which is roughly true. */
  let points = 0;
  if (value.length >= 8) points += 1;
  if (value.length >= 10) points += 1;
  if (value.length >= 12) points += 1;
  if (value.length >= STRONG_LENGTH) points += 1;
  if (value.length >= 20) points += 1;

  // A real passphrase. Two words beat any amount of punctuation.
  if (wordCount >= 3) points += 2;
  else if (wordCount === 2) points += 1;

  const classes =
    (/[a-z]/.test(value) ? 1 : 0) +
    (/[A-Z]/.test(value) ? 1 : 0) +
    (/[0-9]/.test(value) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(value) ? 1 : 0);
  if (classes >= 2) points += 1;
  if (classes >= 3) points += 1;

  // Only a handful of distinct characters, however long it is.
  if (new Set(value.toLowerCase()).size <= 4) points -= 2;
  if (hasSequence(value)) points -= 2;
  // A single dictionary-ish word with a number stuck on the end is the
  // commonest shape there is, and it is much weaker than its length suggests.
  if (wordCount === 1 && /^[a-z]+[0-9]{0,4}[!?.]?$/i.test(value)) points -= 1;

  const score: PasswordScore =
    points <= 1 ? 1 : points <= 3 ? 2 : points <= 5 ? 3 : 4;

  /* ── The one thing worth saying ───────────────────────────────────────
     Ordered by how much it would actually move the score. Nothing at all
     once it is strong: praise is not a hint, and a bar that stays green
     with no text reads as done. */
  let hint: string | null = null;
  if (score < 4) {
    if (hasSequence(value)) {
      hint = "Runs like “abcd” or “1234” are the first thing software tries.";
    } else if (value.length < 12) {
      hint = "Length is what counts most. A few more characters, or a second word.";
    } else if (wordCount === 1) {
      hint = "Two or three words together is stronger than one long one.";
    } else if (classes === 1) {
      hint = "A capital or a number somewhere would finish it off.";
    } else {
      hint = "Nearly there. A bit longer and it is as strong as it needs to be.";
    }
  }

  const label = score === 1 ? "Weak" : score === 2 ? "Fair" : score === 3 ? "Good" : "Strong";

  return { score, label, hint, ok: true, tooShort: false };
}
