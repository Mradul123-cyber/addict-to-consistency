import {
  collection, doc, setDoc, getDocs, deleteDoc,
  updateDoc, query, orderBy, limit, serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface TeachSession {
  id: string;
  title: string;
  mode?: string;
  elements: any[];
  createdAt: number;
  updatedAt: number;
}

function sessionsRef(uid: string) {
  return collection(db, "users", uid, "teachSessions");
}

export async function saveTeachSession(
  uid: string,
  sessionId: string,
  title: string,
  elements: any[],
  mode?: string
): Promise<void> {
  const ref = doc(sessionsRef(uid), sessionId);
  await setDoc(ref, {
    title: title.slice(0, 80),
    elements,
    ...(mode ? { mode } : {}),
    updatedAt: Date.now(),
  }, { merge: true });
}

export async function createTeachSession(
  uid: string,
  sessionId: string,
  title: string,
  elements: any[],
  mode?: string
): Promise<void> {
  const ref = doc(sessionsRef(uid), sessionId);
  await setDoc(ref, {
    title: title.slice(0, 80),
    elements,
    ...(mode ? { mode } : {}),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export async function listTeachSessions(uid: string): Promise<TeachSession[]> {
  const q = query(sessionsRef(uid), orderBy("updatedAt", "desc"), limit(30));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TeachSession));
}

export async function renameTeachSession(
  uid: string,
  sessionId: string,
  newTitle: string
): Promise<void> {
  await updateDoc(doc(sessionsRef(uid), sessionId), {
    title: newTitle.trim().slice(0, 80),
  });
}

export async function deleteTeachSession(
  uid: string,
  sessionId: string
): Promise<void> {
  await deleteDoc(doc(sessionsRef(uid), sessionId));
}
