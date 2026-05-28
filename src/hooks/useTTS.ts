import { useCallback, useRef, useEffect } from "react";

// ─── useTTS — Browser SpeechSynthesis hook ────────────────────────────────────

export function useTTS(enabled: boolean) {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Try to pick a natural English voice once voices are loaded
  useEffect(() => {
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      // Prefer a local, natural-sounding English voice
      const preferred =
        voices.find((v) => v.lang.startsWith("en") && v.localService && v.name.includes("Google")) ||
        voices.find((v) => v.lang.startsWith("en") && v.localService) ||
        voices.find((v) => v.lang.startsWith("en")) ||
        voices[0] ||
        null;
      voiceRef.current = preferred;
    };

    pickVoice();
    // Some browsers fire this event when voices become available
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", pickVoice);
  }, []);

  const cancel = useCallback(() => {
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!enabled) return;
      // Cancel any ongoing speech first
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voiceRef.current;
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [enabled]
  );

  return { speak, cancel };
}
