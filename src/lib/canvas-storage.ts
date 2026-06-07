const DB_NAME    = "jee-canvas-cache";
const DB_VERSION = 1;
const STORE_NAME = "canvases";

interface CanvasRecord {
  width:  number;
  height: number;
  data:   Uint8ClampedArray;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      (e.target as IDBOpenDBRequest).result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => reject(req.error);
  });
}

export async function saveCanvas(sessionId: string, imageData: ImageData): Promise<void> {
  try {
    const db = await openDb();
    const record: CanvasRecord = {
      width:  imageData.width,
      height: imageData.height,
      data:   imageData.data,
    };
    await new Promise<void>((resolve, reject) => {
      const tx  = db.transaction(STORE_NAME, "readwrite");
      const req = tx.objectStore(STORE_NAME).put(record, sessionId);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  } catch { /* non-fatal */ }
}

export async function loadCanvas(sessionId: string): Promise<ImageData | null> {
  try {
    const db = await openDb();
    const record = await new Promise<CanvasRecord | undefined>((resolve, reject) => {
      const tx  = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(sessionId);
      req.onsuccess = () => resolve(req.result as CanvasRecord | undefined);
      req.onerror   = () => reject(req.error);
    });
    if (!record) return null;
    return new ImageData(new Uint8ClampedArray(record.data), record.width, record.height);
  } catch { return null; }
}

export async function deleteCanvas(sessionId: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx  = db.transaction(STORE_NAME, "readwrite");
      const req = tx.objectStore(STORE_NAME).delete(sessionId);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  } catch { /* non-fatal */ }
}
