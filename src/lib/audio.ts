export type AmbientKind = "white" | "brown" | "binaural" | "off";

let ctx: AudioContext | null = null;
let activeNodes: AudioNode[] = [];

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

export function stopAmbient() {
  for (const n of activeNodes) {
    try {
      (n as AudioScheduledSourceNode).stop?.();
    } catch {
      /* noop */
    }
    try {
      n.disconnect();
    } catch {
      /* noop */
    }
  }
  activeNodes = [];
}

function makeNoiseBuffer(c: AudioContext, brown: boolean) {
  const length = c.sampleRate * 2;
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else {
      data[i] = white;
    }
  }
  return buffer;
}

export function playAmbient(kind: AmbientKind) {
  stopAmbient();
  if (kind === "off") return;
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume();

  if (kind === "white" || kind === "brown") {
    const src = c.createBufferSource();
    src.buffer = makeNoiseBuffer(c, kind === "brown");
    src.loop = true;
    const gain = c.createGain();
    gain.gain.value = kind === "brown" ? 0.35 : 0.18;
    src.connect(gain).connect(c.destination);
    src.start();
    activeNodes.push(src, gain);
  } else if (kind === "binaural") {
    const merger = c.createChannelMerger(2);
    const gain = c.createGain();
    gain.gain.value = 0.08;

    const oscL = c.createOscillator();
    oscL.frequency.value = 200;
    oscL.connect(merger, 0, 0);

    const oscR = c.createOscillator();
    oscR.frequency.value = 210; // 10 Hz beat
    oscR.connect(merger, 0, 1);

    merger.connect(gain).connect(c.destination);
    oscL.start();
    oscR.start();
    activeNodes.push(oscL, oscR, merger, gain);
  }
}
