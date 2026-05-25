import { getBytes, getDownloadURL, ref } from "firebase/storage";
import { auth, storage } from "./firebase";
import { EXTRA_NOTES_MANIFEST } from "./extra-notes-manifest";
import {
  getDevSeedManifest,
  getSeedFormulaSheet,
  getSeedShortNotes,
} from "./notes-seed-data";

export { getDevSeedManifest } from "./notes-seed-data";

export const useNotesDevSeed =
  import.meta.env.DEV && import.meta.env.VITE_NOTES_DEV_SEED !== "false";

export type NotesLoadSource = "storage" | "bundle";

const emptyFlags: ChapterNotesFlags = { hasNotes: false, hasFormulas: false };

/** Remote manifest wins; bundle/extra fill gaps only. */
function mergeManifestWithFallback(
  remote: NotesManifest | null | undefined,
  ...fallbacks: NotesManifest[]
): NotesManifest {
  const merged: NotesManifest = remote ? structuredClone(remote) : {};
  for (const fallback of fallbacks) {
    for (const [subjectId, chapters] of Object.entries(fallback)) {
      merged[subjectId] ??= {};
      for (const [chapterId, flags] of Object.entries(chapters)) {
        const existing = merged[subjectId][chapterId];
        if (existing?.hasNotes || existing?.hasFormulas) continue;
        if (flags.hasNotes || flags.hasFormulas) {
          merged[subjectId][chapterId] = flags;
        }
      }
    }
  }
  return merged;
}

export function getManifestChapterFlags(
  manifest: NotesManifest,
  subjectId: string,
  chapterId: string,
): ChapterNotesFlags {
  return manifest[subjectId]?.[chapterId] ?? emptyFlags;
}

export interface NotesFormula {
  label: string;
  formula: string;
}

export interface NotesSection {
  title: string;
  content: string;
  formulas: NotesFormula[];
}

export interface NotesDocument {
  sections: NotesSection[];
}

export interface ChapterNotesFlags {
  hasNotes: boolean;
  hasFormulas: boolean;
}

export type NotesManifest = Record<string, Record<string, ChapterNotesFlags>>;

type NotesCacheType = "short-notes" | "formula-sheet";

const contentCache = new Map<string, NotesDocument | null>();
const contentSourceCache = new Map<string, NotesLoadSource>();
let manifestCache: NotesManifest | null | undefined;
let manifestSource: NotesLoadSource | null = null;

function contentCacheKey(subjectId: string, chapterId: string, type: NotesCacheType) {
  return `${subjectId}/${chapterId}/${type}`;
}

const MAX_NOTES_JSON_BYTES = 5 * 1024 * 1024;

async function ensureAuthReady(): Promise<boolean> {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return false;
  try {
    await user.getIdToken();
  } catch {
    return false;
  }
  return true;
}

function parseStorageJson<T>(text: string): T | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}

async function fetchJsonViaDownloadUrl<T>(path: string): Promise<T | null> {
  const url = await getDownloadURL(ref(storage, path));
  const res = await fetch(url);
  if (!res.ok) return null;
  return parseStorageJson<T>(await res.text());
}

async function fetchJsonFromStorage<T = NotesDocument>(path: string): Promise<T | null> {
  if (!(await ensureAuthReady())) {
    if (import.meta.env.DEV) {
      console.warn("[notes] Storage skipped (not signed in):", path);
    }
    return null;
  }

  const storageRef = ref(storage, path);

  try {
    const bytes = await getBytes(storageRef, MAX_NOTES_JSON_BYTES);
    const parsed = parseStorageJson<T>(new TextDecoder().decode(bytes));
    if (parsed) return parsed;
  } catch {
    /* fall through to download URL */
  }

  try {
    const viaUrl = await fetchJsonViaDownloadUrl<T>(path);
    if (viaUrl) return viaUrl;
  } catch {
    /* logged below */
  }

  if (import.meta.env.DEV) {
    console.warn("[notes] Storage fetch failed:", path);
  }
  return null;
}

export function getLastManifestSource(): NotesLoadSource | null {
  return manifestSource;
}

export function getContentLoadSource(
  subjectId: string,
  chapterId: string,
  type: NotesCacheType,
): NotesLoadSource | null {
  return contentSourceCache.get(contentCacheKey(subjectId, chapterId, type)) ?? null;
}

export async function fetchNotesManifest(): Promise<NotesManifest | null> {
  if (manifestCache !== undefined) return manifestCache;

  const remote = await fetchJsonFromStorage<NotesManifest>("notes/index.json");
  const usedStorage = remote !== null && Object.keys(remote).length > 0;

  if (useNotesDevSeed) {
    const merged = usedStorage
      ? mergeManifestWithFallback(remote, EXTRA_NOTES_MANIFEST, getDevSeedManifest())
      : mergeManifestWithFallback(null, EXTRA_NOTES_MANIFEST, getDevSeedManifest());
    manifestSource = usedStorage ? "storage" : "bundle";
    if (usedStorage) {
      manifestCache = merged;
    }
    return merged;
  }

  if (usedStorage && remote) {
    manifestCache = remote;
    manifestSource = "storage";
    return remote;
  }

  manifestSource = null;
  return remote ?? {};
}

/** Clear cached manifest/content (e.g. after uploading new Storage files). */
export function clearNotesCache() {
  manifestCache = undefined;
  manifestSource = null;
  contentCache.clear();
  contentSourceCache.clear();
}

export function clearChapterContentCache(subjectId: string, chapterId: string) {
  for (const type of ["short-notes", "formula-sheet"] as const) {
    const key = contentCacheKey(subjectId, chapterId, type);
    contentCache.delete(key);
    contentSourceCache.delete(key);
  }
}

async function loadChapterJson(
  subjectId: string,
  chapterId: string,
  type: NotesCacheType,
  storagePath: string,
  bundleLoader: () => NotesDocument | null,
): Promise<NotesDocument | null> {
  const key = contentCacheKey(subjectId, chapterId, type);
  const cached = contentCache.get(key);
  if (cached !== undefined) return cached;

  const fromStorage = await fetchJsonFromStorage(storagePath);
  if (fromStorage) {
    contentCache.set(key, fromStorage);
    contentSourceCache.set(key, "storage");
    return fromStorage;
  }

  if (useNotesDevSeed) {
    const fromBundle = bundleLoader();
    if (fromBundle) {
      contentCache.set(key, fromBundle);
      contentSourceCache.set(key, "bundle");
      return fromBundle;
    }
  }

  return null;
}

export async function fetchShortNotes(
  subjectId: string,
  chapterId: string,
): Promise<NotesDocument | null> {
  return loadChapterJson(
    subjectId,
    chapterId,
    "short-notes",
    `notes/${subjectId}/${chapterId}/short-notes.json`,
    () => getSeedShortNotes(subjectId, chapterId),
  );
}

export async function fetchFormulaSheet(
  subjectId: string,
  chapterId: string,
): Promise<NotesDocument | null> {
  return loadChapterJson(
    subjectId,
    chapterId,
    "formula-sheet",
    `notes/${subjectId}/${chapterId}/formula-sheet.json`,
    () => getSeedFormulaSheet(subjectId, chapterId),
  );
}
