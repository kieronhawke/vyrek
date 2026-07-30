"use client";

/**
 * Interactive calculators for blog MDX.
 *
 * DATA HONESTY (hard rule 1). Race entry fees, travel and hotel costs move
 * constantly and vary by how early you book. We do NOT assert prices we
 * cannot source. Every money figure here is a user-editable input seeded
 * with a clearly-labelled typical range, and the UI says so. The calculator
 * does the arithmetic; the reader owns the numbers. Seed ranges live in one
 * place below so they can be reviewed and updated deliberately.
 *
 *   <RaceCostCalculator>  what a race weekend actually costs you
 *   <PaceCalculator>      target finish time → run splits and station budget
 *   <PtCostCalculator>    local PT vs online coaching, cost per week of contact
 */

import { useId, useMemo, useState } from "react";

const gbp = (n: number) =>
  `£${Math.round(n).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-suth-text">{label}</span>
      {children}
      {hint ? <span className="text-xs leading-relaxed text-suth-text-tertiary">{hint}</span> : null}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-suth-border-default bg-suth-bg px-3 py-2.5 font-mono text-sm tabular-nums text-suth-text outline-none transition-colors focus:border-suth-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent";

function Money({
  label,
  hint,
  value,
  onChange,
  step = 5,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-suth-text-tertiary">£</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className={inputCls}
        />
      </div>
    </Field>
  );
}

// ─────────────────────────────────────────────────────────────
// RaceCostCalculator
// ─────────────────────────────────────────────────────────────

/**
 * Seed values are TYPICAL RANGES for planning, not quoted prices, and every
 * one is editable in the UI. Review these once a season.
 * Travel bands are journey-type averages, not fares for a named service.
 */
const TRAVEL_SEED: Record<string, { label: string; solo: number; note: string }> = {
  local: { label: "Local (under an hour)", solo: 15, note: "Fuel and parking, or a couple of train fares." },
  regional: { label: "Same country, a few hours", solo: 70, note: "Advance rail, or fuel plus parking for a longer drive." },
  far: { label: "Long domestic trip", solo: 130, note: "Peak or late-booked rail, or a full tank plus tolls." },
  flight: { label: "Short-haul flight", solo: 220, note: "Return flights plus transfers, booked in reasonable time." },
};

const HOTEL_SEED: Record<string, { label: string; perNight: number }> = {
  none: { label: "Not staying over", perNight: 0 },
  budget: { label: "Budget chain", perNight: 75 },
  mid: { label: "Mid-range hotel", perNight: 130 },
  city: { label: "Major-city or race-weekend rates", perNight: 200 },
};

export function RaceCostCalculator() {
  const [entry, setEntry] = useState(120);
  const [travelKey, setTravelKey] = useState<keyof typeof TRAVEL_SEED>("regional");
  const [travel, setTravel] = useState(TRAVEL_SEED.regional.solo);
  const [hotelKey, setHotelKey] = useState<keyof typeof HOTEL_SEED>("budget");
  const [nightly, setNightly] = useState(HOTEL_SEED.budget.perNight);
  const [nights, setNights] = useState(1);
  const [people, setPeople] = useState(1);
  const [shareRoom, setShareRoom] = useState(true);
  const [food, setFood] = useState(35);
  const [kit, setKit] = useState(0);
  const headingId = useId();

  const rooms = shareRoom ? Math.ceil(people / 2) : people;
  const hotelTotal = nightly * nights * rooms;
  const travelTotal = travel * people;
  const foodTotal = food * nights * people * 1; // per person per day on site
  const entryTotal = entry * people;
  const total = entryTotal + travelTotal + hotelTotal + foodTotal + kit;

  const lines = [
    { label: `Entry${people > 1 ? ` × ${people}` : ""}`, value: entryTotal },
    { label: `Travel${people > 1 ? ` × ${people}` : ""}`, value: travelTotal },
    { label: nights > 0 ? `Hotel · ${nights} night${nights > 1 ? "s" : ""} · ${rooms} room${rooms > 1 ? "s" : ""}` : "Hotel", value: hotelTotal },
    { label: "Food and drink on the trip", value: foodTotal },
    { label: "Kit bought for this race", value: kit },
  ].filter((l) => l.value > 0);

  return (
    <section
      aria-labelledby={headingId}
      className="mt-10 overflow-hidden rounded-lg border border-suth-border-default bg-suth-elevated"
    >
      <header className="border-b border-suth-border-subtle px-5 py-4 md:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
          [ CALCULATOR ]
        </p>
        <h3 id={headingId} className="mt-1 text-lg font-bold text-suth-text md:text-xl">
          What will this race actually cost you?
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-suth-text-secondary">
          Every figure starts at a typical planning estimate and is yours to change. Put your
          real numbers in and it will tell you the truth.
        </p>
      </header>

      <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 md:px-6">
        <Money
          label="Entry fee (per person)"
          hint="Check the official listing — it changes with release tier."
          value={entry}
          onChange={setEntry}
        />

        <Field label="How many of you are going?" hint="Racers and supporters both cost money.">
          <input
            type="number"
            min={1}
            max={12}
            value={people}
            onChange={(e) => setPeople(Math.min(12, Math.max(1, Number(e.target.value) || 1)))}
            className={inputCls}
          />
        </Field>

        <Field label="Getting there" hint={TRAVEL_SEED[travelKey].note}>
          <select
            value={travelKey}
            onChange={(e) => {
              const k = e.target.value as keyof typeof TRAVEL_SEED;
              setTravelKey(k);
              setTravel(TRAVEL_SEED[k].solo);
            }}
            className={inputCls}
          >
            {Object.entries(TRAVEL_SEED).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>

        <Money label="Travel cost (per person)" value={travel} onChange={setTravel} />

        <Field label="Where you're staying" hint="Race weekends push local rates up. Book early.">
          <select
            value={hotelKey}
            onChange={(e) => {
              const k = e.target.value as keyof typeof HOTEL_SEED;
              setHotelKey(k);
              setNightly(HOTEL_SEED[k].perNight);
              if (k === "none") setNights(0);
              else if (nights === 0) setNights(1);
            }}
            className={inputCls}
          >
            {Object.entries(HOTEL_SEED).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>

        <Money
          label="Room rate per night"
          hint="Put the real quote in — this is the number that varies most."
          value={nightly}
          onChange={setNightly}
        />

        <Field label="Nights">
          <input
            type="number"
            min={0}
            max={7}
            value={nights}
            onChange={(e) => setNights(Math.min(7, Math.max(0, Number(e.target.value) || 0)))}
            className={inputCls}
          />
        </Field>

        <Money
          label="Food per person, per day"
          hint="Race fuel, a proper dinner, coffee. It adds up."
          value={food}
          onChange={setFood}
        />

        <Money
          label="New kit for this race"
          hint="Shoes, grip socks, a belt. Zero is a perfectly good answer."
          value={kit}
          onChange={setKit}
        />

        <div className="flex items-start gap-2.5 sm:col-span-2">
          <input
            id={`${headingId}-share`}
            type="checkbox"
            checked={shareRoom}
            onChange={(e) => setShareRoom(e.target.checked)}
            className="mt-0.5 size-[18px] shrink-0 cursor-pointer accent-suth-accent"
            disabled={nights === 0}
          />
          <label
            htmlFor={`${headingId}-share`}
            className="cursor-pointer text-sm leading-relaxed text-suth-text-secondary"
          >
            Sharing rooms (two per room)
          </label>
        </div>
      </div>

      <div className="border-t border-suth-border-subtle">
        <dl className="divide-y divide-suth-border-subtle">
          {lines.map((l) => (
            <div key={l.label} className="flex items-baseline justify-between gap-4 px-5 py-2.5 md:px-6">
              <dt className="text-sm text-suth-text-secondary">{l.label}</dt>
              <dd className="font-mono text-sm tabular-nums text-suth-text">{gbp(l.value)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-suth-border-default bg-suth-overlay px-5 py-4 md:px-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-suth-text">Your race weekend</p>
          {people > 1 ? (
            <p className="text-xs text-suth-text-tertiary">{gbp(total / people)} per person</p>
          ) : null}
        </div>
        <p className="font-mono text-2xl font-black tabular-nums text-suth-accent md:text-3xl">
          {gbp(total)}
        </p>
      </div>

      <p className="border-t border-suth-border-subtle px-5 py-3 text-xs leading-relaxed text-suth-text-tertiary md:px-6">
        Planning estimates, not quoted prices. Entry fees, fares and room rates change constantly
        and rise the closer you book to race day. Always check the real figures before committing.
      </p>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// PaceCalculator — target time → run splits + station budget
// ─────────────────────────────────────────────────────────────

export function PaceCalculator() {
  const [hours, setHours] = useState(1);
  const [mins, setMins] = useState(30);
  const [roxzone, setRoxzone] = useState(6);
  const headingId = useId();

  const totalMin = hours * 60 + mins;
  const model = useMemo(() => {
    // Eight 1km runs, eight stations, plus transitions. The split between
    // running and station work shifts with ability: faster athletes spend
    // proportionally more of the race running. This is a planning model —
    // your own splits from a simulation beat any generic ratio.
    const runShare = totalMin <= 70 ? 0.55 : totalMin <= 90 ? 0.52 : 0.48;
    const usable = Math.max(totalMin - roxzone, 1);
    const runTotal = usable * runShare;
    const stationTotal = usable - runTotal;
    const perKm = runTotal / 8;
    const perStation = stationTotal / 8;
    return { perKm, perStation, runTotal, stationTotal };
  }, [totalMin, roxzone]);

  const mmss = (m: number) => {
    const s = Math.round(m * 60);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  return (
    <section
      aria-labelledby={headingId}
      className="mt-10 overflow-hidden rounded-lg border border-suth-border-default bg-suth-elevated"
    >
      <header className="border-b border-suth-border-subtle px-5 py-4 md:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
          [ CALCULATOR ]
        </p>
        <h3 id={headingId} className="mt-1 text-lg font-bold text-suth-text md:text-xl">
          Your target time, broken into splits
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-suth-text-secondary">
          Set the finish time you want. This gives you the average running pace and the station
          budget that gets you there.
        </p>
      </header>

      <div className="grid gap-4 px-5 py-5 sm:grid-cols-3 md:px-6">
        <Field label="Target hours">
          <input
            type="number"
            min={0}
            max={3}
            value={hours}
            onChange={(e) => setHours(Math.min(3, Math.max(0, Number(e.target.value) || 0)))}
            className={inputCls}
          />
        </Field>
        <Field label="Target minutes">
          <input
            type="number"
            min={0}
            max={59}
            value={mins}
            onChange={(e) => setMins(Math.min(59, Math.max(0, Number(e.target.value) || 0)))}
            className={inputCls}
          />
        </Field>
        <Field label="RoxZone total (min)" hint="Transitions across the whole race.">
          <input
            type="number"
            min={0}
            max={20}
            value={roxzone}
            onChange={(e) => setRoxzone(Math.min(20, Math.max(0, Number(e.target.value) || 0)))}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid gap-px border-t border-suth-border-subtle bg-suth-border-subtle sm:grid-cols-3">
        <div className="bg-suth-elevated px-5 py-4 md:px-6">
          <p className="text-xs uppercase tracking-wide text-suth-text-tertiary">Average run km</p>
          <p className="mt-1 font-mono text-2xl font-black tabular-nums text-suth-accent">
            {mmss(model.perKm)}
          </p>
        </div>
        <div className="bg-suth-elevated px-5 py-4 md:px-6">
          <p className="text-xs uppercase tracking-wide text-suth-text-tertiary">Average station</p>
          <p className="mt-1 font-mono text-2xl font-black tabular-nums text-suth-text">
            {mmss(model.perStation)}
          </p>
        </div>
        <div className="bg-suth-elevated px-5 py-4 md:px-6">
          <p className="text-xs uppercase tracking-wide text-suth-text-tertiary">Running / stations</p>
          <p className="mt-1 font-mono text-2xl font-black tabular-nums text-suth-text">
            {Math.round(model.runTotal)}′ / {Math.round(model.stationTotal)}′
          </p>
        </div>
      </div>

      <p className="border-t border-suth-border-subtle px-5 py-3 text-xs leading-relaxed text-suth-text-tertiary md:px-6">
        A planning model, not a prediction. Stations do not cost equal time — wall balls and the
        sleds take far more than the ski erg — and your own simulation splits beat any generic
        ratio. Use this to sanity-check a target, then refine it with real data.
      </p>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// PtCostCalculator — cost per week of actual coach contact
// ─────────────────────────────────────────────────────────────

export function PtCostCalculator() {
  const [sessionPrice, setSessionPrice] = useState(45);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(2);
  // Market-typical online coaching fee, NOT ours. Site policy (Kieron,
  // 29 July 2026) is that no Suth price is published anywhere — every path
  // ends at the free consultation. Keep this a neutral, user-editable
  // market figure and never seed it with our own rate.
  const [onlinePrice, setOnlinePrice] = useState(100);
  const headingId = useId();

  const localMonthly = sessionPrice * sessionsPerWeek * 4.33;
  const localHoursPerMonth = sessionsPerWeek * 4.33;
  const localPerHour = localHoursPerMonth ? localMonthly / localHoursPerMonth : 0;
  const diff = localMonthly - onlinePrice;

  return (
    <section
      aria-labelledby={headingId}
      className="mt-10 overflow-hidden rounded-lg border border-suth-border-default bg-suth-elevated"
    >
      <header className="border-b border-suth-border-subtle px-5 py-4 md:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
          [ CALCULATOR ]
        </p>
        <h3 id={headingId} className="mt-1 text-lg font-bold text-suth-text md:text-xl">
          Local trainer or online coaching: the monthly maths
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-suth-text-secondary">
          Put in what a trainer near you charges. This compares it honestly with a monthly
          coaching fee.
        </p>
      </header>

      <div className="grid gap-4 px-5 py-5 sm:grid-cols-3 md:px-6">
        <Money
          label="Local session price"
          hint="UK sessions typically run £25–£60, higher in London."
          value={sessionPrice}
          onChange={setSessionPrice}
        />
        <Field label="Sessions per week">
          <input
            type="number"
            min={1}
            max={7}
            value={sessionsPerWeek}
            onChange={(e) => setSessionsPerWeek(Math.min(7, Math.max(1, Number(e.target.value) || 1)))}
            className={inputCls}
          />
        </Field>
        <Money
          label="Online coaching per month"
          hint="Put in whatever a coach has quoted you. Online coaching typically runs from around £70 to £350."
          value={onlinePrice}
          onChange={setOnlinePrice}
        />
      </div>

      <div className="grid gap-px border-t border-suth-border-subtle bg-suth-border-subtle sm:grid-cols-3">
        <div className="bg-suth-elevated px-5 py-4 md:px-6">
          <p className="text-xs uppercase tracking-wide text-suth-text-tertiary">Local, per month</p>
          <p className="mt-1 font-mono text-2xl font-black tabular-nums text-suth-text">
            {gbp(localMonthly)}
          </p>
          <p className="mt-0.5 text-xs text-suth-text-tertiary">
            {localHoursPerMonth.toFixed(1)} coached hours
          </p>
        </div>
        <div className="bg-suth-elevated px-5 py-4 md:px-6">
          <p className="text-xs uppercase tracking-wide text-suth-text-tertiary">Online, per month</p>
          <p className="mt-1 font-mono text-2xl font-black tabular-nums text-suth-accent">
            {gbp(onlinePrice)}
          </p>
          <p className="mt-0.5 text-xs text-suth-text-tertiary">Every session programmed</p>
        </div>
        <div className="bg-suth-elevated px-5 py-4 md:px-6">
          <p className="text-xs uppercase tracking-wide text-suth-text-tertiary">Difference</p>
          <p className="mt-1 font-mono text-2xl font-black tabular-nums text-suth-text">
            {diff >= 0 ? "−" : "+"}
            {gbp(Math.abs(diff))}
          </p>
          <p className="mt-0.5 text-xs text-suth-text-tertiary">
            {diff >= 0 ? "cheaper online" : "cheaper locally"}
          </p>
        </div>
      </div>

      <p className="border-t border-suth-border-subtle px-5 py-3 text-xs leading-relaxed text-suth-text-tertiary md:px-6">
        This compares price, not value. A good local trainer watching you lift is worth real money,
        and there are people who need that. What it shows is what you pay for the other{" "}
        {Math.max(0, 7 - sessionsPerWeek)} days a week — with sessions you pay per hour; with
        coaching every session in the week is planned. Judge it on which gets you training
        consistently, not on the headline number.
      </p>
    </section>
  );
}
