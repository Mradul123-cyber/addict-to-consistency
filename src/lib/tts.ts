// ── IndexedDB audio cache ─────────────────────────────────────────────────────
// L1: in-memory Map → L2: IndexedDB (30-day TTL) → L3: Worker → ElevenLabs
// Cache key includes voiceId so switching voices doesn't serve stale audio.
// Replay (replayMode=true) never calls ElevenLabs — silently skips missing audio.

const DB_NAME = "jee-tts-cache";
const DB_VERSION = 2;
const STORE_NAME = "audio";
const TS_STORE = "timestamps"; // parallel store: key → epoch ms written
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

let cleanupRan = false;

async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      if (!db.objectStoreNames.contains(TS_STORE))   db.createObjectStore(TS_STORE);
    };
    req.onsuccess = () => {
      const db = req.result;
      if (!cleanupRan) { cleanupRan = true; void purgeExpired(db); }
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}

function purgeExpired(db: IDBDatabase): Promise<void> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORE_NAME, TS_STORE], "readwrite");
      const tsStore = tx.objectStore(TS_STORE);
      const cutoff = Date.now() - TTL_MS;
      const req = tsStore.openCursor();
      req.onsuccess = () => {
        const cursor = req.result as IDBCursorWithValue | null;
        if (!cursor) { resolve(); return; }
        if ((cursor.value as number) < cutoff) {
          tx.objectStore(STORE_NAME).delete(cursor.key);
          cursor.delete();
        }
        cursor.continue();
      };
      req.onerror = () => resolve();
    } catch { resolve(); }
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
      const tx = db.transaction([STORE_NAME, TS_STORE], "readwrite");
      tx.objectStore(STORE_NAME).put(value, key);
      tx.objectStore(TS_STORE).put(Date.now(), key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch { /* non-fatal */ }
}

async function textToKey(text: string, voiceId: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(voiceId + ":" + text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Azure TTS: browser calls Azure directly (Cloudflare Worker can't — centralindia.tts.speech.microsoft.com is behind Cloudflare CDN → loopback 400)
// Worker issues a short-lived bearer token; browser uses it to call Azure TTS endpoint.
async function fetchAzureAudioBuffer(text: string, voiceId: string, workerUrl: string, idToken: string | null, language?: "english" | "hinglish" | "hindi"): Promise<ArrayBuffer> {
  const azureVoiceName = voiceId.slice(6);
  const isDevanagari = /[ऀ-ॿ]/.test(text);
  const isHindi = language === "hindi" || language === "hinglish";
  const langCode = isDevanagari || isHindi ? "hi-IN" : azureVoiceName.startsWith("hi-IN") ? "hi-IN" : "en-US";
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='https://www.w3.org/2001/mstts' xml:lang='${langCode}'><voice name='${azureVoiceName}'>${escaped}</voice></speak>`;

  const tokenRes = await fetch(`${workerUrl}/api/azure-token`, {
    headers: { ...(idToken ? { "Authorization": `Bearer ${idToken}` } : {}) },
  });
  if (!tokenRes.ok) throw new Error(`Azure token error: ${tokenRes.status}`);
  const { token } = await tokenRes.json() as { token: string };

  const ttsRes = await fetch("https://centralindia.tts.speech.microsoft.com/cognitiveservices/v1", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-160kbitrate-mono-mp3",
    },
    body: ssml,
  });
  if (!ttsRes.ok) {
    const errBody = await ttsRes.text().catch(() => "(unreadable)");
    throw new Error(`Azure TTS error: ${ttsRes.status} ${errBody}`);
  }
  return ttsRes.arrayBuffer();
}

// ── Voice config ──────────────────────────────────────────────────────────────

// ElevenLabs — English
export const PRESET_VOICES = [
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", desc: "British · Authoritative", preview: "daniel" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam",   desc: "American · Clear",        preview: "adam" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh",   desc: "Deep · Assertive",        preview: "josh" },
] as const;

// ElevenLabs — Indian (add to your account at elevenlabs.io/voice-library first)
export const HINGLISH_VOICES_EL = [
  { id: "pq8ptAFvXx1MBHKzOrML", name: "Ishaan", desc: "Indian · Teaching",  preview: "ishaan" },
  { id: "E5Qzcir7Cv8tZdPyn2it", name: "Karn",   desc: "Indian · E-Learning", preview: "karn" },
  { id: "DP7PNHpRD6HfosXDaGHq", name: "Arjun",  desc: "Indian · Narrator",  preview: "arjun" },
] as const;

// Smallest AI — Indian (sai: prefix routes to Smallest AI in worker)
export const HINGLISH_VOICES_SAI = [
  { id: "sai:devansh", name: "Devansh", desc: "Hindi · Natural",  preview: "devansh" },
  { id: "sai:kartik",  name: "Kartik",  desc: "Hindi · Clear",   preview: "kartik" },
  { id: "sai:harsh",   name: "Harsh",   desc: "Hindi · Deep",    preview: "harsh" },
] as const;

// Google TTS Chirp3-HD — English (google: prefix routes to Google TTS in worker)
export const GOOGLE_VOICES_EN = [
  { id: "google:en-IN-Chirp3-HD-Charon",  name: "Charon",  desc: "Indian · Deep" },
  { id: "google:en-IN-Chirp3-HD-Fenrir",  name: "Fenrir",  desc: "Indian · Clear" },
  { id: "google:en-IN-Chirp3-HD-Iapetus", name: "Iapetus", desc: "Indian · Warm" },
] as const;

// Google TTS Chirp3-HD — Hindi/Hinglish
export const GOOGLE_VOICES_HI = [
  { id: "google:hi-IN-Chirp3-HD-Charon",  name: "Charon",  desc: "Hindi · Deep" },
  { id: "google:hi-IN-Chirp3-HD-Fenrir",  name: "Fenrir",  desc: "Hindi · Clear" },
  { id: "google:hi-IN-Chirp3-HD-Iapetus", name: "Iapetus", desc: "Hindi · Warm" },
] as const;

// Azure Neural HD — English (azure: prefix routes to Azure TTS in worker)
export const AZURE_VOICES_EN = [
  { id: "azure:en-US-BrianMultilingualNeural", name: "Brian", desc: "English · Natural" },
  { id: "azure:hi-IN-Dhruv:MAI-Voice-2",       name: "Dhruv", desc: "Indian · Clear" },
] as const;

// Azure Neural HD — Hindi/Hinglish
export const AZURE_VOICES_HI = [
  { id: "azure:en-US-BrianMultilingualNeural", name: "Brian", desc: "Hindi · Warm" },
  { id: "azure:hi-IN-Dhruv:MAI-Voice-2",       name: "Dhruv", desc: "Hindi · Deep" },
] as const;

export const HINGLISH_VOICES = [...HINGLISH_VOICES_EL, ...HINGLISH_VOICES_SAI];

const VOICE_KEY = "jee-voice-id";
const HINGLISH_VOICE_KEY = "jee-voice-hi";
const DEFAULT_VOICE_ID = PRESET_VOICES[0].id;
const DEFAULT_HINGLISH_VOICE_ID = HINGLISH_VOICES[0].id;

export function getSavedHinglishVoiceId(): string {
  try { return localStorage.getItem(HINGLISH_VOICE_KEY) || DEFAULT_HINGLISH_VOICE_ID; }
  catch { return DEFAULT_HINGLISH_VOICE_ID; }
}

export function saveHinglishVoiceId(id: string): void {
  try { localStorage.setItem(HINGLISH_VOICE_KEY, id); } catch {}
}

export function getSavedVoiceId(): string {
  try { return localStorage.getItem(VOICE_KEY) || DEFAULT_VOICE_ID; }
  catch { return DEFAULT_VOICE_ID; }
}

export function saveVoiceId(id: string): void {
  try { localStorage.setItem(VOICE_KEY, id); }
  catch { /* non-fatal */ }
}

// ── Runtime state ─────────────────────────────────────────────────────────────

import { SoundTouchNode } from '@soundtouchjs/audio-worklet';
import processorUrl from '@soundtouchjs/audio-worklet/processor?url';

let audioCtx: AudioContext | null = null;
let currentSourceNode: AudioBufferSourceNode | null = null;
let currentStNode: SoundTouchNode | null = null;
let activeSpeechId = 0;
let soundTouchRegistered = false;

async function ensureSoundTouch(ctx: AudioContext): Promise<void> {
  if (!soundTouchRegistered) {
    await SoundTouchNode.register(ctx, processorUrl);
    soundTouchRegistered = true;
  }
}
let replayMode = false;

const memCache = new Map<string, AudioBuffer>();

export function setReplayMode(on: boolean) { replayMode = on; }

// ── Missed-chunk tracking (per-response background fill) ──────────────────────

interface MissedChunk { text: string; language?: "english" | "hinglish" | "hindi" }
const _missedChunks: MissedChunk[] = [];
let _bgFillRunning = false;
let _bgFillDone = false;

export function resetTTSMissedQueue(): void {
  _missedChunks.length = 0;
  _bgFillRunning = false;
  _bgFillDone = false;
}
export function hasMissedTTSChunks(): boolean { return _missedChunks.length > 0; }
export function isTTSBackgroundFillDone(): boolean { return _bgFillDone; }

export async function startTTSBackgroundFill(
  idToken: string | null,
  onComplete: () => void,
): Promise<void> {
  if (_bgFillRunning || _missedChunks.length === 0) { onComplete(); return; }
  _bgFillRunning = true;
  const queue = [..._missedChunks];
  for (const chunk of queue) {
    await prefetchAudio(chunk.text, idToken, chunk.language);
    await new Promise<void>(r => setTimeout(r, 300));
  }
  _bgFillDone = true;
  _bgFillRunning = false;
  onComplete();
}

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

// ── Speak text normalization ──────────────────────────────────────────────────
// Expands abbreviations ElevenLabs mispronounces into their spoken forms.
// Applied before cache key + API call so normalized text is what gets cached.

function normalizeSpeakText(text: string): string {
  return text
    // Compound units first (order matters — km before m, kHz before Hz)
    .replace(/\bkm\/h\b/gi, "kilometers per hour")
    .replace(/\bm\/s²\b/g, "meters per second squared")
    .replace(/\bm\/s\b/g, "meters per second")
    .replace(/\bkm\b/g, "kilometers")
    .replace(/\bcm\b/g, "centimeters")
    .replace(/\bmm\b/g, "millimeters")
    .replace(/\bμm\b/g, "micrometers")
    .replace(/\bnm\b/g, "nanometers")
    .replace(/\bkg\b/g, "kilograms")
    .replace(/\bmg\b/g, "milligrams")
    .replace(/\bμg\b/g, "micrograms")
    .replace(/\bkJ\b/g, "kilojoules")
    .replace(/\bmJ\b/g, "millijoules")
    .replace(/\beV\b/g, "electron volts")
    .replace(/\bkeV\b/g, "kilo electron volts")
    .replace(/\bMeV\b/g, "mega electron volts")
    .replace(/\bkHz\b/g, "kilohertz")
    .replace(/\bMHz\b/g, "megahertz")
    .replace(/\bGHz\b/g, "gigahertz")
    .replace(/\bkW\b/g, "kilowatts")
    .replace(/\bmW\b/g, "milliwatts")
    .replace(/\bkV\b/g, "kilovolts")
    .replace(/\bmV\b/g, "millivolts")
    .replace(/\bkΩ\b/g, "kilohms")
    .replace(/\bMΩ\b/g, "megaohms")
    .replace(/\bμF\b/g, "microfarads")
    .replace(/\bnF\b/g, "nanofarads")
    .replace(/\bpF\b/g, "picofarads")
    .replace(/\bmA\b/g, "milliamperes")
    .replace(/\bμA\b/g, "microamperes")
    .replace(/\bkPa\b/g, "kilopascals")
    .replace(/\bMPa\b/g, "megapascals")
    .replace(/\bmol\b/g, "moles")
    .replace(/\bmL\b/g, "milliliters")
    // Simple units
    .replace(/\bHz\b/g, "Hertz")
    .replace(/\bPa\b/g, "Pascals")
    .replace(/\bJ\b/g, "Joules")
    .replace(/\bW\b/g, "Watts")
    .replace(/\bΩ\b/g, "Ohms")
    .replace(/\bT\b/g, "Tesla")
    .replace(/\bK\b/g, "Kelvin")
    .replace(/\b°C\b/g, "degrees Celsius")
    .replace(/\b°F\b/g, "degrees Fahrenheit")
    .replace(/\batm\b/g, "atmospheres")
    // Common abbreviations
    .replace(/\bvs\.?\b/gi, "versus")
    .replace(/\be\.g\.?\b/gi, "for example")
    .replace(/\bi\.e\.?\b/gi, "that is")
    .replace(/\bJEE\b/g, "J E E")
    .replace(/\bNEET\b/g, "N E E T")
    // Greek letters that might appear in speak text
    .replace(/\bα\b/g, "alpha")
    .replace(/\bβ\b/g, "beta")
    .replace(/\bγ\b/g, "gamma")
    .replace(/\bλ\b/g, "lambda")
    .replace(/\bμ\b/g, "mu")
    .replace(/\bω\b/g, "omega")
    .replace(/\bθ\b/g, "theta")
    .replace(/\bφ\b/g, "phi")
    .replace(/\bσ\b/g, "sigma")
    .replace(/\bπ\b/g, "pi")
    // Math symbols
    .replace(/\b∞\b/g, "infinity")
    .replace(/√/g, "root of")
    .replace(/²/g, " squared")
    .replace(/³/g, " cubed")
    .replace(/%/g, "percent");
}

// ── Prefetch concurrency semaphore ────────────────────────────────────────────
// At most 2 TTS prefetch calls in-flight at once. Extra calls queue and run as slots free.

const PREFETCH_CONCURRENCY = 2;
let _prefetchActive = 0;
const _prefetchQueue: Array<() => void> = [];

function acquirePrefetchSlot(): Promise<void> {
  if (_prefetchActive < PREFETCH_CONCURRENCY) {
    _prefetchActive++;
    return Promise.resolve();
  }
  return new Promise<void>(resolve => _prefetchQueue.push(resolve));
}

function releasePrefetchSlot(): void {
  const next = _prefetchQueue.shift();
  if (next) {
    next(); // hand slot directly to next waiter — active count stays the same
  } else {
    _prefetchActive--;
  }
}

// ── Prefetch: fetch + cache audio without playing ─────────────────────────────
// Fire-and-forget while current element plays. speakElement() hits cache instantly.

export async function prefetchAudio(
  text: string,
  idToken: string | null,
  language?: "english" | "hinglish" | "hindi",
): Promise<void> {
  if (replayMode) return;
  const trimmed = normalizeSpeakText(text.trim());
  if (!trimmed) return;

  const workerUrl = import.meta.env.VITE_WORKER_URL;
  const voiceId = (language === "hinglish" || language === "hindi") ? getSavedHinglishVoiceId() : getSavedVoiceId();
  const key = await textToKey(trimmed, voiceId);

  if (memCache.has(key)) return;
  const stored = await idbGet(key);
  if (stored) {
    try {
      const audioBuffer = await getAudioCtx().decodeAudioData(stored.slice(0));
      memCache.set(key, audioBuffer);
    } catch { /* corrupt cache entry — will re-fetch on play */ }
    return;
  }

  await acquirePrefetchSlot();
  try {
    if (memCache.has(key)) return;
    let rawBuffer: ArrayBuffer;
    if (voiceId.startsWith("azure:")) {
      rawBuffer = await fetchAzureAudioBuffer(trimmed, voiceId, workerUrl, idToken ?? null, language);
    } else {
      const response = await fetch(`${workerUrl}/api/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { "Authorization": `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ text: trimmed, voiceId, ...(language ? { language } : {}) }),
      });
      if (!response.ok) return;
      rawBuffer = await response.arrayBuffer();
    }
    void idbSet(key, rawBuffer.slice(0));
    const audioBuffer = await getAudioCtx().decodeAudioData(rawBuffer);
    memCache.set(key, audioBuffer);
  } catch { /* non-fatal — speakElement will retry on play */ }
  finally {
    releasePrefetchSlot();
  }
}

// ── Main speak function ───────────────────────────────────────────────────────

export async function speakElement(text: string, idToken?: string | null, speed = 1, language?: "english" | "hinglish" | "hindi"): Promise<void> {
  const trimmed = normalizeSpeakText(text.trim());
  if (!trimmed) return;

  const workerUrl = import.meta.env.VITE_WORKER_URL;
  const voiceId = (language === "hinglish" || language === "hindi") ? getSavedHinglishVoiceId() : getSavedVoiceId();

  const speechId = ++activeSpeechId;
  stopCurrentSpeech();

  try {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") await ctx.resume();

    const key = await textToKey(trimmed, voiceId);
    let audioBuffer: AudioBuffer;

    if (memCache.has(key)) {
      audioBuffer = memCache.get(key)!;
    } else {
      const stored = await idbGet(key);
      if (stored) {
        audioBuffer = await ctx.decodeAudioData(stored.slice(0));
        memCache.set(key, audioBuffer);
      } else {
        if (replayMode) return;
        let rawBuffer: ArrayBuffer;
        if (voiceId.startsWith("azure:")) {
          rawBuffer = await fetchAzureAudioBuffer(trimmed, voiceId, workerUrl, idToken ?? null, language);
        } else {
          const response = await fetch(`${workerUrl}/api/tts`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(idToken ? { "Authorization": `Bearer ${idToken}` } : {}),
            },
            body: JSON.stringify({ text: trimmed, voiceId, ...(language ? { language } : {}) }),
          });

          if (response.status === 429) {
            _missedChunks.push({ text: trimmed, language });
            return;
          }
          if (!response.ok) {
            const errBody = await response.text().catch(() => "(unreadable)");
            console.error(`[TTS] ${response.status} voiceId=${voiceId} body=${errBody}`);
            throw new Error(`TTS error: ${response.status}`);
          }
          rawBuffer = await response.arrayBuffer();
        }
        void idbSet(key, rawBuffer.slice(0));
        audioBuffer = await ctx.decodeAudioData(rawBuffer);
        memCache.set(key, audioBuffer);
      }
    }

    if (speechId !== activeSpeechId) return;

    if (speed !== 1) await ensureSoundTouch(ctx);
    if (speechId !== activeSpeechId) return;

    return new Promise<void>((resolve) => {
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      currentSourceNode = source;

      if (speed !== 1) {
        const stNode = new SoundTouchNode({ context: ctx });
        stNode.connect(ctx.destination);
        currentStNode = stNode;
        source.playbackRate.value = speed;
        stNode.playbackRate.value = speed; // processor auto-compensates pitch
        source.connect(stNode);
      } else {
        source.connect(ctx.destination);
      }

      let resolved = false;
      const done = () => {
        if (!resolved) {
          resolved = true;
          if (currentSourceNode === source) { currentSourceNode = null; currentStNode = null; }
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
    try { currentSourceNode.stop(); currentSourceNode.disconnect(); }
    catch { /* already stopped */ }
    currentSourceNode = null;
  }
  if (currentStNode) {
    try { currentStNode.disconnect(); } catch { }
    currentStNode = null;
  }
}

