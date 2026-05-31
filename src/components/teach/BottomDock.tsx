import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, ImageIcon, Mic, MicOff, Paperclip, SendHorizonal, X, Mic2, ChevronDown, Check } from "lucide-react";
import type { BottomDockProps } from "@/types/teach";
import { PRESET_VOICES, getSavedVoiceId, saveVoiceId } from "@/lib/tts";

export function BottomDock({
  inputState,
  actions,
  attachments,
  onInputChange,
  disabled = false,
  placeholder = "Ask anything about this concept…",
}: BottomDockProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const voiceRef = useRef<HTMLDivElement>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(getSavedVoiceId);
  const [showCustom, setShowCustom] = useState(false);
  const [customId, setCustomId] = useState("");

  const selectVoice = (id: string) => {
    saveVoiceId(id);
    setSelectedVoice(id);
    setVoiceOpen(false);
    setShowCustom(false);
    setCustomId("");
  };

  const applyCustom = () => {
    if (customId.trim()) selectVoice(customId.trim());
  };

  const currentVoice = PRESET_VOICES.find(v => v.id === selectedVoice);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (!voiceRef.current?.contains(e.target as Node)) setVoiceOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const handleSend = () => {
    const trimmed = inputState.text.trim();
    if ((!trimmed && attachments.length === 0) || disabled) return;
    actions.onSendMessage(trimmed);
    onInputChange("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) actions.onUploadFile(file);
    e.target.value = "";
  };

  return (
    <motion.div
      className="pointer-events-none fixed bottom-5 left-0 right-0 z-[60] flex justify-center px-4"
      initial={{ y: 28, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Outer glow halo */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-20 w-full max-w-2xl rounded-3xl blur-2xl"
        style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(99,102,241,0.15), transparent 70%)" }}
      />

      {/* Glass pill */}
      <div
        className="pointer-events-auto flex w-full max-w-2xl items-end gap-2 rounded-2xl p-2"
        style={{
          background: "rgba(10,10,10,0.55)",
          backdropFilter: "blur(28px) saturate(180%)",
          WebkitBackdropFilter: "blur(28px) saturate(180%)",
          boxShadow: [
            // Top glass reflection
            "inset 0 1px 0 rgba(255,255,255,0.09)",
            // Inner bottom depth
            "inset 0 -1px 0 rgba(0,0,0,0.4)",
            // Tight outer border
            "0 0 0 1px rgba(255,255,255,0.07)",
            // Physical lift shadow
            "0 8px 32px -6px rgba(0,0,0,0.8)",
            // Ambient float
            "0 24px 60px -12px rgba(0,0,0,0.5)",
          ].join(", "),
        }}
      >
        {/* Upload */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf,.txt,.md,.csv"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />
        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          aria-label="Upload file"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/35 transition-all hover:bg-white/8 hover:text-white/65 disabled:opacity-25"
        >
          <Paperclip className="h-4 w-4" />
        </motion.button>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {attachments.map((attachment) => {
                const isImage = attachment.kind === "image";
                const Icon = isImage ? ImageIcon : FileText;

                return (
                  <div
                    key={attachment.id}
                    className="flex max-w-[13rem] items-center gap-1.5 rounded-lg bg-white/8 px-2 py-1 text-xs text-white/75 ring-1 ring-white/10"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-white/45" />
                    <span className="truncate">{attachment.name}</span>
                    <button
                      type="button"
                      onClick={() => actions.onRemoveAttachment(attachment.id)}
                      disabled={disabled}
                      aria-label={`Remove ${attachment.name}`}
                      className="ml-0.5 rounded p-0.5 text-white/35 transition hover:bg-white/10 hover:text-white/75 disabled:opacity-25"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Text input */}
          <textarea
            rows={1}
            value={inputState.text}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="resize-none bg-transparent py-1.5 text-sm leading-relaxed text-white/88 placeholder:text-white/22 focus:outline-none disabled:opacity-35"
            style={{ maxHeight: "7rem", lineHeight: "1.5rem" }}
          />
        </div>

        {/* Voice picker */}
        <div ref={voiceRef} className="relative shrink-0">
          <motion.button
            type="button"
            whileTap={{ scale: 0.85 }}
            onClick={() => setVoiceOpen(o => !o)}
            className="flex h-9 items-center gap-1 rounded-xl px-2 text-white/35 transition-all hover:bg-white/8 hover:text-white/65"
          >
            <Mic2 className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold">{currentVoice?.name ?? "Voice"}</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${voiceOpen ? "rotate-180" : ""}`} />
          </motion.button>

          {voiceOpen && (
            <div className="absolute bottom-full right-0 mb-2 z-50 w-52 rounded-xl overflow-hidden"
              style={{
                background: "rgba(18,18,18,0.95)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 -8px 32px rgba(0,0,0,0.6)",
              }}
            >
              {PRESET_VOICES.map(v => (
                <button key={v.id} onClick={() => selectVoice(v.id)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-white/8"
                >
                  <div>
                    <p className="text-sm font-semibold text-white/90">{v.name}</p>
                    <p className="text-[11px] text-white/40">{v.desc}</p>
                  </div>
                  {selectedVoice === v.id && <Check size={13} className="shrink-0 text-emerald-400" />}
                </button>
              ))}
              <div className="border-t border-white/8" />
              {!showCustom ? (
                <button onClick={() => setShowCustom(true)}
                  className="w-full px-3 py-2.5 text-left text-xs text-white/35 transition-colors hover:bg-white/8 hover:text-white/55"
                >
                  + Custom ElevenLabs voice ID
                </button>
              ) : (
                <div className="px-3 py-2.5 space-y-2">
                  <p className="text-[10px] text-white/35">Paste voice ID from elevenlabs.io</p>
                  <div className="flex gap-1.5">
                    <input autoFocus value={customId} onChange={e => setCustomId(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && applyCustom()}
                      placeholder="pNInz6obpgDQGcFmaJgB"
                      className="flex-1 rounded-md border border-white/10 bg-white/6 px-2 py-1 text-[11px] font-mono text-white/80 placeholder:text-white/20 outline-none"
                    />
                    <button onClick={applyCustom} disabled={!customId.trim()}
                      className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-bold text-white disabled:opacity-30"
                    >Use</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mic */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={actions.onToggleRecording}
          disabled={disabled}
          aria-label={inputState.isRecording ? "Stop recording" : "Start voice input"}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all disabled:opacity-25 ${
            inputState.isRecording
              ? "bg-red-500/18 text-red-400 ring-1 ring-red-500/30"
              : "text-white/35 hover:bg-white/8 hover:text-white/65"
          }`}
        >
          {inputState.isRecording ? (
            <motion.span
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ duration: 0.9, repeat: Infinity }}
              className="flex items-center"
            >
              <MicOff className="h-4 w-4" />
            </motion.span>
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </motion.button>

        {/* Send */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={handleSend}
          disabled={disabled || (!inputState.text.trim() && attachments.length === 0)}
          aria-label="Send message"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition-all disabled:cursor-not-allowed disabled:opacity-25"
          style={{
            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            boxShadow: "0 2px 10px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
          }}
        >
          <SendHorizonal className="h-4 w-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}
