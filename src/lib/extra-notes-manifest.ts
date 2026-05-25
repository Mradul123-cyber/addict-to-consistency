import type { NotesManifest } from "./notes";

/** Storage-only chapters (also in storage-seed/extra-manifest.json). */
export const EXTRA_NOTES_MANIFEST: NotesManifest = {
  physics: {
    "phy-2": { hasNotes: true, hasFormulas: true },
  },
};
