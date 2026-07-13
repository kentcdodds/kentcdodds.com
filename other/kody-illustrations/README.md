# Kody illustration masters

Master transparent PNGs for the "standing" (neutral stance) Kody illustrations
shown on [/kody](https://kentcdodds.com/kody). Four unique compositions, each
replicated in the four team colorways (blue, red, yellow, gray):

- `kody_standing_<color>.png` — neutral stance, no jacket
- `kody_standing_jacket_<color>.png` — neutral stance with the team jacket
- `kody_standing_flying_<color>.png` — flying style (floating objects)
- `kody_standing_jacket_flying_<color>.png` — flying style with the team jacket

Filenames intentionally use snake_case to match the existing
`kentcdodds.com/illustrations/kody/*` media ids — each filename (minus `.png`)
is the R2 key suffix.

These files are referenced by id from `services/site/app/images.tsx` and
served from the `kentcdodds-com` R2 bucket at runtime; the repo copies are the
source of truth for (re-)uploading:

```sh
# local dev (Miniflare R2):
node services/site/scripts/upload-kody-illustrations.mjs --local

# production (needs an R2-write Cloudflare token):
node services/site/scripts/upload-kody-illustrations.mjs --remote
```
