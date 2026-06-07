import {
  collection, doc, setDoc, getDocs, deleteDoc,
  updateDoc, writeBatch, query, orderBy, limit, startAfter, where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

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

// ── Create session (metadata only) ───────────────────────────────────────────

export async function createTeachSession(
  uid: string,
  sessionId: string,
  title: string,
  _elements: any[], // ignored — elements written separately via appendSessionElements
  mode?: string,
  subMode?: string,
): Promise<void> {
  await setDoc(doc(sessionsRef(uid), sessionId), {
    title: title.slice(0, 80),
    ...(mode ? { mode } : {}),
    ...(subMode ? { subMode } : {}),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    elementCount: 0,
    v2: true,
  });
}

// ── Append only new elements to subcollection ────────────────────────────────
// Each element doc uses its nanoid as Firestore doc ID → idempotent on retry

export async function appendSessionElements(
  uid: string,
  sessionId: string,
  elements: any[],
  startIndex: number,
): Promise<void> {
  if (elements.length === 0) return;
  // Firestore batches cap at 500 ops; split into chunks of 498 to leave room for the metadata update
  const CHUNK = 498;
  for (let offset = 0; offset < elements.length; offset += CHUNK) {
    const chunk = elements.slice(offset, offset + CHUNK);
    const batch = writeBatch(db);
    chunk.forEach((el, i) => {
      const ref = doc(elementsRef(uid, sessionId), el.id);
      batch.set(ref, { ...el, index: startIndex + offset + i });
    });
    const isLastChunk = offset + CHUNK >= elements.length;
    if (isLastChunk) {
      batch.update(doc(sessionsRef(uid), sessionId), {
        updatedAt: Date.now(),
        elementCount: startIndex + elements.length,
      });
    }
    await batch.commit();
  }
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

// ── Load all elements for a session ──────────────────────────────────────────

export async function loadSessionElements(
  uid: string,
  sessionId: string,
): Promise<any[]> {
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
): Promise<void> {
  // Elements subcollection must be deleted separately (Firestore client can't cascade)
  // Fetch and delete element docs first
  const snap = await getDocs(elementsRef(uid, sessionId));
  if (snap.docs.length > 0) {
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(doc(sessionsRef(uid), sessionId));
}
