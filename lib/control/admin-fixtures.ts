/**
 * Operator-side seed data. Fixtures only; Phase A swaps the accessors for
 * real queries. HARD-RULES §1: nothing here is presented as a real person,
 * a real result, or a real statistic.
 */

export type LeadRow = {
  id: string; name: string; segment: string; status: string;
  source: string; ageHours: number;
};
export type PlanRow = {
  id: string; client: string; block: string; status: string;
  coachNote: boolean; opened: string;
};
export type ApptRow = {
  id: string; client: string; type: string; when: string; status: string;
};
export type MessageRow = {
  id: string; client: string; channel: string; direction: string;
  preview: string; when: string;
};
export type TemplateRow = {
  id: string; name: string; channel: string;
  classification: "transactional" | "marketing"; category: string;
};
export type KeywordRow = {
  id: string; keyword: string; volume: number; kd: number;
  buyerType: string; status: string; page: string | null;
};
export type AssetRow = {
  id: string; name: string; kind: string; approved: boolean; rights: string;
};
export type UserRow = {
  id: string; name: string; role: string; twoFactor: boolean; lastSeen: string;
};

export const LEAD_ROWS: LeadRow[] = [
  { id: "l1", name: "Jess Moreau", segment: "Beginner", status: "New", source: "Quiz", ageHours: 2 },
  { id: "l2", name: "Alex Trant", segment: "HYROX", status: "New", source: "Quiz", ageHours: 31 },
  { id: "l3", name: "Simon Ayodele", segment: "Faster", status: "Contacted", source: "Contact form", ageHours: 76 },
  { id: "l4", name: "Katie Vaughan", segment: "Unsure", status: "Call booked", source: "Referral", ageHours: 120 },
];

export const PLAN_ROWS: PlanRow[] = [
  { id: "pl1", client: "Amelia Fraser", block: "Weeks 5–8", status: "Draft", coachNote: false, opened: "—" },
  { id: "pl2", client: "Priya Raman", block: "Weeks 9–12", status: "Overdue", coachNote: false, opened: "—" },
  { id: "pl3", client: "Tom Whitaker", block: "Weeks 1–4", status: "Sent", coachNote: true, opened: "3 times" },
  { id: "pl4", client: "Sofia Nowak", block: "Race block", status: "Active", coachNote: true, opened: "9 times" },
];

export const APPT_ROWS: ApptRow[] = [
  { id: "a1", client: "Amelia Fraser", type: "Plan review", when: "Today 18:30", status: "Confirmed" },
  { id: "a2", client: "Katie Vaughan", type: "Consultation", when: "Tomorrow 07:00", status: "Scheduled" },
  { id: "a3", client: "Sofia Nowak", type: "Race debrief", when: "Thu 19:00", status: "Scheduled" },
  { id: "a4", client: "Marcus Bell", type: "Check-in", when: "Fri 12:00", status: "No show" },
];

export const MESSAGE_ROWS: MessageRow[] = [
  { id: "m1", client: "Priya Raman", channel: "SMS", direction: "In", preview: "Knee felt better today, managed all 3 sets", when: "12 min ago" },
  { id: "m2", client: "Amelia Fraser", channel: "Email", direction: "Out", preview: "Your plan is ready", when: "2 hours ago" },
  { id: "m3", client: "Daniel Osei", channel: "SMS", direction: "Out", preview: "Payment failed, update your card", when: "Yesterday" },
];

export const TEMPLATE_ROWS: TemplateRow[] = [
  { id: "t1", name: "Lead acknowledgement", channel: "SMS", classification: "transactional", category: "Leads" },
  { id: "t2", name: "Plan ready", channel: "Both", classification: "transactional", category: "Onboarding" },
  { id: "t3", name: "Payment overdue day 3", channel: "SMS", classification: "transactional", category: "Payments" },
  { id: "t4", name: "Weekly Q&A published", channel: "Email", classification: "marketing", category: "Engagement" },
  { id: "t5", name: "Upgrade prompt", channel: "Email", classification: "marketing", category: "Engagement" },
];

export const KEYWORD_ROWS: KeywordRow[] = [
  { id: "k1", keyword: "hyrox training plan", volume: 2400, kd: 28, buyerType: "Client", status: "published", page: "/hyrox/plans" },
  { id: "k2", keyword: "personal trainer leeds", volume: 1300, kd: 12, buyerType: "Client", status: "published", page: "/personal-trainer/leeds" },
  { id: "k3", keyword: "hyrox coach", volume: 880, kd: 6, buyerType: "Client", status: "drafted", page: null },
  { id: "k4", keyword: "hyrox times", volume: 3600, kd: 34, buyerType: "Client", status: "not_started", page: null },
  { id: "k5", keyword: "personal trainer courses", volume: 5400, kd: 41, buyerType: "Not a buyer", status: "not_started", page: null },
];

export const ASSET_ROWS: AssetRow[] = [
  { id: "as1", name: "Wordmark, light on dark", kind: "Logo", approved: true, rights: "Owned" },
  { id: "as2", name: "Monogram", kind: "Logo", approved: true, rights: "Owned" },
  { id: "as3", name: "Camp portrait, Forders", kind: "Photo", approved: true, rights: "Owned, cleared 30 Jul" },
  { id: "as4", name: "Race day, sled push", kind: "Photo", approved: true, rights: "Owned" },
  { id: "as5", name: "Email signature, Ben", kind: "Template", approved: true, rights: "Owned" },
];

export const USER_ROWS: UserRow[] = [
  { id: "u1", name: "Kieron", role: "Owner", twoFactor: true, lastSeen: "Now" },
  { id: "u2", name: "Ben", role: "Coach", twoFactor: false, lastSeen: "2 hours ago" },
];
