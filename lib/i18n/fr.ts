import type { GeoSeo } from "@/lib/locations/seo";
import type { LocalisedCopy } from "@/lib/i18n/de";

/**
 * French copy for the location pages.
 *
 * France carries more races than any other European country — 8, with Paris
 * hosting three, the most-repeated city on the calendar — and French searchers
 * are among the least likely in Europe to accept an English result. This is
 * the market where an English-only page costs us the most.
 *
 * Written rather than translated, on the same principle as the German pack.
 * The French objection is not the hourly rate and not the contract; it is the
 * salle de sport subscription that runs whether you go or not, and the coach
 * who writes the same block for everybody. That is the argument made here.
 *
 * NOT REVIEWED BY A NATIVE SPEAKER. See lib/i18n/config.ts. Uses "vous"
 * throughout, which is right for a paying client; a reviewer may prefer "tu"
 * for a fitness audience.
 */

const nf = (n: number) => n.toLocaleString("fr-FR");

export const fr: LocalisedCopy = {
  title: (city) => `Entraînement Hyrox à ${city}`,
  description: (city, seo) =>
    seo.gyms.length
      ? `Entraînement Hyrox à ${city} avec Ben Sutherland, athlète HYROX Elite 15. Un plan personnalisé de 12 semaines, calé sur votre course et sur l'une des ${nf(seo.gyms.length)} salles proches. Premier échange gratuit.`
      : `Entraînement Hyrox à ${city} avec Ben Sutherland, athlète HYROX Elite 15. Un plan personnalisé de 12 semaines, calé sur votre course et sur votre matériel. Premier échange gratuit.`,

  eyebrow: (city, country) => `${city} · ${country}`,
  h1: (city) => `Entraînement Hyrox à ${city}`,

  sub: (city, seo) => {
    const bits: string[] = [];
    if (seo.gyms.length) {
      const chains = seo.chains.slice(0, 2);
      bits.push(
        `${nf(seo.gyms.length)} salles et centres sportifs sont recensés autour de ${city}` +
          (chains.length ? `, dont ${chains.join(" et ")}` : "") +
          `. Le plan est écrit autour de celle où vous vous entraînez déjà.`,
      );
    }
    if (seo.nearestRace) {
      bits.push(
        seo.hostsRace
          ? `${city} accueille une course : chaque séance est datée à rebours de ce week-end-là.`
          : `La course la plus proche est ${seo.nearestRace.city}, à environ ${nf(seo.nearestRace.straightLineKm)} km à vol d'oiseau.`,
      );
    }
    bits.push(
      `Conçu par Ben Sutherland, athlète du HYROX Elite 15. Vous voyez votre première semaine avant de décider quoi que ce soit.`,
    );
    return bits.join(" ");
  },

  ctaPrimary: "Faire le test de 3 minutes",
  ctaSecondary: "Échanger avec Ben, gratuitement",
  ctaNote: "Gratuit · sans carte bancaire · sans engagement",

  gymsHeading: (city) => `Où vous entraîner à ${city}`,
  gymsIntro: (city, count) =>
    `Ce qui compte n'est pas l'autocollant HYROX sur la porte, mais une allée assez longue pour le sled, un mur libre pour les wall balls et un rameur libre à 18 h. ${nf(count)} établissements recensés autour de ${city} :`,
  gymsAttribution:
    "Données des salles issues des contributeurs OpenStreetMap, sous licence ODbL. Elles indiquent qu'un établissement existe, pas quel matériel s'y trouve. Vérifiez l'équipement avant de vous engager.",

  raceHeading: "Votre course la plus proche",
  raceHosts: () =>
    `La course vient à vous. Vous pouvez reconnaître le site à l'avance, et les gens à côté de qui vous vous entraînez seront sur la même liste de départ. Un plan daté sur ce week-end vaut mieux que douze semaines génériques.`,
  raceNear: (city, race, km) =>
    `${race}, à environ ${nf(km)} km à vol d'oiseau de ${city}. Assez loin pour que la course soit un week-end et non une matinée, ce qui change surtout l'affûtage, pas l'entraînement.`,
  raceCaveat:
    "Distance à vol d'oiseau ; le trajet réel est plus long. Dates et sites proviennent des pages officielles HYROX : vérifiez-les avant de réserver un déplacement.",

  faqHeading: (city) => `Questions fréquentes sur l'entraînement Hyrox à ${city}`,
  faqs: (city, seo) => [
    {
      q: `Comment commencer l'entraînement Hyrox à ${city} ?`,
      a: `Par le test de trois minutes. Il porte sur votre date de course, votre niveau, vos jours disponibles et le matériel auquel vous avez accès à ${city}. Vous voyez ensuite votre première semaine complète, datée et structurée, avant de vous engager.`,
    },
    {
      q: `Faut-il une salle affiliée Hyrox ?`,
      a: seo.gyms.length
        ? `Non. Nous recensons ${nf(seo.gyms.length)} salles et centres sportifs autour de ${city}, et le plan ne contient que des exercices réalisables là où vous allez. La plupart des huit stations ont une alternative qui travaille la même qualité : une salle affiliée est un confort, pas une condition.`
        : `Non. Le test demande quel matériel vous pouvez atteindre, et le plan ne contient que ce que vous pouvez réellement faire.`,
    },
    {
      q: `Le coaching en ligne fonctionne-t-il si le coach est au Royaume-Uni ?`,
      a: `Oui, et le décalage compte moins qu'on ne le croit, parce que rien ne dépend d'un créneau commun. Le plan suit votre agenda, pas une heure de rendez-vous. Vous enregistrez vos séances, le plan se recalcule le dimanche, et vos questions trouvent réponse dans l'application. Ce que vous payez, c'est la programmation et son ajustement — précisément ce qu'un coach à l'heure ne peut pas vous donner entre deux séances.`,
    },
    {
      q: `Combien cela coûte-t-il par rapport à un coach à ${city} ?`,
      a: `Le coaching en présentiel se paie à la séance : le coût suit la fréquence et s'arrête quand vous vous arrêtez. Un abonnement en salle fait l'inverse — il court que vous y alliez ou non. Ici il s'agit d'un programme : il couvre la semaine entière, il s'adapte, et il ne double pas parce que vous décidez de vous entraîner deux fois plus. La tarification est personnalisée et commence par un échange gratuit avec Ben.`,
    },
  ],

  nearbyHeading: (city) => `Près de ${city}`,
  nearbyIntro: (country) =>
    `Beaucoup s'entraînent dans la ville d'à côté : meilleure salle, parcours plus plat, ou simplement sur le trajet du retour. Autres villes couvertes en ${country} :`,

  closingHeading: "Trois minutes, et vous avez un plan.",
  closingSub: "Votre première semaine est gratuite, avant toute décision.",

  languageNote: (href) => ({
    text: "This page is also available in English:",
    linkText: href,
  }),
};
