import { useSyncExternalStore, useEffect } from "react";
import { SEED_TRACKS } from "./seed";
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
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

export type Priority = "High" | "Medium";

export interface Chapter {
  id: string;
  trackId: string;
  name: string;
  priority: Priority;
  completion: number;
}

export interface Track {
  id: string;
  name: string;
  chapters: Chapter[];
}

export interface SessionLog {
  id: string;
  chapterId: string | null;
  dateISO: string; // YYYY-MM-DD
  minutes: number;
  focusRating?: 1 | 2 | 3 | 4 | 5;
  source: "timer" | "manual";
  createdAt: number;
}

let tracks: Track[] = [];
let sessions: SessionLog[] = [];

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

let cachedSnap = { tracks: [] as Track[], sessions: [] as SessionLog[] };
function getSnapshot() {
  return cachedSnap;
}
function refreshSnap() {
  cachedSnap = { tracks, sessions };
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

const serverSnap = { tracks: [] as Track[], sessions: [] as SessionLog[] };

let currentSubscriptionUid: string | null = null;
let unsubscribeSessions: (() => void) | null = null;
let unsubscribeTracks: (() => void) | null = null;

function syncSubscription(uid: string | null, onStoreChange: () => void) {
  if (currentSubscriptionUid === uid) return;

  // Cleanup old subscription
  if (unsubscribeSessions) {
    unsubscribeSessions();
    unsubscribeSessions = null;
  }
  if (unsubscribeTracks) {
    unsubscribeTracks();
    unsubscribeTracks = null;
  }

  currentSubscriptionUid = uid;

  if (!uid) {
    tracks = [];
    sessions = [];
    refreshSnap();
    onStoreChange();
    return;
  }

  // Subscribe to sessions collection
  const sessionsCol = collection(db, "users", uid, "sessions");
  const q = query(sessionsCol, orderBy("createdAt", "asc"));
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
        } as SessionLog;
      });
      refreshSnap();
      onStoreChange();
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
      if (!snapshot.exists()) {
        try {
          await setDoc(tracksDocRef, { tracks: SEED_TRACKS });
        } catch (err) {
          console.error("Error seeding tracks:", err);
        }
      } else {
        tracks = snapshot.data().tracks || [];
        refreshSnap();
        onStoreChange();
      }
    },
    (err) => {
      console.error("Error listening to tracks:", err);
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

// Mutations
export async function setChapterCompletion(chapterId: string, completion: number) {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const clamped = Math.max(0, Math.min(100, Math.round(completion)));
    const updatedTracks = tracks.map((t) => ({
      ...t,
      chapters: t.chapters.map((c) =>
        c.id === chapterId ? { ...c, completion: clamped } : c
      ),
    }));

    const tracksDocRef = doc(db, "users", uid, "tracks", "data");
    await setDoc(tracksDocRef, { tracks: updatedTracks }, { merge: true });
  } catch (err) {
    console.error("Error setting chapter completion:", err);
  }
}

export async function bumpChapterFromSession(chapterId: string, minutes: number, rating: number) {
  try {
    const chapter = tracks.flatMap((t) => t.chapters).find((c) => c.id === chapterId);
    if (!chapter) return;
    // weight by rating (3 = neutral)
    const weight = 0.7 + (rating / 5) * 0.6;
    const delta = (minutes / 30) * weight; // ~1% per 30min at rating 3
    await setChapterCompletion(chapterId, chapter.completion + delta);
  } catch (err) {
    console.error("Error bumping chapter from session:", err);
  }
}

export async function addSession(input: Omit<SessionLog, "id" | "createdAt">) {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const log = {
      ...input,
      createdAt: Date.now(),
    };

    await addDoc(collection(db, "users", uid, "sessions"), log);

    if (log.chapterId) {
      await bumpChapterFromSession(log.chapterId, log.minutes, log.focusRating ?? 3);
    }
  } catch (err) {
    console.error("Error adding session:", err);
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

export function getSnapshotSync() {
  return { tracks, sessions };
}
