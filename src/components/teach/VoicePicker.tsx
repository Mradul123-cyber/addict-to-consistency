import { useState, useRef, useEffect } from "react";
import { PRESET_VOICES, getSavedVoiceId, saveVoiceId } from "@/lib/tts";
import { Mic2, ChevronDown, Check } from "lucide-react";

interface VoicePickerProps {
  isBlackboard: boolean;
  onVoiceChange: () => void;
}

export function VoicePicker({ isBlackboard, onVoiceChange }: VoicePickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(getSavedVoiceId);
  const [customId, setCustomId] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const select = (id: string) => {
    saveVoiceId(id);
    setSelectedId(id);
    setOpen(false);
    setShowCustom(false);
    onVoiceChange();
  };

  const applyCustom = () => {
    if (!customId.trim()) return;
    select(customId.trim());
    setCustomId("");
  };

  const btnClass = `flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-sm ${
    isBlackboard
      ? "bg-white/10 hover:bg-white/15 border-white/10 text-neutral-200"
      : "bg-neutral-200/60 hover:bg-neutral-200/80 border-neutral-300/50 text-neutral-800"
  }`;

  const current = PRESET_VOICES.find(v => v.id === selectedId);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className={btnClass} title="Change voice">
        <Mic2 size={13} />
        <span>{current?.name ?? "Voice"}</span>
        <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className={`absolute right-0 top-full mt-1.5 z-50 w-52 rounded-xl border shadow-lg overflow-hidden ${
          isBlackboard ? "bg-neutral-900 border-white/10" : "bg-white border-neutral-200"
        }`}>
          {/* Preset voices */}
          {PRESET_VOICES.map(v => (
            <button
              key={v.id}
              onClick={() => select(v.id)}
              className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors ${
                isBlackboard ? "hover:bg-white/8 text-neutral-200" : "hover:bg-neutral-50 text-neutral-800"
              }`}
            >
              <div>
                <p className="font-semibold">{v.name}</p>
                <p className={`text-xs ${isBlackboard ? "text-neutral-400" : "text-neutral-500"}`}>{v.desc}</p>
              </div>
              {selectedId === v.id && <Check size={14} className="shrink-0 text-emerald-500" />}
            </button>
          ))}

          {/* Divider */}
          <div className={`border-t ${isBlackboard ? "border-white/10" : "border-neutral-100"}`} />

          {/* Custom voice ID */}
          {!showCustom ? (
            <button
              onClick={() => setShowCustom(true)}
              className={`w-full px-3 py-2.5 text-left text-xs transition-colors ${
                isBlackboard ? "hover:bg-white/8 text-neutral-400" : "hover:bg-neutral-50 text-neutral-500"
              }`}
            >
              + Use custom ElevenLabs voice ID
            </button>
          ) : (
            <div className="px-3 py-2.5 space-y-2">
              <p className={`text-[10px] ${isBlackboard ? "text-neutral-400" : "text-neutral-500"}`}>
                Paste your voice ID from elevenlabs.io/voice-library
              </p>
              <div className="flex gap-1.5">
                <input
                  autoFocus
                  value={customId}
                  onChange={e => setCustomId(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && applyCustom()}
                  placeholder="e.g. pNInz6obpgDQGcFmaJgB"
                  className={`flex-1 rounded-md border px-2 py-1 text-xs font-mono outline-none ${
                    isBlackboard
                      ? "bg-white/8 border-white/15 text-neutral-200 placeholder:text-neutral-500"
                      : "bg-neutral-50 border-neutral-200 text-neutral-800 placeholder:text-neutral-400"
                  }`}
                />
                <button
                  onClick={applyCustom}
                  disabled={!customId.trim()}
                  className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-bold text-white disabled:opacity-40"
                >
                  Use
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
