import { latestSentPlanFor } from "@/lib/coach/data";

/**
 * THE PLAN BEN ACTUALLY SENT, inside the member area.
 *
 * The email is the courier; this is the copy that lives in their
 * account. Renders nothing when no plan has been sent, so members on
 * generated programmes see no empty box.
 */
export async function CoachPlanCard({ customerId }: { customerId: string }) {
  const plan = await latestSentPlanFor(customerId);
  if (!plan) return null;

  const weekLabel = new Date(`${plan.weekStart}T12:00:00`).toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "long" },
  );
  const days = plan.content.filter((d) => d.detail.trim() || d.focus.trim());

  return (
    <section className="mb-8 rounded-2xl border border-suth-border bg-suth-elevated p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
        From Ben · week starting {weekLabel}
      </p>
      <h2 className="mt-2 text-xl font-black tracking-[-0.02em] text-suth-text">
        {plan.title}
      </h2>
      {plan.note ? (
        <p className="mt-2 text-sm leading-relaxed text-suth-text-secondary">
          {plan.note}
        </p>
      ) : null}

      <ul role="list" className="mt-4 space-y-3">
        {days.map((d, i) => (
          <li key={i} className="border-l-2 border-suth-accent pl-3">
            <p className="text-sm font-semibold text-suth-text">
              {d.day}
              {d.focus.trim() ? (
                <span className="font-normal text-suth-text-tertiary">
                  {" "}
                  · {d.focus}
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-suth-text-secondary">
              {d.detail}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
