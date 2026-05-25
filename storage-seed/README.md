# Notes Storage seed files

Sample chapter content from `temp-prototype` (formula-flash-notes), mapped to production IDs in `src/lib/seed.ts`.

## Quick test (no upload)

With `bun run dev`, the app uses **bundled seed JSON first** (no Storage round-trip). Console CORS errors on `firebasestorage.googleapis.com` are harmless in dev if you have not uploaded files yet.

### If you see CORS errors in the browser console

Browsers often report Firebase Storage denials as “CORS” when the real cause is:

1. **Not signed in** — `storage.rules` requires `request.auth != null` for `notes/**`.
2. **Files not uploaded** — object path missing (404 on the Storage API).
3. **Rules not deployed** — run `firebase deploy --only storage`.

After uploading, apply bucket CORS once (only needed if you fetch via public download URLs):

```bash
gcloud storage buckets update gs://matrix-jee-workstation.firebasestorage.app --cors-file=storage.cors.json
```

The app loads note JSON with the Firebase SDK (`getBytes`), not `fetch(downloadURL)`, so bucket CORS is usually unnecessary.

## Upload to Firebase (production / shared testing)

1. Deploy rules (once): `firebase deploy --only storage`
2. Firebase Console → **Storage** → create folder `notes/`
3. Upload everything under `storage-seed/notes/` preserving paths:
   - `notes/index.json`
   - `notes/physics/phy-5/short-notes.json` (etc.)

Regenerate files after editing seed source:

```bash
bun run notes:seed-files
```

## Storage-only chapters (not in dev bundle)

Chapters listed in `extra-manifest.json` (and `src/lib/extra-notes-manifest.ts` for manifest fallback when Storage is unreachable) with JSON under `notes/` are uploaded to Firebase but **not** included in `notes-seed-data.ts` (local dev bundle). Use this to test Storage-only content (e.g. **Laws of Motion** `phy-2`).

After adding files, upload:

```bash
bun run notes:upload
```

Or upload only changed paths:

```bash
gcloud storage cp storage-seed/notes/index.json gs://matrix-jee-workstation.firebasestorage.app/notes/index.json
gcloud storage cp --recursive storage-seed/notes/physics/phy-2 gs://matrix-jee-workstation.firebasestorage.app/notes/physics/
```

## Chapters with sample content (bundle + Storage)

| Subject | Chapter | Notes | Formulas |
|---------|---------|-------|----------|
| Physics | Laws of Motion (`phy-2`) | ✓ | ✓ | Storage-only |
| Physics | Thermodynamics (`phy-5`) | ✓ | ✓ |
| Physics | Kinematics (`phy-1`) | | ✓ |
| Physical Chemistry | Chemical Kinetics (`pc-7`) | ✓ | ✓ |
| Physical Chemistry | Thermodynamics (`pc-3`) | ✓ | ✓ |
| Organic Chemistry | GOC & Isomerism (`oc-1`) | ✓ | |
| Inorganic Chemistry | Periodic Table (`ic-2`) | ✓ | |
| Inorganic Chemistry | Coordination Compounds (`ic-3`) | | ✓ |
| Mathematics | Limits… (`m-6`) | ✓ | ✓ |
