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
  try {
    const snap = await getDoc(quotaRef(uid));
    if (!snap.exists()) return 0;
    const data = snap.data() as { promptCount?: number };
    return data.promptCount ?? 0;
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
      return 1;
    }
    const current = (snap.data() as { promptCount?: number }).promptCount ?? 0;
    await updateDoc(ref, {
      promptCount: increment(1),
      updatedAt: serverTimestamp(),
    });
    return current + 1;
  } catch (err) {
    console.error("incrementTeachPromptCount failed:", err);
    throw err;
  }
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
