import type { LocalisedCopy } from "@/lib/i18n/de";

/**
 * Spanish copy for the location pages.
 *
 * Spanish is the widest-reach locale on the calendar: 10 races across Spain,
 * Mexico and Argentina, against 8 for German. One copy pack serves three
 * markets, which is why it is worth writing carefully.
 *
 * Neutral peninsular Spanish, avoiding the constructions that read as
 * distinctly Iberian to a Mexican or Argentine reader. "Usted" is not used:
 * a coaching page addressed formally reads cold across Latin America, and
 * "tú" is the register the fitness market actually uses in all three.
 *
 * NOT REVIEWED BY A NATIVE SPEAKER. See lib/i18n/config.ts. If a reviewer is
 * available for only one variant, Spain is the one to prioritise — it carries
 * seven of the ten races.
 */

const nf = (n: number) => n.toLocaleString("es-ES");

export const es: LocalisedCopy = {
  title: (city) => `Entrenamiento Hyrox en ${city}`,
  description: (city, seo) =>
    seo.gyms.length
      ? `Entrenamiento Hyrox en ${city} con Ben Sutherland, atleta HYROX Elite 15. Un plan personalizado de 12 semanas, ajustado a tu carrera y a cualquiera de los ${nf(seo.gyms.length)} gimnasios cercanos. Primera consulta gratuita.`
      : `Entrenamiento Hyrox en ${city} con Ben Sutherland, atleta HYROX Elite 15. Un plan personalizado de 12 semanas, ajustado a tu carrera y a tu material. Primera consulta gratuita.`,

  eyebrow: (city, country) => `${city} · ${country}`,
  h1: (city) => `Entrenamiento Hyrox en ${city}`,

  sub: (city, seo) => {
    const bits: string[] = [];
    if (seo.gyms.length) {
      const chains = seo.chains.slice(0, 2);
      bits.push(
        `Hay ${nf(seo.gyms.length)} gimnasios y centros deportivos registrados cerca de ${city}` +
          (chains.length ? `, entre ellos ${chains.join(" y ")}` : "") +
          `. El plan se escribe alrededor del que ya usas.`,
      );
    }
    if (seo.nearestRace) {
      bits.push(
        seo.hostsRace
          ? `${city} acoge una carrera, así que cada sesión se fecha hacia atrás desde ese fin de semana.`
          : `La carrera más cercana es ${seo.nearestRace.city}, a unos ${nf(seo.nearestRace.straightLineKm)} km en línea recta.`,
      );
    }
    bits.push(
      `Creado por Ben Sutherland, atleta del HYROX Elite 15. Ves tu primera semana antes de decidir nada.`,
    );
    return bits.join(" ");
  },

  ctaPrimary: "Hacer el test de 3 minutos",
  ctaSecondary: "Hablar con Ben, gratis",
  ctaNote: "Gratis · sin tarjeta · sin compromiso",

  gymsHeading: (city) => `Dónde entrenar en ${city}`,
  gymsIntro: (city, count) =>
    `Lo que importa no es la pegatina de HYROX en la puerta, sino una zona lo bastante larga para el trineo, una pared libre para los wall balls y un remo que no tenga cola a las siete. ${nf(count)} centros registrados cerca de ${city}:`,
  gymsAttribution:
    "Datos de gimnasios de colaboradores de OpenStreetMap, con licencia ODbL. Registran que un centro existe, no qué material tiene. Comprueba el equipamiento antes de contratar nada.",

  raceHeading: "Tu carrera más cercana",
  raceHosts: (city) =>
    `La carrera llega a ${city}. Puedes ver el recinto antes y la gente con la que entrenas estará en la misma lista de salida. Un plan fechado a ese fin de semana vale más que doce semanas genéricas.`,
  raceNear: (city, race, km) =>
    `${race}, a unos ${nf(km)} km en línea recta desde ${city}. Lo bastante lejos como para que la carrera sea un fin de semana y no una mañana, lo que cambia sobre todo la puesta a punto, no el entrenamiento.`,
  raceCaveat:
    "Distancia en línea recta; el viaje real es mayor. Las fechas y los recintos proceden de las páginas oficiales de HYROX: compruébalas antes de reservar viaje.",

  faqHeading: (city) => `Preguntas frecuentes sobre entrenar Hyrox en ${city}`,
  faqs: (city, seo) => [
    {
      q: `¿Cómo empiezo a entrenar Hyrox en ${city}?`,
      a: `Con el test de tres minutos. Pregunta por tu fecha de carrera, tu nivel, los días que puedes entrenar y el material al que llegas en ${city}. Después ves tu primera semana completa, fechada y estructurada, antes de comprometerte a nada.`,
    },
    {
      q: `¿Necesito un gimnasio afiliado a Hyrox?`,
      a: seo.gyms.length
        ? `No. Tenemos registrados ${nf(seo.gyms.length)} gimnasios y centros deportivos cerca de ${city}, y el plan solo incluye ejercicios que puedes hacer donde entrenas. La mayoría de las ocho estaciones tiene una alternativa que entrena lo mismo: un gimnasio afiliado ayuda, pero no es un requisito.`
        : `No. El test pregunta a qué material tienes acceso y el plan solo incluye lo que puedas hacer de verdad.`,
    },
    {
      q: `¿Funciona el entrenamiento online si el entrenador está en el Reino Unido?`,
      a: `Sí, y la diferencia horaria importa menos de lo que parece, porque nada depende de coincidir en una hora concreta. El plan se ajusta a tu calendario, no a una sesión reservada. Registras lo que has hecho, el domingo el plan se recalcula, y las dudas se resuelven en la aplicación. Lo que pagas es la programación y su ajuste semanal, que es justo lo que un entrenador por horas no puede darte entre sesión y sesión.`,
    },
    {
      q: `¿Cuánto cuesta comparado con un entrenador personal en ${city}?`,
      a: `El entrenamiento presencial se paga por sesión, así que el coste sigue a la frecuencia y se detiene cuando tú te detienes. Esto es un programa: cubre la semana entera, se adapta y no se duplica porque decidas entrenar el doble. El precio es personalizado y empieza con una consulta gratuita con Ben.`,
    },
  ],

  nearbyHeading: (city) => `Cerca de ${city}`,
  nearbyIntro: (country) =>
    `Mucha gente entrena en la ciudad de al lado: mejor gimnasio, recorrido más llano o simplemente de camino a casa. Otras ciudades que cubrimos en ${country}:`,

  closingHeading: "Tres minutos y tienes un plan.",
  closingSub: "Tu primera semana es gratis, antes de decidir nada.",

  languageNote: (href) => ({
    text: "This page is also available in English:",
    linkText: href,
  }),
};
