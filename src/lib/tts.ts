// Singleton Web Audio context — create once, reuse
let audioCtx: AudioContext | null = null;
let currentSourceNode: AudioBufferSourceNode | null = null;
let activeSpeechId = 0;

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

// Fetch audio from ElevenLabs and play via Web Audio API
// Returns a Promise that resolves when audio finishes playing
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
    console.log(
      "ElevenLabs request — key present:",
      !!apiKey,
      "voiceId:",
      voiceId,
      "text length:",
      trimmed.length
    );

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
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      console.log("ElevenLabs error body:", errBody);
      throw new Error(`ElevenLabs error: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();

    // Check if another speech request has started in the meantime
    if (speechId !== activeSpeechId) {
      return;
    }

    const ctx = getAudioCtx();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const audioBuffer = await ctx.decodeAudioData(buffer);

    // Re-check after decoding
    if (speechId !== activeSpeechId) {
      return;
    }

    return new Promise<void>((resolve) => {
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      currentSourceNode = source;

      let hasResolved = false;
      const handleEnded = () => {
        if (!hasResolved) {
          hasResolved = true;
          if (currentSourceNode === source) {
            currentSourceNode = null;
          }
          resolve();
        }
      };

      source.onended = handleEnded;
      source.start(0);
    });
  } catch (error) {
    console.error("Failed to speak element:", error);
    // If ElevenLabs call fails for any reason, resolve immediately without throwing
  }
}

// Disconnects and stops the current source node if playing
export function stopCurrentSpeech() {
  activeSpeechId++;
  if (currentSourceNode) {
    try {
      currentSourceNode.stop();
      currentSourceNode.disconnect();
    } catch (e) {
      // Ignore if already stopped
    }
    currentSourceNode = null;
  }
}
