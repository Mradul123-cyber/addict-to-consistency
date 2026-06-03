import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, ImageIcon, Mic, Paperclip, SendHorizonal, X, Mic2, ChevronDown, Check, Loader2 } from "lucide-react";
import type { BottomDockProps } from "@/types/teach";
import { PRESET_VOICES, getSavedVoiceId, saveVoiceId } from "@/lib/tts";

export function BottomDock({
  inputState,
  actions,
  attachments,
  onInputChange,
  disabled = false,
  placeholder = "Ask anything about this concept…",
  subMode = "general",
  onSubModeChange,
  showSubMode = false,
  isAttachmentUploading = false,
}: BottomDockProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const voiceRef = useRef<HTMLDivElement>(null);
  const subModeRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [subModeOpen, setSubModeOpen] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(getSavedVoiceId);

  const selectVoice = (id: string) => {
    saveVoiceId(id);
    setSelectedVoice(id);
    setVoiceOpen(false);
  };

  const currentVoice = PRESET_VOICES.find(v => v.id === selectedVoice);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (!voiceRef.current?.contains(e.target as Node)) setVoiceOpen(false);
      if (!subModeRef.current?.contains(e.target as Node)) setSubModeOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Auto-resize textarea when text changes (including voice input)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 112) + "px";
  }, [inputState.text]);

  const handleToggleMic = () => {
    if (inputState.isRecording) {
      recognitionRef.current?.stop();
      actions.onToggleRecording();
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    const recognition = new SR();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;

    let finalTranscript = inputState.text;

    recognition.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + t.trim();
        } else {
          interim = t;
        }
      }
      onInputChange(finalTranscript + (interim ? (finalTranscript ? " " : "") + interim : ""));
    };

    recognition.onend = () => {
      onInputChange(finalTranscript);
      actions.onToggleRecording();
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      actions.onToggleRecording();
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    actions.onToggleRecording();
  };

  const handleSend = () => {
    const trimmed = inputState.text.trim();
    if ((!trimmed && attachments.length === 0) || disabled) return;
    actions.onSendMessage(trimmed);
    onInputChange("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
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
      className="pointer-events-none fixed bottom-5 left-0 right-0 z-[60] flex justify-center px-2 sm:px-4"
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
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || isAttachmentUploading}
        />
        <motion.button
          type="button"
          whileTap={{ scale: isAttachmentUploading ? 1 : 0.85 }}
          onClick={() => !isAttachmentUploading && fileRef.current?.click()}
          disabled={disabled || isAttachmentUploading}
          aria-label={isAttachmentUploading ? "Uploading…" : "Upload image or PDF"}
          title={isAttachmentUploading ? "Uploading file…" : undefined}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/35 transition-all hover:bg-white/8 hover:text-white/65 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAttachmentUploading
            ? <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
            : <Paperclip className="h-4 w-4" />
          }
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
            ref={textareaRef}
            rows={1}
            value={inputState.text}
            onChange={(e) => {
              onInputChange(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 112) + "px";
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="resize-none overflow-hidden bg-transparent py-1.5 text-sm leading-relaxed text-white/88 placeholder:text-white/22 focus:outline-none disabled:opacity-35"
            style={{ lineHeight: "1.5rem" }}
          />
        </div>

        {/* Sub-mode picker — only for JEE/NEET */}
        {showSubMode && (
          <div ref={subModeRef} className="relative shrink-0">
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={() => setSubModeOpen(o => !o)}
              className="flex h-9 items-center gap-1 rounded-xl px-2 text-white/35 transition-all hover:bg-white/8 hover:text-white/65"
            >
              <span className="text-[11px] font-semibold">{subMode === "3d" ? "3D" : "Gen"}</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${subModeOpen ? "rotate-180" : ""}`} />
            </motion.button>
            {subModeOpen && (
              <div className="absolute bottom-full left-0 mb-2 z-50 w-40 rounded-xl overflow-hidden"
                style={{ background: "rgba(18,18,18,0.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 -8px 32px rgba(0,0,0,0.6)" }}
              >
                {(["general", "3d"] as const).map(m => (
                  <button key={m} onClick={() => { onSubModeChange?.(m); setSubModeOpen(false); }}
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-white/8"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white/90">{m === "3d" ? "3D Visualization" : "General"}</p>
                        {m === "3d" && <span className="rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-amber-500/20 text-amber-400">Beta</span>}
                      </div>
                      <p className="text-[11px] text-white/40">{m === "3d" ? "Experimental — try & share feedback" : "Text & math"}</p>
                    </div>
                    {subMode === m && <Check size={13} className="shrink-0 text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Voice picker */}
        <div ref={voiceRef} className={`relative shrink-0 ${disabled ? "opacity-30 pointer-events-none" : ""}`}>
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
            <div className="absolute bottom-full right-0 mb-2 z-50 w-52 rounded-xl overflow-hidden max-sm:right-auto max-sm:left-0 max-sm:w-[min(208px,calc(100vw-32px))]"
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
            </div>
          )}
        </div>

        {/* Mic */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={handleToggleMic}
          disabled={disabled}
          aria-label={inputState.isRecording ? "Stop recording" : "Start voice input"}
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all disabled:opacity-25 text-white/35 hover:bg-white/8 hover:text-white/65"
        >
          {inputState.isRecording ? (
            <div className="flex items-end gap-[3px] h-4">
              {[0, 1, 2, 3].map((i) => (
                <motion.span
                  key={i}
                  className="w-[3px] rounded-full bg-red-400"
                  animate={{ height: ["4px", "14px", "4px"] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
                />
              ))}
            </div>
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
