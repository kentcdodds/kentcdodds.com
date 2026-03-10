This directory contains the Call Kent stitch assets that are baked into the
worker sandbox image:

- `intro.mp3`
- `interstitial.mp3`
- `outro.mp3`

The sandbox CLI tests still generate temporary fixture assets at runtime so the
shell-based integration test does not depend on these production files.
