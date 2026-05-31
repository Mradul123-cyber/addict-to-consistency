// ── IndexedDB audio cache ─────────────────────────────────────────────────────
// Stores raw ArrayBuffer keyed by SHA-256 hash of the text.
// Survives page reloads, tab closes, and browser restarts.
// L1: in-memory Map (instant) → L2: IndexedDB (persistent) → L3: ElevenLabs API

const DB_NAME = "jee-tts-cache";
const DB_VERSION = 1;
const STORE_NAME = "audio";

async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<ArrayBuffer | undefined> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result as ArrayBuffer | undefined);
      req.onerror = () => resolve(undefined);
    });
  } catch { return undefined; }
}

async function idbSet(key: string, value: ArrayBuffer): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch { /* non-fatal */ }
}

async function textToKey(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── Runtime state ─────────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;
let currentSourceNode: AudioBufferSourceNode | null = null;
let activeSpeechId = 0;
let replayMode = false;

// L1 in-memory cache: key → decoded AudioBuffer (fastest, lives for tab session)
const memCache = new Map<string, AudioBuffer>();

export function setReplayMode(on: boolean) { replayMode = on; }

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

// ── Main speak function ───────────────────────────────────────────────────────

export async function speakElement(text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  const voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID;

  if (!apiKey || !voiceId) {
    console.warn("ElevenLabs API key or voice ID is missing. TTS will be skipped.");
    return;
  }

  const speechId = ++activeSpeechId;
  stopCurrentSpeech();

  try {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") await ctx.resume();

    const key = await textToKey(trimmed);
    let audioBuffer: AudioBuffer;

    // L1: memory cache hit
    if (memCache.has(key)) {
      audioBuffer = memCache.get(key)!;
    } else {
      // L2: IndexedDB cache hit
      const stored = await idbGet(key);
      if (stored) {
        audioBuffer = await ctx.decodeAudioData(stored.slice(0));
        memCache.set(key, audioBuffer);
      } else {
        // L3: ElevenLabs — skipped during replay
        if (replayMode) return;
        console.log("ElevenLabs request — text length:", trimmed.length);
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "xi-api-key": apiKey,
            },
            body: JSON.stringify({
              text: trimmed,
              model_id: "eleven_multilingual_v2",
              voice_settings: { stability: 0.55, similarity_boost: 0.80, style: 0.15, use_speaker_boost: true },
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`ElevenLabs error: ${response.status} ${response.statusText}`);
        }

        const rawBuffer = await response.arrayBuffer();
        // Persist to IndexedDB (non-blocking)
        void idbSet(key, rawBuffer.slice(0));
        audioBuffer = await ctx.decodeAudioData(rawBuffer);
        memCache.set(key, audioBuffer);
      }
    }

    if (speechId !== activeSpeechId) return;

    return new Promise<void>((resolve) => {
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      currentSourceNode = source;

      let resolved = false;
      const done = () => {
        if (!resolved) {
          resolved = true;
          if (currentSourceNode === source) currentSourceNode = null;
          resolve();
        }
      };

      source.onended = done;
      source.start(0);
    });
  } catch (error) {
    console.error("Failed to speak element:", error);
  }
}

export function stopCurrentSpeech() {
  if (currentSourceNode) {
    try {
      currentSourceNode.stop();
      currentSourceNode.disconnect();
    } catch { /* already stopped */ }
    currentSourceNode = null;
  }
}
