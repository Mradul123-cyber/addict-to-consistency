## JEE Workstation — Build Plan

A single-user, client-side React app (TanStack Start) with no backend. All state persists in `localStorage`. Five curriculum tracks, deep-focus timer, consistency analytics, and a global override matrix.

### Routes (file-based, `src/routes/`)
- `index.tsx` — Dashboard: countdown, CQ ring, 28-day bar chart, today's logged minutes, quick "Start Session" CTA.
- `tracks.tsx` — Tracks overview: 5 subject cards → chapter lists with priority tag + completion %.
- `focus.tsx` — Deep Focus Timer workspace (chapter selector required, duration picker, ambient audio, urge surfer, tab-drift shield).
- `log.tsx` — Manual log form for offline study blocks.
- `matrix.tsx` — Global Override Matrix: all chapters across all 5 tracks; click to edit % inline.
- `__root.tsx` — shared shell with top nav (Dashboard / Tracks / Focus / Log / Matrix) and countdown chip.

### Data model (TypeScript, persisted in localStorage)
```
Track       { id, name, chapters: Chapter[] }
Chapter     { id, trackId, name, priority: 'High'|'Medium', completion: 0..100 }
SessionLog  { id, chapterId|null, dateISO, minutes, focusRating?: 1..5, source: 'timer'|'manual' }
Settings    { lastDuration, lastAmbient }
```

Storage keys: `jee.tracks`, `jee.sessions`, `jee.settings`. Seeded once on first load with a high-yield chapter list per subject (Physics, Physical Chem, Organic Chem, Inorganic Chem, Mathematics).

Access layer: `src/lib/store.ts` exposes typed getters/setters + a tiny pub/sub so views re-render on writes. A `useStore` hook wraps `useSyncExternalStore`.

### Analytics (`src/lib/analytics.ts`)
- `daysUntilJEE()` → days between today and `2027-01-20`.
- `consistencyQuotient()` → look at last 7 calendar days; count days where `sum(minutes) >= 150`; return `count/7 * 100`.
- `dailyMinutes28()` → array of `{date, minutes}` for the last 28 days (zero-filled).

### Focus Timer (`src/routes/focus.tsx` + `src/components/FocusTimer.tsx`)
- Gate: must pick a chapter from a dropdown grouped by track. Start button disabled otherwise.
- Duration choices: 45 / 60 / 90 / 120 min (segmented control).
- Tick via `setInterval(1000)`; pause/resume; cancel.
- Tab Drift Shield: `visibilitychange` listener while running flips `document.title` to `⚠ Refocus — JEE Timer` and restores original on return.
- Ambient Audio Masking: `src/lib/audio.ts` using `WebAudio` —
  - White noise: random buffer through `AudioBufferSourceNode`.
  - Brown noise: integrated/low-passed random signal.
  - Binaural Beats: two `OscillatorNode`s (e.g. 200 Hz L / 210 Hz R) panned hard L/R.
  - Single play/stop control + dropdown.
- Urge Surfer: modal/panel with a 90-second breathing animation (CSS scale + countdown) plus 3 rotating focus reminders.
- Session Commit Loop: when timer hits 0, open a dialog →
  - Input: actual minutes studied (prefilled with planned).
  - Focus rating: 1–5 (radio buttons).
  - On save: append `SessionLog`, bump that chapter's `completion` by a deterministic amount (`+ round(actualMinutes/30)` capped at 100, weighted slightly by rating), recompute CQ, navigate back to dashboard.

### Manual Log (`src/routes/log.tsx`)
Form: chapter (optional), date (default today), minutes, focus rating (optional). Saves a `SessionLog` with `source: 'manual'` and updates chapter completion the same way.

### Global Override Matrix (`src/routes/matrix.tsx`)
Table grouped by track: chapter name, priority badge, completion %. Click row → inline number input (0–100) + save; writes straight to `jee.tracks`.

### UI / Design system
- Use shadcn primitives already in `src/components/ui/*` (card, button, dialog, select, progress, table, badge, tabs, slider).
- Add semantic tokens in `src/styles.css` only if needed (e.g. `--success`, `--warning` for priority badges); reuse existing tokens otherwise.
- Charts: lightweight inline SVG bars for the 28-day visualizer (no extra dep), CQ shown as a `Progress` ring/bar.

### Technical notes
- All state lives in the browser — no server functions, no Cloud.
- `useStore` subscribes once; analytics derived per render from current snapshot.
- Audio context created lazily on first user gesture (browser autoplay policy).
- SSR-safe: every `localStorage`/`AudioContext` access guarded with `typeof window !== 'undefined'` or moved into `useEffect`.

### File additions
```
src/lib/store.ts
src/lib/analytics.ts
src/lib/audio.ts
src/lib/seed.ts
src/components/AppNav.tsx
src/components/CountdownChip.tsx
src/components/CQGauge.tsx
src/components/HistoryChart.tsx
src/components/ChapterPicker.tsx
src/components/FocusTimer.tsx
src/components/SessionCommitDialog.tsx
src/components/UrgeSurfer.tsx
src/components/AmbientAudioControl.tsx
src/routes/index.tsx           (replace placeholder)
src/routes/tracks.tsx
src/routes/focus.tsx
src/routes/log.tsx
src/routes/matrix.tsx
src/routes/__root.tsx          (add nav + outlet)
```

No new npm dependencies required.