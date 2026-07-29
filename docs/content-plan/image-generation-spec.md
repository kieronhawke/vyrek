# Image generation spec (Gemini)

How to generate blog imagery that looks real, sits on brand, and never
misleads. Companion to `image-and-media-plan.md`.

---

## The base prompt

Every generated image starts from this and adds its subject. Keep the style
block identical across the whole library — a consistent grade is what makes
a set of images read as one brand's photography rather than stock.

```
Photorealistic editorial sports photography, documentary style.
Shot on a full-frame camera, 35mm or 50mm lens, natural available light,
shallow-to-medium depth of field. Muted, slightly desaturated colour grade
with deep blacks and cool shadows. Real UK gym or track environment —
worn rubber flooring, scuffed weight plates, chalk dust, industrial
ceiling, honest wear. Real athletic bodies of varied age, build and
ethnicity. Genuine effort and fatigue on faces, not posed smiles.
No text, no logos, no branding of any kind anywhere in frame.
Composition leaves clear space in the upper third for a title overlay.
16:9 aspect ratio.

SUBJECT: [the specific scene from the image_concept column]
```

## Negative prompt (always include)

```
text, letters, numbers, watermark, logo, brand name, signage, race bib,
glossy stock-photo lighting, perfect teeth, model poses, oversaturated
colours, plastic skin, extra fingers, deformed hands, distorted equipment,
floating weights, impossible anatomy, blurry faces, HDR halos
```

## Aspect ratios to generate

Generate the hero at 16:9, then check the crops before accepting:

| Use | Ratio | Check |
|---|---|---|
| Post hero | 16:9 | Subject reads at 800px wide |
| Social / OG card | 1.91:1 | Nothing important in the outer 8% |
| Mobile hero crop | 4:5 | Subject survives a centre crop |

If the subject only works in one crop, regenerate with the subject more
centred. Do not solve it by shipping a differently-composed second image.

## The authenticity check — every image, before it ships

Zoom to 100% and check each one. If any fails, regenerate rather than
retouch.

1. **Hands.** Five fingers, plausible grip, thumb on the correct side. This
   is still the most common tell.
2. **Equipment physics.** Plate sizes consistent with each other, erg
   chains and handles connected correctly, sled ropes taut where they
   should be, sandbags deformed under load rather than rigid.
3. **Body under load.** Muscles engaged in the right places for the
   movement. A sled push with an upright spine and relaxed arms is wrong,
   and any athlete will spot it instantly.
4. **No text anywhere.** Check backgrounds, kit, walls, equipment. Models
   garble text and garbled text is the fastest way to look fake.
5. **Lighting consistency.** One dominant light direction, shadows all
   agreeing with it.
6. **Background survives a zoom.** No melted equipment, no impossible
   architecture, no duplicated people.
7. **The two-second test.** Would a HYROX athlete glance at this and think
   "that's AI"? If you hesitate, regenerate.

## Hard limits (do not generate these, ever)

- **No HYROX logo, event branding, race signage or bibs.** Trademark hard
  rule. Generated race branding is both fake and legally risky.
- **No image presented as a specific real event, venue or person.**
  City-guide imagery shows the *city*, never a claimed race scene.
- **No before-and-after, client results, or testimonial faces.** Generated
  images illustrate; they never evidence. This is hard rule 1 and it is the
  line that matters most.
- **No image of Ben.** Ben is a real person with a real face. Every image
  of him is a real photograph or it does not exist.

## Provenance

Every generated file gets a record in `docs/image-manifest.json`:

```json
{
  "path": "/media/images/generated/<slug>-hero.jpg",
  "origin": "ai-generated",
  "model": "gemini",
  "prompt": "<the full prompt used>",
  "generatedOn": "2026-07-29",
  "checkedBy": "<who ran the authenticity check>"
}
```

We must always be able to answer "is this photo real?" — internally and, if
anyone asks, publicly. Consider writing C2PA/IPTC metadata into the files
themselves; it costs nothing and ages well.

## Where generated images are NOT the answer

- **The eight station guides** already have real photography. Use it.
- **Anything featuring Ben.** Real shoot only.
- **Data posts.** A chart carries more weight than a photo and is unique to
  us. Reach for `<BarChart>`, `<Breakdown>` or `<StatTile>` first.
- **Venue and city guides.** A generic city shot is honest; a fabricated
  race floor is not.
