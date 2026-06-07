import {
  collection, doc, setDoc, getDocs, deleteDoc,
  updateDoc, query, orderBy, limit, startAfter,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const WORKER_URL = import.meta.env.VITE_WORKER_URL as string;

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

export async function loadSessionElements(
  uid: string,
  sessionId: string,
  idToken: string,
): Promise<any[]> {
  const res = await fetch(`${WORKER_URL}/api/session/load?sessionId=${sessionId}`, {
    headers: { "Authorization": `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error(`R2 session load failed: ${res.status}`);
  return res.json();
}

// ── Firestore session metadata ────────────────────────────────────────────────

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

// ── List sessions ─────────────────────────────────────────────────────────────

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
  const sessions = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(s => (s as any).storageType === "r2") as TeachSession[];
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
  await Promise.all([
    fetch(`${WORKER_URL}/api/session/delete?sessionId=${sessionId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${idToken}` },
    }).catch(e => console.warn("[Session] R2 delete failed", e)),
    deleteDoc(doc(sessionsRef(uid), sessionId)),
  ]);
}
