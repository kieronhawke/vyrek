/**
 * The block library — what Ben drags into a day.
 *
 * Every one of these is lifted from "Haseeb Training.xlsx", written the way he
 * writes it, punctuation and all. That matters: the point of the library is
 * that dropping a block is faster than typing, and it is only faster if what
 * lands in the cell is what he would have typed anyway.
 *
 * He can edit any of them after dropping, and save his own — a block is just
 * a name and a body.
 */

export type BlockCategory =
  | "Warm-up"
  | "Running"
  | "Erg"
  | "HYROX"
  | "Strength"
  | "Cool-down";

export type PlanBlock = {
  id: string;
  name: string;
  category: BlockCategory;
  /** Exactly what lands in the cell. */
  body: string;
  /** Ben's own, saved from a cell. Library blocks are false. */
  custom?: boolean;
};

export const BLOCK_LIBRARY: PlanBlock[] = [
  // ── Warm-up ──────────────────────────────────────────────────────────
  {
    id: "b_wu_jog",
    name: "Jog + strides",
    category: "Warm-up",
    body: "2km easy jog\n3x30 sec strides",
  },
  {
    id: "b_wu_bike",
    name: "Easy bike",
    category: "Warm-up",
    body: "10 mins easy bike",
  },

  // ── Running ──────────────────────────────────────────────────────────
  {
    id: "b_run_thresh",
    name: "Threshold blocks",
    category: "Running",
    body: "2km easy jog\n3x30 sec strides\n2x 10 mins @ 7-8/10 effort off 2 mins static recovery\n2km easy jog",
  },
  {
    id: "b_run_km",
    name: "1km reps",
    category: "Running",
    body: "2km w/up\n3x30 secs strides\n6x1km @ 7-8/10 effort off 90 seconds static recovery\n2km w/d",
  },
  {
    id: "b_run_prog",
    name: "Progression run",
    category: "Running",
    body: "1km easy\n10km progression run\n2km @ 5:00\n2km @ 4:45\n2km @ 4:30\n2km @ 4:15\n2km @ 4:00\n1km easy",
  },
  {
    id: "b_run_long",
    name: "Long easy",
    category: "Running",
    body: "10km easy run\nfinish with 100 hand release press ups for time.",
  },

  // ── Erg ──────────────────────────────────────────────────────────────
  {
    id: "b_erg_alt",
    name: "Ski / row alternating",
    category: "Erg",
    body: "10 mins ski\n10 mins row\n10 mins ski\n10 mins row\ninto\n100 wall balls @ 6kg",
  },
  {
    id: "b_erg_intervals",
    name: "Ski + row intervals",
    category: "Erg",
    body: "1km easy ski\ninto\n4x800m ski @ 8/10 off 90 secs\ninto\n4x800m row @ 8/10\ninto\n100m reverse lunge @ 30kg\ninto\n50 WBs @ 6kg\n1km easy row",
  },

  // ── HYROX ────────────────────────────────────────────────────────────
  {
    id: "b_hyrox_emom30",
    name: "30 min HYROX EMOM",
    category: "HYROX",
    body: "10 mins easy bike\n30 mins Hyrox EMOM\n1: 12.5m sled push @ open weight\n2: 20m burpee\n3: 15 wall balls @ 9kg\n4: 12.5m sled pull @ open weight\n5: 20 reverse lunges @ 30kg\n6: rest\nx5\n10 mins easy bike",
  },
  {
    id: "b_hyrox_emom15",
    name: "15 min EMOM",
    category: "HYROX",
    body: "15 min EMOM\n1. 15 wall balls @ 9kg\n2. 20m burpee\n3. 12.5m sled pull\n4. 25m sled push @ pro\n5. Rest\nx3",
  },
  {
    id: "b_hyrox_ctp",
    name: "Erg + CTP burpees",
    category: "HYROX",
    body: "15 mins ski\n30 CTP burpees\n15 mins row\n30 CTP burpees\n15 mins bike\n30 CTP burpees\non these - practice hitting the ground quickly.",
  },
  {
    id: "b_hyrox_sim",
    name: "Race pace + sled",
    category: "HYROX",
    body: "2km easy jog\n3x30 sec strides\n2x\n2.5km @ 4:15 off 2 mins\n2 mins\n1km @ 4:10\n50m push @ 205kg\n1km @ 4:10",
  },

  // ── Strength ─────────────────────────────────────────────────────────
  {
    id: "b_str_wb",
    name: "Wall ball volume",
    category: "Strength",
    body: "100 wall balls @ 6kg\nFinish with 2x 60 sec deadhang off 60 secs recovery.",
  },
  {
    id: "b_str_lunge",
    name: "Loaded lunges",
    category: "Strength",
    body: "100m reverse lunge @ 30kg",
  },

  // ── Cool-down ────────────────────────────────────────────────────────
  {
    id: "b_cd_bike",
    name: "Easy spin down",
    category: "Cool-down",
    body: "10 mins easy bike",
  },
  { id: "b_cd_rest", name: "Rest day", category: "Cool-down", body: "Rest" },
];

export const CATEGORIES: BlockCategory[] = [
  "Warm-up",
  "Running",
  "Erg",
  "HYROX",
  "Strength",
  "Cool-down",
];

/**
 * Appending, not replacing.
 *
 * Dropping a second block on a cell that already has something adds to it,
 * because a session is usually two or three of these stacked — "10 mins easy
 * bike" then "30 mins Hyrox EMOM". Replacing would lose work on a mis-drop,
 * and there is no undo yet.
 */
export function appendBlock(existing: string, block: PlanBlock): string {
  const cur = existing.trim();
  if (!cur || cur.toLowerCase() === "rest") return block.body;
  return `${cur}\n${block.body}`;
}
