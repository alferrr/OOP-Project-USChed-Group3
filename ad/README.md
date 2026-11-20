# USChed ad video

Builds a 20-second product video. Local only; nothing here ships with the app.

There are two cuts:

- **Motion graphics (default):** `motion.html`. A blurred green gradient, kinetic type, and the app's UI rebuilt as
  vector pieces (search, course rows, a wall of ranked schedules, the real Schedule #1, a save toast). It needs no
  sign-in: `npx tsx render.ts`, `npx tsx render.ts vertical`, then `npm run build`.
- **Screen capture:** `stage.html`, built from screenshots of the real app. Follow the steps below and pass `--screens`
  to `render.ts`.

1. Start the app (`npm run dev` in the repo root) and put `USCHED_USERNAME` and `USCHED_PASSWORD` in the root `.env`.
2. `cd ad && npm install && npx playwright install chromium` (and `brew install ffmpeg`).
3. `npm run capture` signs in off camera, drives the app, and saves screenshots to `states/`. It saves one demo
   schedule and removes it again; `npx tsx cleanup.ts` removes it if a run stops half way.
4. `npx tsx render.ts --screens` and `npx tsx render.ts vertical --screens` lay out the 30 fps frames (`stage.html` holds the timeline).
5. `npm run build` encodes `out/usched-ad-16x9.mp4` and `out/usched-ad-9x16.mp4`.

`states/`, `frames*/` and `out/` are git-ignored because they show a real account. Check the frames before sharing.
