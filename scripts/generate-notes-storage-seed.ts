/**
 * Writes Firebase Storage–ready JSON under storage-seed/notes/
 * Run: bun run scripts/generate-notes-storage-seed.ts
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  SEED_BLOCKS,
  SEED_NOTES_MANIFEST,
  getSeedFormulaSheet,
  getSeedShortNotes,
} from "../src/lib/notes-seed-data";
import type { NotesManifest } from "../src/lib/notes";

const ROOT = join(import.meta.dir, "..", "storage-seed");
const OUT = join(ROOT, "notes");
const EXTRA_MANIFEST = join(ROOT, "extra-manifest.json");

function mergeManifest(
  base: NotesManifest,
  extra: NotesManifest,
): NotesManifest {
  const merged: NotesManifest = structuredClone(base);
  for (const [subjectId, chapters] of Object.entries(extra)) {
    merged[subjectId] ??= {};
    for (const [chapterId, flags] of Object.entries(chapters)) {
      merged[subjectId][chapterId] = flags;
    }
  }
  return merged;
}

async function writeJson(path: string, data: unknown) {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function loadExtraManifest(): Promise<NotesManifest> {
  try {
    const raw = await readFile(EXTRA_MANIFEST, "utf8");
    return JSON.parse(raw) as NotesManifest;
  } catch {
    return {};
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const extra = await loadExtraManifest();
  const manifest = mergeManifest(SEED_NOTES_MANIFEST, extra);
  await writeJson(join(OUT, "index.json"), manifest);
  if (Object.keys(extra).length > 0) {
    console.log("  (merged storage-only chapters from extra-manifest.json)");
  }

  for (const key of Object.keys(SEED_BLOCKS)) {
    const [subjectId, chapterId] = key.split("/");
    const dir = join(OUT, subjectId, chapterId);
    await mkdir(dir, { recursive: true });

    const notes = getSeedShortNotes(subjectId, chapterId);
    const formulas = getSeedFormulaSheet(subjectId, chapterId);

    if (notes) {
      await writeJson(join(dir, "short-notes.json"), notes);
    }
    if (formulas) {
      await writeJson(join(dir, "formula-sheet.json"), formulas);
    }
    console.log(`  ${key}${notes ? " +notes" : ""}${formulas ? " +formulas" : ""}`);
  }

  console.log(`\nWrote manifest + chapter JSON to:\n  ${OUT}`);
  console.log("\nUpload: Firebase Console → Storage → upload folder contents to notes/");
  console.log("Or: firebase storage rules deploy  (then upload via Console)\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
