import {
  collection, doc, setDoc, getDocs, deleteDoc,
  updateDoc, writeBatch, query, orderBy, limit, startAfter, getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const WORKER_URL = import.meta.env.VITE_WORKER_URL as string;

// v2 schema: session doc = metadata only, elements live in subcollection
// Old sessions (v1, had elements[]) are ignored — no backward compat

export interface TeachSession {
  id: string;
  title: string;
  mode?: string;
  subMode?: string;
  createdAt: number;
  updatedAt: number;
  elementCount: number;
}

function sessionsRef(uid: string) {
  return collection(db, "users", uid, "teachSessions");
}

function elementsRef(uid: string, sessionId: string) {
  return collection(db, "users", uid, "teachSessions", sessionId, "elements");
}

// ── R2 session element storage ────────────────────────────────────────────────

export async function saveSessionElements(
  uid: string,
  sessionId: string,
  elements: any[],
  idToken: string,
): Promise<void> {
  const res = await fetch(`${WORKER_URL}/api/session/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
    body: JSON.stringify({ sessionId, elements }),
  });
  if (!res.ok) throw new Error(`R2 session save failed: ${res.status}`);
}

// ── Create session metadata in Firestore ──────────────────────────────────────

export async function createTeachSession(
  uid: string,
  sessionId: string,
  title: string,
  elementCount: number,
  mode?: string,
  subMode?: string,
): Promise<void> {
  await setDoc(doc(sessionsRef(uid), sessionId), {
    title: title.slice(0, 80),
    ...(mode ? { mode } : {}),
    ...(subMode ? { subMode } : {}),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    elementCount,
    storageType: "r2",
  });
}

// ── Update session metadata after each response ───────────────────────────────

export async function updateSessionMetadata(
  uid: string,
  sessionId: string,
  elementCount: number,
  title?: string,
): Promise<void> {
  await updateDoc(doc(sessionsRef(uid), sessionId), {
    updatedAt: Date.now(),
    elementCount,
    ...(title ? { title: title.slice(0, 80) } : {}),
  });
}

// ── Update session title ──────────────────────────────────────────────────────

export async function updateSessionTitle(
  uid: string,
  sessionId: string,
  title: string,
): Promise<void> {
  await updateDoc(doc(sessionsRef(uid), sessionId), {
    title: title.slice(0, 80),
    updatedAt: Date.now(),
  });
}

// ── Update a single element (for inline board edits) ─────────────────────────

export async function updateSessionElement(
  uid: string,
  sessionId: string,
  element: any,
): Promise<void> {
  const ref = doc(elementsRef(uid, sessionId), element.id);
  await updateDoc(ref, { ...element });
}

// ── Load elements — R2 for new sessions, Firestore subcollection for old ──────

export async function loadSessionElements(
  uid: string,
  sessionId: string,
  idToken: string,
): Promise<any[]> {
  // Try R2 first (new sessions)
  try {
    const res = await fetch(`${WORKER_URL}/api/session/load?sessionId=${sessionId}`, {
      headers: { "Authorization": `Bearer ${idToken}` },
    });
    if (res.ok) return await res.json() as any[];
    if (res.status !== 404) throw new Error(`R2 load failed: ${res.status}`);
  } catch (e) {
    console.warn("[Session] R2 load failed, falling back to Firestore", e);
  }

  // Fallback: old v2 sessions stored in Firestore subcollection
  const q = query(elementsRef(uid, sessionId), orderBy("index", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

// ── List sessions (v2 only — old sessions filtered out) ──────────────────────

export interface TeachSessionPage {
  sessions: TeachSession[];
  hasMore: boolean;
  lastUpdatedAt: number | null;
}

export async function listTeachSessionsPaged(
  uid: string,
  pageSize: number,
  afterUpdatedAt?: number,
): Promise<TeachSessionPage> {
  const base = [sessionsRef(uid), orderBy("updatedAt", "desc")] as const;
  const q = afterUpdatedAt !== undefined
    ? query(...base, startAfter(afterUpdatedAt), limit(pageSize))
    : query(...base, limit(pageSize));
  const snap = await getDocs(q);
  // Filter client-side: v2 sessions have the v2 flag; old sessions have elements[]
  const sessions = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(s => (s as any).v2 === true) as TeachSession[];
  return {
    sessions,
    hasMore: snap.docs.length === pageSize,
    lastUpdatedAt: snap.docs.at(-1)?.data().updatedAt ?? null,
  };
}

// ── Rename / delete ───────────────────────────────────────────────────────────

export async function renameTeachSession(
  uid: string,
  sessionId: string,
  newTitle: string,
): Promise<void> {
  await updateDoc(doc(sessionsRef(uid), sessionId), {
    title: newTitle.trim().slice(0, 80),
  });
}

export async function deleteTeachSession(
  uid: string,
  sessionId: string,
  idToken: string,
): Promise<void> {
  // Delete from R2 (new sessions) — non-fatal if not found
  try {
    await fetch(`${WORKER_URL}/api/session/delete?sessionId=${sessionId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${idToken}` },
    });
  } catch (e) {
    console.warn("[Session] R2 delete failed", e);
  }

  // Delete old Firestore subcollection elements if any (old v2 sessions)
  const snap = await getDocs(elementsRef(uid, sessionId));
  if (snap.docs.length > 0) {
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }

  await deleteDoc(doc(sessionsRef(uid), sessionId));
}
