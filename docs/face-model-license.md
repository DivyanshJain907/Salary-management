# Face matching model licensing

The local matching implementation uses:

- `@vladmandic/face-api` — MIT license: https://github.com/vladmandic/face-api
- Face API model weights — from the `face-api.js` repository: https://github.com/justadudewhohacks/face-api.js
- Repository license: MIT: https://github.com/justadudewhohacks/face-api.js/blob/master/LICENSE

The downloaded weight files are stored in `public/models/` and are loaded by the browser.

This package provides face detection and recognition descriptors. It is not anti-spoofing/liveness verification. Head-movement text is currently recorded as a challenge only and is not yet validated with server-side landmarks.

Acceptance threshold:

- Default cosine similarity: `0.55`
- Configurable with `FACE_MATCH_THRESHOLD`

The threshold requires real-device testing before commercial deployment. Failed or inconclusive matches must not be reported as verified attendance.
