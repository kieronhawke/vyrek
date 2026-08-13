/**
 * A deliberately loose phone sanity check — enough to catch "aaaaaaa" and
 * other junk that a length-only check waved through, without rejecting the
 * many legitimate ways people write a number (+44, spaces, brackets, dashes).
 * It is a "could Ben plausibly ring this?" gate, not strict E.164.
 */
export function looksLikePhone(value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  // Letters mean it isn't a phone number ("call me" / "aaaaaaa").
  if (/[a-zA-Z]/.test(t)) return false;
  // Only the characters that legitimately appear in a written number.
  if (!/^[+()\-.\s\d]+$/.test(t)) return false;
  const digits = t.replace(/\D/g, "");
  // 7 covers short local numbers; 15 is the E.164 maximum.
  return digits.length >= 7 && digits.length <= 15;
}
