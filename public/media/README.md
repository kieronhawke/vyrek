# /public/media, image and video assets

The site references images and a hero video by stable filenames under this
folder. The current files are **placeholders** copied from `/public/posters/`
so every page renders. To go live with the licensed Adobe Stock + Mixkit
files from the supplied Google Drive folder, replace each file in place:

```
https://drive.google.com/drive/folders/1N_JH9V4gv1ptOq5siP3FTTLPj7ZKqpQM
```

## Required filenames

`/public/media/video/`
- `hero.mp4`, most cinematic of the 4 Mixkit clips
- `secondary-1.mp4`, `secondary-2.mp4`, `secondary-3.mp4`, remaining 3 (future use)

`/public/media/images/`
- `hero-poster.jpg`, frame from `hero.mp4` for slow connections / fallback
- `coach-james-wright.jpg`, `AdobeStock_1887096738.jpeg` (breath-in-cold-air)
- `programme-first-race.jpg`, `AdobeStock_2007854881.jpeg` (runner on track)
- `programme-sub-90.jpg`, `AdobeStock_1887097071.jpeg` (athlete vs wind)
- `programme-doubles.jpg`, `AdobeStock_192502307.jpeg` (weightlifter prep)
- `programme-pro.jpg`, `AdobeStock_214596042.jpeg` (crossfit dumbbells)
- `bento-plan.jpg`, `AdobeStock_1960150105.jpeg` (modern gym)
- `bento-coaches.jpg`, crop of `coach-james-wright.jpg`
- `bento-progress.jpg`, `AdobeStock_1969748374.jpeg`
- `testimonial-1.jpg`, `AdobeStock_1961018126.jpeg`
- `testimonial-2.jpg`, `AdobeStock_1973205361.jpeg`
- `quiz-interstitial-1.jpg`, `AdobeStock_297609945.jpeg`

## How to drop them in

```bash
# After downloading from Drive into ~/Downloads:
cd ~/code/vyrek
mv ~/Downloads/AdobeStock_1887096738.jpeg public/media/images/coach-james-wright.jpg
# (repeat for each file)
```

Or replace the placeholder files in this folder directly, every page in the
site already references the correct path, so the swap is one filename per
asset.

## Optimisation

Once real images are in place, run:

```bash
# Convert to AVIF + WebP for serving via next/image
npx sharp-cli public/media/images/*.jpg --format avif --quality 70
```

The site uses `<img>` tags for these (not `next/image`) at the moment, when
images drop in, consider migrating heavy ones (hero poster, programme cards)
to `next/image` with priority on `hero-poster` only.

## Hero video poster from MP4

If you have ffmpeg installed locally:

```bash
ffmpeg -i public/media/video/hero.mp4 -ss 00:00:02 -vframes 1 -q:v 2 public/media/images/hero-poster.jpg
```
