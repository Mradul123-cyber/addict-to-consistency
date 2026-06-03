import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";

export const TEACH_PROMPT_LIMIT = 5;

const quotaRef = (uid: string) => doc(db, "users", uid, "usage", "teach");

export async function getTeachPromptCount(uid: string): Promise<number> {
  // Cache in sessionStorage — quota only changes after AI use (incrementTeachPromptCount clears cache)
  const cacheKey = `quota_${uid}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached !== null) return Number(cached);

  try {
    const snap = await getDoc(quotaRef(uid));
    if (!snap.exists()) { sessionStorage.setItem(cacheKey, "0"); return 0; }
    const data = snap.data() as { promptCount?: number };
    const count = data.promptCount ?? 0;
    sessionStorage.setItem(cacheKey, String(count));
    return count;
  } catch (err) {
    console.error("getTeachPromptCount failed:", err);
    return 0;
  }
}

export async function incrementTeachPromptCount(uid: string): Promise<number> {
  const ref = quotaRef(uid);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { promptCount: 1, updatedAt: serverTimestamp() });
      sessionStorage.setItem(`quota_${uid}`, "1");
      return 1;
    }
    const current = (snap.data() as { promptCount?: number }).promptCount ?? 0;
    await updateDoc(ref, { promptCount: increment(1), updatedAt: serverTimestamp() });
    const next = current + 1;
    sessionStorage.setItem(`quota_${uid}`, String(next));
    return next;
  } catch (err) {
    console.error("incrementTeachPromptCount failed:", err);
    throw err;
  }
}

export async function resetTeachPromptCount(uid: string): Promise<void> {
  await updateDoc(quotaRef(uid), { promptCount: 0, updatedAt: serverTimestamp() });
  sessionStorage.removeItem(`quota_${uid}`);
}

export interface TeachFeedback {
  reasons: string[];
  comment?: string;
  promptCount: number;
}

export async function saveTeachFeedback(uid: string, fb: TeachFeedback): Promise<void> {
  const ref = doc(db, "users", uid, "teach_feedback", String(Date.now()));
  await setDoc(ref, {
    ...fb,
    createdAt: serverTimestamp(),
  });
}
