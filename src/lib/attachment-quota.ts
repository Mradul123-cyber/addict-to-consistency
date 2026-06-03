import { doc, getDoc, setDoc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import { db } from "./firebase";

export const FREE_PDF_LIMIT = 5;
export const FREE_IMAGE_LIMIT = 10;

const usageRef = (uid: string) => doc(db, "users", uid, "usage", "teach");

interface AttachmentUsage {
  pdfUploadsUsed: number;
  imageUploadsUsed: number;
}

function cacheKey(uid: string) { return `attach_quota_${uid}`; }

function readCache(uid: string): AttachmentUsage | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(uid));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeCache(uid: string, usage: AttachmentUsage) {
  try { sessionStorage.setItem(cacheKey(uid), JSON.stringify(usage)); } catch {}
}

export async function getAttachmentUsage(uid: string): Promise<AttachmentUsage> {
  const cached = readCache(uid);
  if (cached) return cached;

  try {
    const snap = await getDoc(usageRef(uid));
    const data = snap.exists() ? (snap.data() as any) : {};
    const usage: AttachmentUsage = {
      pdfUploadsUsed: data.pdfUploadsUsed ?? 0,
      imageUploadsUsed: data.imageUploadsUsed ?? 0,
    };
    writeCache(uid, usage);
    return usage;
  } catch {
    return { pdfUploadsUsed: 0, imageUploadsUsed: 0 };
  }
}

export async function resetAttachmentQuota(uid: string): Promise<void> {
  await updateDoc(usageRef(uid), { pdfUploadsUsed: 0, imageUploadsUsed: 0, updatedAt: serverTimestamp() });
  try { sessionStorage.removeItem(cacheKey(uid)); } catch {}
}

export async function incrementAttachmentUsage(
  uid: string,
  kind: "pdf" | "image"
): Promise<AttachmentUsage> {
  const field = kind === "pdf" ? "pdfUploadsUsed" : "imageUploadsUsed";
  try {
    const snap = await getDoc(usageRef(uid));
    if (!snap.exists()) {
      await setDoc(usageRef(uid), { [field]: 1, updatedAt: serverTimestamp() }, { merge: true });
    } else {
      await updateDoc(usageRef(uid), { [field]: increment(1), updatedAt: serverTimestamp() });
    }
  } catch (err) {
    console.error("incrementAttachmentUsage failed:", err);
  }
  // Invalidate cache so next read fetches fresh
  try { sessionStorage.removeItem(cacheKey(uid)); } catch {}
  // Return optimistic updated value
  const prev = readCache(uid) ?? { pdfUploadsUsed: 0, imageUploadsUsed: 0 };
  const next: AttachmentUsage = {
    ...prev,
    [kind === "pdf" ? "pdfUploadsUsed" : "imageUploadsUsed"]:
      (kind === "pdf" ? prev.pdfUploadsUsed : prev.imageUploadsUsed) + 1,
  };
  writeCache(uid, next);
  return next;
}
