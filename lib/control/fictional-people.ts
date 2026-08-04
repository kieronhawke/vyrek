/**
 * The invented people who populate the admin fixtures.
 *
 * WHY THIS FILE EXISTS
 *
 * The fixtures used to be named "Sample A" through "Sample X", guarded by
 * tests asserting every name began with "Sample ". That guard was there for
 * a real reason, quoted from diary.test.ts: "This repository is public. A
 * real client's name against a real session time is precisely what must
 * never be committed."
 *
 * Kieron asked for realistic names so the admin can be assessed as it will
 * actually look, and "Sample B — 7 days late" tells you nothing about
 * whether the screen works. Realistic names are compatible with the rule;
 * the prefix was only ever the mechanism, not the point.
 *
 * So the mechanism changed rather than the rule. Every name in the fixtures
 * must appear in this roster, and the tests enforce it. Pasting a real
 * client's name into a fixture now fails the suite unless somebody also adds
 * it to a file that says, at the top, that everyone in it is invented. That
 * is a harder thing to do by accident than dropping the "Sample " prefix.
 *
 * EVERY NAME BELOW IS FICTIONAL. None is a Suth Performance client, and none
 * is knowingly a real person. If one ever collides with somebody real,
 * replace it here and the fixtures follow.
 */

/** Clients, in fixture order c_01 to c_24. */
export const FICTIONAL_CLIENTS = [
  "Amelia Fraser", "Marcus Bell", "Priya Raman", "Tom Whitaker",
  "Sofia Nowak", "Daniel Osei", "Hannah Blythe", "Callum Reid",
  "Nadia Haddad", "Owen Pritchard", "Grace Okonkwo", "Ryan Doherty",
  "Elena Vasquez", "Josh Ferrand", "Maya Lindqvist", "Adam Sinclair",
  "Chloe Bennett", "Ismail Karim", "Freya Donnelly", "Nathan Cole",
  "Aisha Rahman", "Liam Gallagher-Hume", "Rosa Delgado", "Ben Ashworth",
] as const;

/** Leads, in fixture order l_01 to l_12. */
export const FICTIONAL_LEADS = [
  "Jess Moreau", "Alex Trant", "Simon Ayodele", "Katie Vaughan",
  "Ravi Sethi", "Molly Crawford", "Dean Fitzgerald", "Yasmin Choudhury",
  "Patrick Byrne", "Erin Solberg", "George Mensah", "Lucy Hartmann",
] as const;

/** Everyone, for the tests that guard what may appear in a fixture. */
export const FICTIONAL_PEOPLE: ReadonlySet<string> = new Set<string>([
  ...FICTIONAL_CLIENTS,
  ...FICTIONAL_LEADS,
]);

/** True when `name` is one of the invented people above. */
export function isFictionalPerson(name: string): boolean {
  return FICTIONAL_PEOPLE.has(name.trim());
}
