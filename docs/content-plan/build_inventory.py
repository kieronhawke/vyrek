#!/usr/bin/env python3
"""Assemble the content-plan CSVs from seed lists + keywords.csv.
Volumes/KD are ONLY ever joined from the evidenced Semrush data —
never typed into seeds (hard rule 1: no invented statistics)."""
import csv, re, sys, unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from hyrox_seeds import HYROX
from pt_seeds import PT

# Derive the repo root from this file's own location rather than hardcoding it.
# The hardcoded path was /Users/kieronhawke/code/vyrek, which is the `main`
# worktree. Running this script from any other worktree therefore read that
# worktree's seeds but wrote the CSVs into `main` — a silent cross-lane write
# into a tree another terminal is working in. See ~/code/VYREK-LANES.md §2.
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "content-plan"
OUT.mkdir(exist_ok=True)

# Evidenced keyword lookup (case-insensitive exact match).
kwdata = {}
with open(ROOT / "docs/strategy/data/keywords.csv") as f:
    for r in csv.DictReader(f):
        kwdata[r["keyword"].strip().lower()] = r

EXISTING = {p.stem for p in (ROOT / "content/blog").glob("*.mdx")}

def slugify(title):
    s = unicodedata.normalize("NFKD", title.lower())
    s = re.sub(r"[’'\"():,.!?—/·]+", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    s = re.sub(r"^(the|a|an)-", "", s)
    return s[:70].rstrip("-")

def meta_title(title):
    t = title if len(title) <= 47 else title  # keep full; template appends brand
    return f"{t} | Suth Performance"

def meta_desc(angle, kw):
    base = angle.split(";")[0].strip().rstrip(".")
    # Human pass required before publish — this is the working draft.
    d = f"{base}. From the Elite 15 HYROX coaching team at Suth Performance."
    return d[:158]

CTA = {
    # cluster-prefix → (primary CTA, secondary CTA)
    "default_hyrox": ("Free HYROX plan maker (branded PDF)", "Take the fitness assessment quiz"),
    "default_pt": ("Free personal fitness assessment", "Book a free call with Ben"),
    "Gear": ("HYROX kit checklist download", "Free HYROX plan maker"),
    "Times & Benchmarks": ("Results lookup / percentile check", "Free HYROX plan maker"),
    "Data Stories": ("Results lookup / percentile check", "Free HYROX plan maker"),
    "Comparisons & Apps": ("Start the 7-day Hub trial", "Take the fitness assessment quiz"),
    "PT Cost & Value": ("See transparent coaching prices", "Free personal fitness assessment"),
    "Online Coaching": ("Book a free call with Ben", "Free personal fitness assessment"),
    "Race Cities & Events": ("Race-specific 12-week plan", "Free HYROX plan maker"),
    "Glossary": ("Explore the full HYROX guide", "Free HYROX plan maker"),
    "PT FAQ": ("Free personal fitness assessment", "See transparent coaching prices"),
}

SCHEMA = {
    "pillar": "Article + FAQPage + BreadcrumbList",
    "guide": "Article + BreadcrumbList (+HowTo where stepped)",
    "glossary": "DefinedTerm + Article + BreadcrumbList",
}

HEADER = [
    "id", "section", "cluster", "wave", "title", "slug", "primary_keyword",
    "volume", "kd", "intent", "evidence", "angle_rationale", "format",
    "word_count", "cta_primary", "cta_secondary", "hub_link",
    "image_source", "image_concept", "og_treatment", "meta_title",
    "meta_description", "schema", "status", "notes",
]

HUBS = {
    "Fundamentals & FAQ": "/hyrox/guide", "Stations": "/hyrox/stations",
    "Times & Benchmarks": "/hyrox/times", "Training Plans": "/plans",
    "Workouts": "/hyrox/workouts", "Gear": "/hyrox/gear",
    "Nutrition & Race Day": "/hyrox/nutrition", "Comparisons & Apps": "/hyrox-vs",
    "Race Cities & Events": "/hyrox/events", "Doubles & Teams": "/hyrox/doubles",
    "Women & Demographics": "/hyrox/guide", "Recovery & Injury": "/recovery",
    "Hybrid Training Science": "/hybrid-training", "Mental & Race Craft": "/hyrox/guide",
    "Data Stories": "/results", "Glossary": "/hyrox/guide",
    "HYROX FAQ": "/hyrox/guide", "Niche Audiences": "/plans",
    "Training Micro-topics": "/plans", "Seasonal & Series": "/plans",
    "Gyms & Community": "/hyrox-coach", "Programming": "/plans",
    "Race Execution": "/hyrox/guide", "Venue Intelligence": "/hyrox/events",
    "Wearables & Tech": "/hyrox/gear", "Injury & Return": "/recovery",
    "PT Cost & Value": "/how-much-is-a-personal-trainer", "Online Coaching": "/coaching",
    "Beginner Fitness": "/get-fit", "Age & Life Stage": "/get-fit",
    "Fat Loss": "/fat-loss", "Beginner Strength": "/strength",
    "Beginner Running": "/running", "Habits & Motivation": "/get-fit",
    "Niche Services": "/coaching", "Location Editorial": "/personal-trainer",
    "PT FAQ": "/coaching", "Beginner FAQ": "/get-fit",
    "Goal Training": "/strength", "Everyday Nutrition": "/get-fit",
    "Consumer Guides": "/coaching", "Process & Proof": "/coaching",
    "Pain & Injury": "/recovery", "Women's Fitness": "/get-fit",
    "Lifestyle & Context": "/get-fit", "Beginner to HYROX Bridge": "/get-fit",
    "Getting Started": "/get-fit", "Myths & Evidence": "/get-fit",
    "Coaching Philosophy": "/coaching", "Corporate & Group": "/coaching",
    "Coaching Transparency": "/how-much-is-a-personal-trainer",
    "Vetting a Coach": "/coaching", "Expectations": "/coaching",
    "Life-Situation Coaching": "/get-fit", "Tools": "/coaching",
}

WORDS = {"pillar": 2500, "guide": 1500, "glossary": 450}

def rows_for(seeds, section, prefix):
    rows, seen_slugs = [], set()
    for i, (cluster, wave, title, kw, angle, image, fmt, status) in enumerate(seeds, 1):
        slug = slugify(title)
        if slug in seen_slugs:
            raise SystemExit(f"duplicate slug: {slug}")
        seen_slugs.add(slug)
        k = kwdata.get(kw.strip().lower())
        vol = k["volume"] if k else ""
        kd = k["kd_percent"] if k else ""
        intent = k["intent"] if k else "Informational"
        evidence = "semrush" if k else "longtail-unevidenced"
        if status == "planned" and any(slug.startswith(e[:30]) or e.startswith(slug[:30]) for e in EXISTING):
            status = "check-overlap"
        cta1, cta2 = CTA.get(cluster, CTA[f"default_{'hyrox' if section=='hyrox' else 'pt'}"])
        img_src = ("own-photo" if image.startswith("own:")
                   else "data-graphic" if image.startswith("chart:")
                   else "ai-generate")
        og = ("photo + title band, brand dark/chartreuse, 1200x630"
              if img_src != "data-graphic" else
              "headline stat rendered as branded card, 1200x630")
        rows.append({
            "id": f"{prefix}{i:03d}", "section": section, "cluster": cluster,
            "wave": wave, "title": title, "slug": slug, "primary_keyword": kw,
            "volume": vol, "kd": kd, "intent": intent, "evidence": evidence,
            "angle_rationale": angle, "format": fmt,
            "word_count": WORDS.get(fmt, 1500),
            "cta_primary": cta1, "cta_secondary": cta2,
            "hub_link": HUBS.get(cluster, ""),
            "image_source": img_src, "image_concept": image.split(":", 1)[1],
            "og_treatment": og,
            "meta_title": meta_title(title), "meta_description": meta_desc(angle, kw),
            "schema": SCHEMA.get(fmt, SCHEMA["guide"]), "status": status,
            "notes": "",
        })
    return rows

hy = rows_for(HYROX, "hyrox", "H")
pt = rows_for(PT, "pt", "P")

for name, rows in [("hyrox-posts.csv", hy), ("pt-posts.csv", pt)]:
    with open(OUT / name, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=HEADER)
        w.writeheader()
        w.writerows(rows)

from collections import Counter
for label, rows in [("HYROX", hy), ("PT", pt)]:
    c = Counter(r["cluster"] for r in rows)
    ev = sum(1 for r in rows if r["evidence"] == "semrush")
    print(f"{label}: {len(rows)} posts | evidenced kw: {ev} | clusters: {dict(c)}")
print("waves:", Counter(r["wave"] for r in hy + pt))
print("statuses:", Counter(r["status"] for r in hy + pt))
