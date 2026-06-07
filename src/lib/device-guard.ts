import { doc, getDoc, setDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";

const MAX_ACCOUNTS_PER_DEVICE = 2;
const IDB_DB_NAME = "matrix-device";
const IDB_STORE = "meta";
const IDB_KEY = "device-uuid";

// ── IndexedDB UUID (survives localStorage clears) ─────────────────────────────
async function getOrCreateIdbUuid(): Promise<string> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
      req.onerror = () => resolve("idb-error");
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(IDB_STORE, "readwrite");
        const store = tx.objectStore(IDB_STORE);
        const get = store.get(IDB_KEY);
        get.onsuccess = () => {
          if (get.result) {
            resolve(get.result);
          } else {
            const uuid = typeof crypto.randomUUID === "function"
              ? crypto.randomUUID()
              : Math.random().toString(36).slice(2) + Date.now().toString(36);
            store.put(uuid, IDB_KEY);
            resolve(uuid);
          }
        };
        get.onerror = () => resolve("idb-get-error");
      };
    } catch {
      resolve("idb-unavailable");
    }
  });
}

export async function generateDeviceId(): Promise<string> {
  // Canvas fingerprint
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f00";
    ctx.fillText("matrix-fp-seed", 2, 2);
    ctx.fillStyle = "#0f0";
    ctx.fillText("device-check", 4, 8);
  }
  const canvasStr = canvas.toDataURL();

  // IndexedDB UUID — persists through localStorage clears
  const idbUuid = await getOrCreateIdbUuid();

  const raw = [
    canvasStr,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    navigator.hardwareConcurrency ?? 0,
    idbUuid,
  ].join("|");

  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function checkDeviceAllowed(uid: string): Promise<{ allowed: boolean }> {
  // Check sessionStorage first — avoids Firestore read within the same browser session
  const cacheKey = `device_allowed_${uid}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached !== null) return { allowed: cached === "true" };
  } catch { /* sessionStorage unavailable — fall through to Firestore */ }

  try {
    const deviceId = await generateDeviceId();
    const snap = await getDoc(doc(db, "deviceAccounts", deviceId));

    let allowed = true;
    if (snap.exists()) {
      const uids: string[] = snap.data().uids ?? [];
      if (!uids.includes(uid) && uids.length >= MAX_ACCOUNTS_PER_DEVICE) {
        allowed = false;
      }
    }

    sessionStorage.setItem(cacheKey, String(allowed));
    return { allowed };
  } catch (e: any) {
    // permission-denied = document exists but our UID isn't in it = device is full
    if (e?.code === "permission-denied") {
      sessionStorage.setItem(cacheKey, "false");
      return { allowed: false };
    }
    return { allowed: true }; // network errors: fail open
  }
}

export async function registerDeviceUsage(uid: string): Promise<void> {
  try {
    const deviceId = await generateDeviceId();
    await setDoc(
      doc(db, "deviceAccounts", deviceId),
      { uids: arrayUnion(uid) },
      { merge: true }
    );
  } catch { /* non-fatal */ }
}
