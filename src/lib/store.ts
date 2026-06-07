import { useSyncExternalStore, useEffect } from "react";
import { nanoid } from "nanoid";
import { SEED_TRACKS, SEED_VERSION } from "./seed";
import { db, auth } from "./firebase";
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  setDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ── Debounced save-error toast — shows at most once every 8s ─────────────────
let saveErrorPending = false;
function showSaveError() {
  if (saveErrorPending) return;
  saveErrorPending = true;
  toast.warning("Couldn't save your progress — check your connection");
  setTimeout(() => { saveErrorPending = false; }, 8000);
}

export type Priority = "High" | "Medium" | "Low";

export type ConceptWeight = "High" | "Medium" | "Low";

const WEIGHT_VALUE: Record<ConceptWeight, number> = { High: 3, Medium: 2, Low: 1 };

export interface Concept {
  id: string;
  name: string;
  done: boolean;
  weight: ConceptWeight;
}

/** Weighted completion: sum(weight of done) / sum(all weights) × 100 */
export function calcWeightedCompletion(concepts: Concept[]): number {
  if (concepts.length === 0) return 0;
  const total = concepts.reduce((s, c) => s + WEIGHT_VALUE[c.weight ?? "Medium"], 0);
  const done = concepts.filter((c) => c.done).reduce((s, c) => s + WEIGHT_VALUE[c.weight ?? "Medium"], 0);
  return Math.round((done / total) * 100);
}

export interface ChapterOverride {
  delta: number;
  note?: string;
}

export interface Chapter {
  id: string;
  trackId: string;
  name: string;
  priority: Priority;
  completion: number;
  concepts?: Concept[];
  overrides?: ChapterOverride[];
}

export interface Track {
  id: string;
  name: string;
  chapters: Chapter[];
}

export type DriftClassification = "healthy" | "neutral" | "distraction";

export interface DriftDomainVisit {
  domain: string;
  minutes: number;
  classification: DriftClassification;
}

export interface DriftSummary {
  healthyMinutes: number;
  distractionMinutes: number;
  neutralMinutes: number;
  neutralDomains: string[];
  topDomains: DriftDomainVisit[];
}

export interface CalendarTask {
  id: string;
  dateISO: string;
  text: string;
  subject: string;
  done: boolean;
  createdAt: number;
}

export interface SessionLog {
  id: string;
  chapterId: string | null;
  dateISO: string; // YYYY-MM-DD
  minutes: number;
  focusRating?: 1 | 2 | 3 | 4 | 5;
  source: "timer" | "manual" | "calendar";
  createdAt: number;
  driftSummary?: DriftSummary;
  subject?: string;
}

let tracks: Track[] = [];
let sessions: SessionLog[] = [];
let customTasks: string[] = [];
let calendarTasks: CalendarTask[] = [];

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

let cachedSnap = { tracks: [] as Track[], sessions: [] as SessionLog[], customTasks: [] as string[], calendarTasks: [] as CalendarTask[] };
function getSnapshot() {
  return cachedSnap;
}
function refreshSnap() {
  cachedSnap = { tracks, sessions, customTasks, calendarTasks };
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

const serverSnap = { tracks: [] as Track[], sessions: [] as SessionLog[], customTasks: [] as string[], calendarTasks: [] as CalendarTask[] };

let currentSubscriptionUid: string | null = null;
let unsubscribeSessions: (() => void) | null = null;
let unsubscribeTracks: (() => void) | null = null;
let unsubscribeCalendarTasks: (() => void) | null = null;

const CACHE_PREFIX = "store_cache_";

// ── Debounced tracks write — batches rapid concept toggles into 1 Firestore write ──
// On tab hide/close, pending write is flushed immediately instead of being lost.
let tracksWriteTimer: ReturnType<typeof setTimeout> | null = null;
let pendingTracksWrite: { uid: string; tracks: Track[] } | null = null;

async function flushTracksWrite(): Promise<void> {
  if (!pendingTracksWrite) return;
  const { uid, tracks: pendingTracks } = pendingTracksWrite;
  try {
    const { doc, setDoc } = await import("firebase/firestore");
    const { db } = await import("./firebase");
    await setDoc(doc(db, "users", uid, "tracks", "data"), { tracks: pendingTracks }, { merge: true });
    pendingTracksWrite = null;
  } catch (err) {
    console.error("Error saving tracks:", err);
    showSaveError();
  }
}

function scheduleTracksWrite(uid: string, updatedTracks: Track[]) {
  pendingTracksWrite = { uid, tracks: updatedTracks };
  if (tracksWriteTimer) clearTimeout(tracksWriteTimer);
  tracksWriteTimer = setTimeout(() => {
    tracksWriteTimer = null;
    void flushTracksWrite();
  }, 30 * 60 * 1000); // 30 min fallback — exit events (visibilitychange/beforeunload) handle the normal case
}

// Single flush flag — prevents double write when both visibilitychange + beforeunload fire (e.g. refresh)
let flushing = false;

function flushOnce() {
  if (flushing || !pendingTracksWrite) return;
  flushing = true;
  if (tracksWriteTimer) { clearTimeout(tracksWriteTimer); tracksWriteTimer = null; }
  void flushTracksWrite().finally(() => { flushing = false; });
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushOnce();
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => flushOnce());
}

function loadCachedData(uid: string) {
  try {
    const cachedSessions = localStorage.getItem(`${CACHE_PREFIX}${uid}_sessions`);
    const cachedTracks = localStorage.getItem(`${CACHE_PREFIX}${uid}_tracks`);
    const cachedTasks = localStorage.getItem(`${CACHE_PREFIX}${uid}_customTasks`);
    const cachedCalendarTasks = localStorage.getItem(`${CACHE_PREFIX}${uid}_calendarTasks`);
    if (cachedSessions) sessions = JSON.parse(cachedSessions);
    if (cachedTracks) tracks = JSON.parse(cachedTracks);
    if (cachedTasks) customTasks = JSON.parse(cachedTasks);
    if (cachedCalendarTasks) calendarTasks = JSON.parse(cachedCalendarTasks);
  } catch {
    // ignore
  }
}

function saveCache(uid: string) {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${uid}_sessions`, JSON.stringify(sessions));
    localStorage.setItem(`${CACHE_PREFIX}${uid}_tracks`, JSON.stringify(tracks));
    localStorage.setItem(`${CACHE_PREFIX}${uid}_customTasks`, JSON.stringify(customTasks));
    localStorage.setItem(`${CACHE_PREFIX}${uid}_calendarTasks`, JSON.stringify(calendarTasks));
  } catch {
    // localStorage full or unavailable
  }
}

function clearCache(uid: string) {
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${uid}_sessions`);
    localStorage.removeItem(`${CACHE_PREFIX}${uid}_tracks`);
    localStorage.removeItem(`${CACHE_PREFIX}${uid}_customTasks`);
    localStorage.removeItem(`${CACHE_PREFIX}${uid}_calendarTasks`);
  } catch {
    // ignore
  }
}

function syncSubscription(uid: string | null, onStoreChange: () => void) {
  if (currentSubscriptionUid === uid) return;

  const previousUid = currentSubscriptionUid;
  currentSubscriptionUid = uid;

  // Cleanup old subscription
  if (unsubscribeSessions) {
    unsubscribeSessions();
    unsubscribeSessions = null;
  }
  if (unsubscribeTracks) {
    unsubscribeTracks();
    unsubscribeTracks = null;
  }
  if (unsubscribeCalendarTasks) {
    unsubscribeCalendarTasks();
    unsubscribeCalendarTasks = null;
  }

  if (!uid) {
    if (previousUid) clearCache(previousUid);
    tracks = [];
    sessions = [];
    customTasks = [];
    calendarTasks = [];
    refreshSnap();
    onStoreChange();
    return;
  }

  // Load cached data immediately so UI renders without waiting for Firestore
  loadCachedData(uid);
  refreshSnap();
  onStoreChange();

  // Subscribe to sessions collection
  const sessionsCol = collection(db, "users", uid, "sessions");
  const q = query(sessionsCol, orderBy("createdAt", "desc"), limit(365));
  unsubscribeSessions = onSnapshot(
    q,
    (snapshot) => {
      sessions = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          chapterId: data.chapterId,
          dateISO: data.dateISO,
          minutes: data.minutes,
          focusRating: data.focusRating,
          source: data.source,
          createdAt: data.createdAt,
          driftSummary: data.driftSummary,
          subject: data.subject,
        } as SessionLog;
      }).reverse(); // restore chronological order for analytics
      refreshSnap();
      onStoreChange();
      saveCache(uid);
    },
    (err) => {
      console.error("Error listening to sessions:", err);
    }
  );

  // Subscribe to tracks document
  const tracksDocRef = doc(db, "users", uid, "tracks", "data");
  unsubscribeTracks = onSnapshot(
    tracksDocRef,
    async (snapshot) => {
      if (!snapshot.exists() || snapshot.data()?.seedVersion !== SEED_VERSION) {
        // Fresh seed or version bump — re-seed tracks entirely (preserves customTasks)
        // Fire-and-forget — do not await inside snapshot callback to avoid blocking the write stream
        const existingCustomTasks = snapshot.exists() ? (snapshot.data()?.customTasks || []) : [];
        void setDoc(tracksDocRef, { tracks: SEED_TRACKS, seedVersion: SEED_VERSION, customTasks: existingCustomTasks })
          .catch((err) => console.error("Error seeding tracks:", err));
      } else {
        const loadedTracks: Track[] = snapshot.data().tracks || [];
        customTasks = snapshot.data().customTasks || [];

        // Migration: backfill seed concepts into chapters that have none
        let needsMigration = false;
        const migratedTracks = loadedTracks.map((t) => {
          const seedTrack = SEED_TRACKS.find((st) => st.id === t.id);
          if (!seedTrack) return t;

          // Backfill missing concepts
          const migratedChapters = t.chapters.map((c) => {
            if (!c.concepts || c.concepts.length === 0) {
              const seedChapter = seedTrack.chapters.find((sc) => sc.id === c.id);
              if (seedChapter?.concepts && seedChapter.concepts.length > 0) {
                needsMigration = true;
                return { ...c, concepts: seedChapter.concepts };
              }
            }
            return c;
          });

          return { ...t, chapters: migratedChapters };
        });

        if (needsMigration) {
          // Fire-and-forget — do not await inside the snapshot callback to avoid blocking the write stream
          void setDoc(tracksDocRef, { tracks: migratedTracks }, { merge: true }).catch(
            (err) => console.error("Error migrating concepts:", err)
          );
        }

        tracks = migratedTracks;
        customTasks = snapshot.data().customTasks || [];
        refreshSnap();
        onStoreChange();
        saveCache(uid);
      }
    },
    (err) => {
      console.error("Error listening to tracks:", err);
    }
  );

  // Subscribe to calendar tasks
  const calendarTasksCol = collection(db, "users", uid, "calendarTasks");
  const tasksQ = query(calendarTasksCol, orderBy("createdAt", "asc"));
  unsubscribeCalendarTasks = onSnapshot(
    tasksQ,
    (snapshot) => {
      calendarTasks = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          dateISO: data.dateISO,
          text: data.text,
          subject: data.subject,
          done: data.done ?? false,
          createdAt: data.createdAt,
        } as CalendarTask;
      });
      refreshSnap();
      onStoreChange();
      saveCache(uid);
    },
    (err) => {
      console.error("Error listening to calendar tasks:", err);
    }
  );
}

export function useStore() {
  const { user } = useAuth();
  const uid = user?.uid || null;

  useEffect(() => {
    syncSubscription(uid, emit);
  }, [uid]);

  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnap);
}

export async function addChapter(trackId: string, name: string, priority: Priority) {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const trimmedName = name.trim();
    if (!trimmedName) return;

    const newChapter: Chapter = {
      id: nanoid(),
      trackId,
      name: trimmedName,
      priority,
      completion: 0,
    };

    const updatedTracks = tracks.map((t) =>
      t.id === trackId ? { ...t, chapters: [...t.chapters, newChapter] } : t,
    );

    const tracksDocRef = doc(db, "users", uid, "tracks", "data");
    await setDoc(tracksDocRef, { tracks: updatedTracks }, { merge: true });
  } catch (err) {
    console.error("Error adding chapter:", err);
  }
}

export async function setChapterPriority(chapterId: string, priority: Priority) {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const updatedTracks = tracks.map((t) => ({
      ...t,
      chapters: t.chapters.map((c) =>
        c.id === chapterId ? { ...c, priority } : c
      ),
    }));
    tracks = updatedTracks;
    refreshSnap();
    emit();
    const tracksDocRef = doc(db, "users", uid, "tracks", "data");
    await setDoc(tracksDocRef, { tracks: updatedTracks }, { merge: true });
  } catch (err) {
    console.error("Error setting chapter priority:", err);
  }
}

export async function setConceptWeight(chapterId: string, conceptId: string, weight: ConceptWeight) {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const updatedTracks = tracks.map((t) => ({
      ...t,
      chapters: t.chapters.map((c) => {
        if (c.id !== chapterId) return c;
        const updatedConcepts = (c.concepts ?? []).map((con) =>
          con.id === conceptId ? { ...con, weight } : con
        );
        return { ...c, concepts: updatedConcepts };
      }),
    }));
    tracks = updatedTracks;
    refreshSnap();
    emit();
    scheduleTracksWrite(uid, updatedTracks);
  } catch (err) {
    console.error("Error setting concept weight:", err);
  }
}

export async function setChapterCompletion(chapterId: string, value: number, note?: string) {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    const updatedTracks = tracks.map((t) => ({
      ...t,
      chapters: t.chapters.map((c) => {
        if (c.id !== chapterId) return c;
        const conceptCompletion = c.concepts?.length ? calcWeightedCompletion(c.concepts) : c.completion;
        const existingDelta = (c.overrides ?? []).reduce((s, o) => s + o.delta, 0);
        const currentDisplay = conceptCompletion + existingDelta;
        const delta = clamped - currentDisplay;
        const override: ChapterOverride = { delta, ...(note ? { note } : {}) };
        return { ...c, overrides: [...(c.overrides ?? []), override] };
      }),
    }));

    tracks = updatedTracks;
    refreshSnap();
    emit();

    const tracksDocRef = doc(db, "users", uid, "tracks", "data");
    await setDoc(tracksDocRef, { tracks: updatedTracks }, { merge: true });
  } catch (err) {
    console.error("Error setting chapter completion:", err);
  }
}

export async function addChapterAdjustment(chapterId: string, value: number, note?: string) {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    const updatedTracks = tracks.map((t) => ({
      ...t,
      chapters: t.chapters.map((c) => {
        if (c.id !== chapterId) return c;
        const conceptCompletion = c.concepts?.length ? calcWeightedCompletion(c.concepts) : c.completion;
        const existingDelta = (c.overrides ?? []).reduce((s, o) => s + o.delta, 0);
        const currentDisplay = conceptCompletion + existingDelta;
        const delta = clamped - currentDisplay;
        const override: ChapterOverride = { delta, ...(note ? { note } : {}) };
        return { ...c, overrides: [...(c.overrides ?? []), override] };
      }),
    }));

    tracks = updatedTracks;
    refreshSnap();
    emit();

    const tracksDocRef = doc(db, "users", uid, "tracks", "data");
    await setDoc(tracksDocRef, { tracks: updatedTracks }, { merge: true });
  } catch (err) {
    console.error("Error adding chapter adjustment:", err);
  }
}

export async function clearChapterOverride(chapterId: string) {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const updatedTracks = tracks.map((t) => ({
      ...t,
      chapters: t.chapters.map((c) =>
        c.id === chapterId ? { ...c, overrides: [] } : c
      ),
    }));

    tracks = updatedTracks;
    refreshSnap();
    emit();

    const tracksDocRef = doc(db, "users", uid, "tracks", "data");
    await setDoc(tracksDocRef, { tracks: updatedTracks }, { merge: true });
  } catch (err) {
    console.error("Error clearing chapter override:", err);
  }
}

export async function removeChapterOverride(chapterId: string, index: number) {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const updatedTracks = tracks.map((t) => ({
      ...t,
      chapters: t.chapters.map((c) => {
        if (c.id !== chapterId) return c;
        const current = c.overrides ?? [];
        return { ...c, overrides: current.filter((_, i) => i !== index) };
      }),
    }));

    tracks = updatedTracks;
    refreshSnap();
    emit();

    const tracksDocRef = doc(db, "users", uid, "tracks", "data");
    await setDoc(tracksDocRef, { tracks: updatedTracks }, { merge: true });
  } catch (err) {
    console.error("Error removing chapter override:", err);
  }
}

export async function toggleConcept(chapterId: string, conceptId: string) {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const updatedTracks = tracks.map((t) => ({
      ...t,
      chapters: t.chapters.map((c) => {
        if (c.id !== chapterId) return c;
        const updatedConcepts = (c.concepts ?? []).map((con) =>
          con.id === conceptId ? { ...con, done: !con.done } : con
        );
        return { ...c, concepts: updatedConcepts, completion: calcWeightedCompletion(updatedConcepts) };
      }),
    }));

    tracks = updatedTracks;
    refreshSnap();
    emit();

    // Debounced — batches rapid toggles into 1 write after 1.5s of inactivity
    scheduleTracksWrite(uid, updatedTracks);
  } catch (err) {
    console.error("Error toggling concept:", err);
  }
}

/** Set ALL concepts in a chapter to done=true or done=false in one Firestore write (fixes glitch) */
export async function setAllConceptsDone(chapterId: string, done: boolean) {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const chapter = tracks.flatMap((t) => t.chapters).find((c) => c.id === chapterId);
    if (!chapter) return;

    const oldConcepts = chapter.concepts ?? [];
    const oldWeighted = calcWeightedCompletion(oldConcepts);
    const updatedConcepts = oldConcepts.map((con) => ({ ...con, done }));
    const updatedTracks = tracks.map((t) => ({
      ...t,
      chapters: t.chapters.map((c) => {
        if (c.id !== chapterId) return c;
        const updatedConcepts = (c.concepts ?? []).map((con) => ({ ...con, done }));
        return { ...c, concepts: updatedConcepts, completion: calcWeightedCompletion(updatedConcepts) };
      }),
    }));

    tracks = updatedTracks;
    refreshSnap();
    emit();

    const tracksDocRef = doc(db, "users", uid, "tracks", "data");
    await setDoc(tracksDocRef, { tracks: updatedTracks }, { merge: true });
  } catch (err) {
    console.error("Error setting all concepts:", err);
  }
}

export async function addConceptToChapter(chapterId: string, name: string, weight: ConceptWeight) {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const newConcept: Concept = { id: nanoid(), name: name.trim(), done: false, weight };

    const updatedTracks = tracks.map((t) => ({
      ...t,
      chapters: t.chapters.map((c) => {
        if (c.id !== chapterId) return c;
        const updatedConcepts = [...(c.concepts ?? []), newConcept];
        return { ...c, concepts: updatedConcepts };
      }),
    }));

    tracks = updatedTracks;
    refreshSnap();
    emit();

    const tracksDocRef = doc(db, "users", uid, "tracks", "data");
    await setDoc(tracksDocRef, { tracks: updatedTracks }, { merge: true });
  } catch (err) {
    console.error("Error adding concept:", err);
  }
}

export async function addSession(input: Omit<SessionLog, "id" | "createdAt">) {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await addDoc(collection(db, "users", uid, "sessions"), { ...input, createdAt: Date.now() });
  } catch (err) {
    console.error("Error adding session:", err);
    toast.warning("Focus session couldn't be saved — check your connection");
  }
}

export async function deleteSession(id: string) {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    await deleteDoc(doc(db, "users", uid, "sessions", id));
  } catch (err) {
    console.error("Error deleting session:", err);
  }
}

export async function addCustomTask(name: string) {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const trimmed = name.trim();
    if (!trimmed || customTasks.includes(trimmed)) return;

    customTasks.push(trimmed);
    const tracksDocRef = doc(db, "users", uid, "tracks", "data");
    await setDoc(tracksDocRef, { customTasks }, { merge: true });
  } catch (err) {
    console.error("Error adding custom task:", err);
  }
}

export async function addCalendarTask(dateISO: string, text: string, subject: string) {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    const col = collection(db, "users", uid, "calendarTasks");
    await addDoc(col, { dateISO, text: trimmed, subject, done: false, createdAt: Date.now() });
  } catch (err) {
    console.error("Error adding calendar task:", err);
    showSaveError();
  }
}

export async function toggleCalendarTask(id: string, done: boolean) {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const ref = doc(db, "users", uid, "calendarTasks", id);
    await updateDoc(ref, { done });
  } catch (err) {
    console.error("Error toggling calendar task:", err);
    showSaveError();
  }
}

export async function deleteCalendarTask(id: string) {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const ref = doc(db, "users", uid, "calendarTasks", id);
    await deleteDoc(ref);
  } catch (err) {
    console.error("Error deleting calendar task:", err);
    showSaveError();
  }
}

export function getSnapshotSync() {
  return { tracks, sessions };
}
