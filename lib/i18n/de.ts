import type { GeoSeo } from "@/lib/locations/seo";

/**
 * German copy for the location pages.
 *
 * WRITTEN, NOT TRANSLATED
 *
 * The English pages are not the source text. Translating them literally
 * produces the thing every reader recognises instantly as a translated page —
 * correct grammar, foreign rhythm — and it imports arguments that do not
 * transfer. "Without the hourly rate" lands in a UK market where PT pricing is
 * a known grievance; in Germany the equivalent objection is closer to
 * Vertragsbindung, the twelve-month gym contract.
 *
 * So the German pages make the German version of the argument, from the same
 * data: named gyms nearby, the real race and how far it is, and a programme
 * that adapts weekly rather than a session you book and pay for one at a time.
 *
 * NOT REVIEWED BY A NATIVE SPEAKER
 *
 * See lib/i18n/config.ts. This is idiomatic rather than literal and it should
 * still be read by a German speaker before these pages are opened to search.
 * Formal "Sie" throughout, which is the register a paying coaching client in
 * Germany expects; a native reviewer may well argue for "du" given the
 * fitness context, and that is exactly the kind of call worth having them make.
 */

export type LocalisedCopy = {
  /** Rendered title, before the brand suffix. */
  title: (city: string) => string;
  description: (city: string, seo: GeoSeo) => string;
  eyebrow: (city: string, country: string) => string;
  h1: (city: string) => string;
  sub: (city: string, seo: GeoSeo) => string;
  ctaPrimary: string;
  ctaSecondary: string;
  ctaNote: string;
  gymsHeading: (city: string) => string;
  gymsIntro: (city: string, count: number) => string;
  gymsAttribution: string;
  raceHeading: string;
  raceHosts: (city: string) => string;
  raceNear: (city: string, race: string, km: number) => string;
  raceCaveat: string;
  faqHeading: (city: string) => string;
  faqs: (city: string, seo: GeoSeo) => { q: string; a: string }[];
  nearbyHeading: (city: string) => string;
  nearbyIntro: (country: string) => string;
  closingHeading: string;
  closingSub: string;
  languageNote: (href: string) => { text: string; linkText: string };
};

const nf = (n: number) => n.toLocaleString("de-DE");

export const de: LocalisedCopy = {
  title: (city) => `Hyrox Training in ${city}`,
  description: (city, seo) =>
    seo.gyms.length
      ? `Hyrox Training in ${city} von Elite-15-Athlet Ben Sutherland. Ein persönlicher 12-Wochen-Plan, abgestimmt auf Ihren Wettkampf und auf eines der ${nf(seo.gyms.length)} Studios in Ihrer Nähe. Kostenloses Erstgespräch.`
      : `Hyrox Training in ${city} von Elite-15-Athlet Ben Sutherland. Ein persönlicher 12-Wochen-Plan, abgestimmt auf Ihren Wettkampf und auf Ihre Ausrüstung. Kostenloses Erstgespräch.`,

  eyebrow: (city, country) => `${city} · ${country}`,
  h1: (city) => `Hyrox Training in ${city}`,

  sub: (city, seo) => {
    const bits: string[] = [];
    if (seo.gyms.length) {
      const chains = seo.chains.slice(0, 2);
      bits.push(
        `In und um ${city} liegen ${nf(seo.gyms.length)} Studios und Sportzentren` +
          (chains.length ? `, darunter ${chains.join(" und ")}` : "") +
          `. Der Plan wird um das Studio herum geschrieben, in dem Sie ohnehin trainieren.`,
      );
    }
    if (seo.nearestRace) {
      bits.push(
        seo.hostsRace
          ? `${city} ist Austragungsort — jede Einheit wird von diesem Wochenende aus rückwärts geplant.`
          : `Der nächste Wettkampf ist ${seo.nearestRace.city}, rund ${nf(seo.nearestRace.straightLineKm)} km Luftlinie entfernt.`,
      );
    }
    bits.push(
      `Erstellt von Ben Sutherland, Athlet der HYROX Elite 15. Sie sehen Ihre erste Trainingswoche, bevor Sie sich entscheiden.`,
    );
    return bits.join(" ");
  },

  ctaPrimary: "Drei-Minuten-Test starten",
  ctaSecondary: "Kostenloses Gespräch mit Ben",
  ctaNote: "Kostenlos · keine Kartendaten · keine Bindung",

  gymsHeading: (city) => `Wo Sie in ${city} trainieren können`,
  gymsIntro: (city, count) =>
    `Entscheidend ist nicht der HYROX-Aufkleber an der Tür, sondern eine Fläche, die für den Sled lang genug ist, eine freie Wand für Wall Balls und ein Ruderergometer, an dem um 18 Uhr niemand ansteht. ${nf(count)} benannte Standorte im Umkreis von ${city}:`,
  gymsAttribution:
    "Studiodaten von OpenStreetMap-Mitwirkenden, lizenziert unter ODbL. Verzeichnet ist, dass ein Standort existiert — nicht, welche Geräte dort stehen. Prüfen Sie die Ausstattung, bevor Sie einen Vertrag abschließen.",

  raceHeading: "Ihr nächster Wettkampf",
  raceHosts: (city) =>
    `Der Wettkampf kommt zu Ihnen. Sie können die Halle vorher ansehen, und die Menschen, neben denen Sie trainieren, stehen auf derselben Startliste. Ein Plan, der auf dieses Wochenende datiert ist, ist mehr wert als zwölf allgemeine Wochen.`,
  raceNear: (city, race, km) =>
    `${race}, rund ${nf(km)} km Luftlinie von ${city}. Weit genug, dass ein Wettkampf ein Wochenende ist und keine Anfahrt am Morgen — das ändert vor allem das Tapering, nicht das Training.`,
  raceCaveat:
    "Luftlinie, die Fahrstrecke ist länger. Termine und Hallen stammen von den offiziellen HYROX-Veranstaltungsseiten; prüfen Sie dort, bevor Sie Reisen buchen.",

  faqHeading: (city) => `Häufige Fragen zum Hyrox Training in ${city}`,
  faqs: (city, seo) => [
    {
      q: `Wie fange ich in ${city} mit dem Hyrox Training an?`,
      a: `Mit dem Drei-Minuten-Test. Er fragt nach Ihrem Wettkampftermin, Ihrer Erfahrung, Ihren Trainingstagen und der Ausrüstung, die Ihnen in ${city} zur Verfügung steht. Danach sehen Sie Ihre vollständige erste Woche — datiert und strukturiert — bevor Sie sich für irgendetwas entscheiden.`,
    },
    {
      q: `Brauche ich ein spezielles Hyrox-Studio?`,
      a: seo.gyms.length
        ? `Nein. Wir führen ${nf(seo.gyms.length)} Studios und Sportzentren rund um ${city}, und der Plan enthält nur Übungen, die Sie dort auch ausführen können. Für die meisten der acht Stationen gibt es eine Alternative, die dieselbe Fähigkeit trainiert — ein affiliiertes Studio ist angenehm, aber keine Voraussetzung.`
        : `Nein. Der Test fragt, welche Geräte Sie erreichen können, und der Plan enthält nur Übungen, die dort möglich sind.`,
    },
    {
      q: `Funktioniert Online-Coaching, wenn der Trainer in Großbritannien sitzt?`,
      // The honest version of the objection, not a dodge: the answer is that
      // nothing depends on a shared time slot.
      a: `Ja, und die Zeitverschiebung spielt kaum eine Rolle, weil nichts an einem gemeinsamen Termin hängt. Der Plan richtet sich nach Ihrem Kalender, nicht nach einer Trainingsstunde. Sie protokollieren, was Sie gemacht haben, der Plan wird sonntags neu berechnet, und Fragen werden in der App beantwortet. Bezahlt wird die Programmierung und die wöchentliche Anpassung — genau das, was ein Trainer vor Ort zwischen zwei Stunden nicht leisten kann.`,
    },
    {
      q: `Was kostet das im Vergleich zu einem Personal Trainer in ${city}?`,
      // No figure, ours or a competitor's — the same policy the English pages
      // follow. The German objection is the contract, not the hourly rate.
      a: `Personal Training vor Ort wird pro Einheit abgerechnet, die Kosten steigen also mit jeder zusätzlichen Trainingseinheit. Studiomitgliedschaften laufen umgekehrt oft über eine feste Vertragslaufzeit, unabhängig davon, ob Sie hingehen. Dies ist ein Trainingsplan: Er deckt die gesamte Woche ab, passt sich an und verdoppelt sich nicht, wenn Sie häufiger trainieren. Die Preisgestaltung ist individuell und beginnt mit einem kostenlosen Gespräch mit Ben.`,
    },
  ],

  nearbyHeading: (city) => `In der Nähe von ${city}`,
  nearbyIntro: (country) =>
    `Viele trainieren im Nachbarort — wegen des besseren Studios, der flacheren Laufstrecke oder einfach, weil es auf dem Heimweg liegt. Weitere Orte in ${country}:`,

  closingHeading: "Drei Minuten bis zu Ihrem Plan.",
  closingSub: "Ihre erste Woche sehen Sie kostenlos, bevor Sie sich entscheiden.",

  languageNote: (href) => ({
    text: "This page is also available in English:",
    linkText: href,
  }),
};
