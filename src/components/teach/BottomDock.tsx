import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, ImageIcon, Mic, Paperclip, SendHorizonal, X, AudioLines, LayoutGrid, ChevronDown, Check, Loader2, Play, Square, PencilLine } from "lucide-react";
import type { BottomDockProps } from "@/types/teach";
import { PRESET_VOICES, HINGLISH_VOICES_EL, HINGLISH_VOICES_SAI, GOOGLE_VOICES_EN, GOOGLE_VOICES_HI, AZURE_VOICES_EN, AZURE_VOICES_HI, getSavedVoiceId, saveVoiceId, getSavedHinglishVoiceId, saveHinglishVoiceId } from "@/lib/tts";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  language = "english",
  onLanguageChange,
  boardLanguage = "english",
  onBoardLanguageChange,
  isLanguageLocked = false,
  onNewSession,
  isLoggedIn = false,
  isCanvasActive = false,
  onToggleCanvas,
}: BottomDockProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const voiceRef = useRef<HTMLDivElement>(null);
  const subModeRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<"voice" | "language" | "board" | null>(null);
  const [langLockDialogOpen, setLangLockDialogOpen] = useState(false);
  const [subModeOpen, setSubModeOpen] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(getSavedVoiceId);
  const [selectedHinglishVoice, setSelectedHinglishVoice] = useState(getSavedHinglishVoiceId);
  const [openPlatform, setOpenPlatform] = useState<"google" | "elevenlabs" | "sai" | "azure" | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);

  const isIndic = language === "hinglish" || language === "hindi";
  const activeSelectedId = isIndic ? selectedHinglishVoice : selectedVoice;

  const allVoices = [
    ...PRESET_VOICES, ...HINGLISH_VOICES_EL, ...HINGLISH_VOICES_SAI,
    ...GOOGLE_VOICES_EN, ...GOOGLE_VOICES_HI,
    ...AZURE_VOICES_EN, ...AZURE_VOICES_HI,
  ];
  const currentVoice = allVoices.find(v => v.id === activeSelectedId);

  const stopPreview = () => {
    if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null; }
    setPreviewingVoiceId(null);
  };

  const handlePreview = (voiceId: string, filename: string) => {
    if (previewingVoiceId === voiceId) { stopPreview(); return; }
    stopPreview();
    setPreviewingVoiceId(voiceId);
    const audio = new Audio(`/voice-previews/${filename}.mp3`);
    previewAudioRef.current = audio;
    const clear = () => { if (previewAudioRef.current === audio) { previewAudioRef.current = null; setPreviewingVoiceId(null); } };
    audio.onended = clear;
    audio.onerror = clear;
    audio.play().catch(clear);
  };

  const selectVoice = (id: string) => {
    stopPreview();
    if (language === "hinglish" || language === "hindi") {
      saveHinglishVoiceId(id);
      setSelectedHinglishVoice(id);
    } else {
      saveVoiceId(id);
      setSelectedVoice(id);
    }
    setOpen(false);
    setHovered(null);
    setOpenPlatform(null);
  };

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (!voiceRef.current?.contains(e.target as Node)) { stopPreview(); setOpen(false); setHovered(null); }
      if (!subModeRef.current?.contains(e.target as Node)) setSubModeOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  useEffect(() => () => stopPreview(), []);

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
    <>
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
        <div className="flex shrink-0 items-center gap-0.5">
          <motion.button
            type="button"
            whileTap={{ scale: isAttachmentUploading ? 1 : 0.85 }}
            onClick={() => !isAttachmentUploading && fileRef.current?.click()}
            disabled={disabled || isAttachmentUploading}
            aria-label={isAttachmentUploading ? "Uploading…" : "Upload image or PDF"}
            title={isAttachmentUploading ? "Uploading file…" : undefined}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/35 transition-all hover:bg-white/8 hover:text-white/65 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAttachmentUploading
              ? <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
              : <Paperclip className="h-4 w-4" />
            }
          </motion.button>

          {/* Canvas toggle — desktop only */}
          {onToggleCanvas && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={onToggleCanvas}
              aria-label={isCanvasActive ? "Exit drawing mode" : "Draw on board"}
              title={isCanvasActive ? "Exit drawing mode" : "Draw on board"}
              className={`max-[767px]:hidden flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                isCanvasActive
                  ? "bg-blue-400/30 text-blue-400 hover:bg-blue-400/40"
                  : "text-white/35 hover:bg-white/8 hover:text-white/65"
              }`}
            >
              <PencilLine className="h-4 w-4" />
            </motion.button>
          )}
        </div>

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
            placeholder={typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches ? "Ask anything…" : placeholder}
            disabled={disabled}
            className="resize-none overflow-hidden bg-transparent py-1.5 text-sm leading-relaxed text-white placeholder:text-white/30 focus:outline-none disabled:opacity-35"
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
              <span className="text-[11px] font-semibold">{subMode === "3d" ? "3D" : subMode === "2d" ? "2D" : "Gen"}</span>
              <ChevronDown className={`hidden sm:block h-3 w-3 transition-transform ${subModeOpen ? "rotate-180" : ""}`} />
            </motion.button>
            {subModeOpen && (
              <div className="absolute bottom-full left-0 mb-2 z-50 w-52 rounded-xl overflow-hidden"
                style={{ background: "rgba(18,18,18,0.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 -8px 32px rgba(0,0,0,0.6)" }}
              >
                {/* General */}
                <button onClick={() => { onSubModeChange?.("general"); setSubModeOpen(false); }}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-white/8"
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white/90">General</p>
                    <span className="text-[11px] text-white/35">text & math</span>
                  </div>
                  {subMode === "general" && <Check size={13} className="text-emerald-400" />}
                </button>
                {/* Experimental with 2D/3D toggle */}
                <div className="px-3 py-2 hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                      {(["2d", "3d"] as const).map(m => (
                        <button key={m} onClick={(e) => { e.stopPropagation(); onSubModeChange?.(m); setSubModeOpen(false); }}
                          className={`px-2.5 py-1 text-[11px] font-bold transition-all ${subMode === m ? "bg-white/20 text-white" : "text-white/35 hover:text-white/60"}`}
                        >{m.toUpperCase()}</button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-amber-500/20 text-amber-400">Beta</span>
                      {(subMode === "2d" || subMode === "3d") && <Check size={13} className="text-emerald-400" />}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Voice + Language picker */}
        <div ref={voiceRef} className={`relative shrink-0 ${disabled ? "opacity-30 pointer-events-none" : ""}`}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.85 }}
            onClick={() => { setOpen(o => !o); setHovered(null); }}
            className="flex h-9 items-center gap-1 rounded-xl px-2 text-white/35 transition-all hover:bg-white/8 hover:text-white/65"
          >
            <AudioLines className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline text-[11px] font-semibold">
              {currentVoice?.name ?? "Voice"}
              {language === "hinglish" && <span className="ml-1 text-orange-400">· HI</span>}
              {language === "hindi" && <span className="ml-1 text-orange-400">· हि</span>}
            </span>
            {/* language indicator only — visible on mobile when name is hidden */}
            {(language === "hinglish" || language === "hindi") && (
              <span className="sm:hidden text-[10px] font-bold text-orange-400">
                {language === "hinglish" ? "HI" : "हि"}
              </span>
            )}
            <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
          </motion.button>

          {open && (
            <div className="absolute bottom-full right-0 mb-2 z-50 w-48 rounded-xl overflow-hidden bg-white/95 dark:bg-neutral-900/95 border border-black/8 dark:border-white/10 shadow-xl dark:shadow-[0_-8px_32px_rgba(0,0,0,0.6)]"
              style={{ backdropFilter: "blur(20px)" }}
            >
              {/* Voice — top row */}
              <button
                onClick={() => setHovered(h => h === "voice" ? null : "voice")}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/8"
              >
                <div className="flex items-center gap-2">
                  <AudioLines size={13} className="text-neutral-400 dark:text-white/40" />
                  <div>
                    <p className="text-sm font-semibold text-neutral-800 dark:text-white/90">Voice</p>
                    <p className="text-[11px] text-neutral-500 dark:text-white/35">{currentVoice?.name ?? "—"}</p>
                  </div>
                </div>
                <ChevronDown size={13} className={`text-neutral-400 dark:text-white/30 transition-transform ${hovered === "voice" ? "rotate-180" : ""}`} />
              </button>

              {hovered === "voice" && (
                <div className="border-t border-black/8 dark:border-white/5">

                  {/* ── Google TTS ── */}
                  <button
                    onClick={() => setOpenPlatform(p => p === "google" ? null : "google")}
                    className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/8"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">G</span>
                      <p className="text-sm font-semibold text-neutral-700 dark:text-white/80">Google TTS</p>
                    </div>
                    <ChevronDown size={12} className={`text-neutral-400 dark:text-white/30 transition-transform ${openPlatform === "google" ? "rotate-180" : ""}`} />
                  </button>
                  {openPlatform === "google" && (
                    <div className="border-t border-black/8 dark:border-white/5">
                      {(isIndic ? GOOGLE_VOICES_HI : GOOGLE_VOICES_EN).map(v => (
                        <div key={v.id} className="flex items-center transition-colors hover:bg-black/5 dark:hover:bg-white/8">
                          <button onClick={() => selectVoice(v.id)} className="flex flex-1 items-center justify-between pl-5 pr-2 py-2 text-left">
                            <div>
                              <p className="text-sm font-semibold text-neutral-700 dark:text-white/80">{v.name}</p>
                              <p className="text-[11px] text-neutral-500 dark:text-white/35">{v.desc}</p>
                            </div>
                            {activeSelectedId === v.id &&<Check size={13} className="shrink-0 text-emerald-400 ml-1" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── ElevenLabs ── */}
                  <button
                    onClick={() => setOpenPlatform(p => p === "elevenlabs" ? null : "elevenlabs")}
                    className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/8 border-t border-black/8 dark:border-white/5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">EL</span>
                      <p className="text-sm font-semibold text-neutral-700 dark:text-white/80">ElevenLabs</p>
                    </div>
                    <ChevronDown size={12} className={`text-neutral-400 dark:text-white/30 transition-transform ${openPlatform === "elevenlabs" ? "rotate-180" : ""}`} />
                  </button>
                  {openPlatform === "elevenlabs" && (
                    <div className="border-t border-black/8 dark:border-white/5">
                      {(isIndic ? HINGLISH_VOICES_EL : PRESET_VOICES).map(v => {
                        const isPreviewing = previewingVoiceId === v.id;
                        return (
                          <div key={v.id} className="flex items-center transition-colors hover:bg-black/5 dark:hover:bg-white/8">
                            <button onClick={() => selectVoice(v.id)} className="flex flex-1 items-center justify-between pl-5 pr-1 py-2 text-left">
                              <div>
                                <p className="text-sm font-semibold text-neutral-700 dark:text-white/80">{v.name}</p>
                                <p className="text-[11px] text-neutral-500 dark:text-white/35">{v.desc}</p>
                              </div>
                              {activeSelectedId === v.id &&<Check size={13} className="shrink-0 text-emerald-400 ml-1" />}
                            </button>
                            {isLoggedIn && "preview" in v && (
                              <button onClick={(e) => { e.stopPropagation(); handlePreview(v.id, (v as any).preview); }}
                                className="shrink-0 px-2.5 py-2 text-neutral-400 dark:text-white/25 hover:text-neutral-600 dark:hover:text-white/70 transition-colors"
                              >
                                {isPreviewing ? <Square size={10} className="fill-current text-emerald-400" /> : <Play size={10} className="fill-current" />}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ── Azure Neural HD ── */}
                  <button
                    onClick={() => setOpenPlatform(p => p === "azure" ? null : "azure")}
                    className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/8 border-t border-black/8 dark:border-white/5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400">AZ</span>
                      <p className="text-sm font-semibold text-neutral-700 dark:text-white/80">Azure</p>
                    </div>
                    <ChevronDown size={12} className={`text-neutral-400 dark:text-white/30 transition-transform ${openPlatform === "azure" ? "rotate-180" : ""}`} />
                  </button>
                  {openPlatform === "azure" && (
                    <div className="border-t border-black/8 dark:border-white/5">
                      {(isIndic ? AZURE_VOICES_HI : AZURE_VOICES_EN).map(v => (
                        <div key={v.id} className="flex items-center transition-colors hover:bg-black/5 dark:hover:bg-white/8">
                          <button onClick={() => selectVoice(v.id)} className="flex flex-1 items-center justify-between pl-5 pr-2 py-2 text-left">
                            <div>
                              <p className="text-sm font-semibold text-neutral-700 dark:text-white/80">{v.name}</p>
                              <p className="text-[11px] text-neutral-500 dark:text-white/35">{v.desc}</p>
                            </div>
                            {activeSelectedId === v.id && <Check size={13} className="shrink-0 text-emerald-400 ml-1" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Smallest AI (Hinglish only) ── */}
                  {isIndic && (
                    <>
                      <button
                        onClick={() => setOpenPlatform(p => p === "sai" ? null : "sai")}
                        className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/8 border-t border-black/8 dark:border-white/5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">SAI</span>
                          <p className="text-sm font-semibold text-neutral-700 dark:text-white/80">Smallest AI</p>
                        </div>
                        <ChevronDown size={12} className={`text-neutral-400 dark:text-white/30 transition-transform ${openPlatform === "sai" ? "rotate-180" : ""}`} />
                      </button>
                      {openPlatform === "sai" && (
                        <div className="border-t border-black/8 dark:border-white/5">
                          {HINGLISH_VOICES_SAI.map(v => (
                            <div key={v.id} className="flex items-center transition-colors hover:bg-black/5 dark:hover:bg-white/8">
                              <button onClick={() => selectVoice(v.id)} className="flex flex-1 items-center justify-between pl-5 pr-2 py-2 text-left">
                                <div>
                                  <p className="text-sm font-semibold text-white/80">{v.name}</p>
                                  <p className="text-[11px] text-white/35">{v.desc}</p>
                                </div>
                                {activeSelectedId === v.id &&<Check size={13} className="shrink-0 text-emerald-400 ml-1" />}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                </div>
              )}

              {/* Language */}
              <button
                onClick={() => isLanguageLocked ? setLangLockDialogOpen(true) : setHovered(h => h === "language" ? null : "language")}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/8"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px]">🌐</span>
                  <div>
                    <p className="text-sm font-semibold text-neutral-800 dark:text-white/90">Language</p>
                    <p className="text-[11px] text-neutral-500 dark:text-white/35">{language === "hinglish" ? "Hinglish" : language === "hindi" ? "Hindi" : "English"}</p>
                  </div>
                </div>
                <ChevronDown size={13} className={`text-neutral-400 dark:text-white/30 transition-transform ${hovered === "language" ? "rotate-180" : ""}`} />
              </button>
              {hovered === "language" && (
                <div className="border-t border-black/8 dark:border-white/5">
                  {([
                    { id: "english",  label: "English",  desc: "Speak in English" },
                    { id: "hinglish", label: "Hinglish", desc: "Hindi + English terms" },
                    { id: "hindi",    label: "Hindi",    desc: "Pure Hindi Devanagari" },
                  ] as const).map(l => (
                    <button key={l.id} onClick={() => { onLanguageChange?.(l.id); setOpen(false); setHovered(null); }}
                      className="flex w-full items-center justify-between pl-4 pr-3 py-2 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/8"
                    >
                      <div>
                        <p className="text-sm font-semibold text-neutral-700 dark:text-white/80">{l.label}</p>
                        <p className="text-[11px] text-neutral-500 dark:text-white/35">{l.desc}</p>
                      </div>
                      {language === l.id && <Check size={13} className="shrink-0 text-orange-400" />}
                    </button>
                  ))}
                </div>
              )}

              {/* Board */}
              <button
                onClick={() => isLanguageLocked ? setLangLockDialogOpen(true) : setHovered(h => h === "board" ? null : "board")}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/8"
              >
                <div className="flex items-center gap-2">
                  <LayoutGrid size={13} className="text-neutral-400 dark:text-white/40" />
                  <div>
                    <p className="text-sm font-semibold text-neutral-800 dark:text-white/90">Board</p>
                    <p className="text-[11px] text-neutral-500 dark:text-white/35">{boardLanguage === "hinglish" ? "Hinglish" : boardLanguage === "hindi" ? "Hindi" : "English"}</p>
                  </div>
                </div>
                <ChevronDown size={13} className={`text-neutral-400 dark:text-white/30 transition-transform ${hovered === "board" ? "rotate-180" : ""}`} />
              </button>
              {hovered === "board" && (
                <div className="border-t border-black/8 dark:border-white/5">
                  {([
                    { id: "english",  label: "English",  desc: "Board content in English" },
                    { id: "hinglish", label: "Hinglish", desc: "Terms English · text Hindi" },
                    { id: "hindi",    label: "Hindi",    desc: "Board content in Devanagari" },
                  ] as const).map(l => (
                    <button key={l.id} onClick={() => { onBoardLanguageChange?.(l.id); setOpen(false); setHovered(null); }}
                      className="flex w-full items-center justify-between pl-4 pr-3 py-2 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/8"
                    >
                      <div>
                        <p className="text-sm font-semibold text-neutral-700 dark:text-white/80">{l.label}</p>
                        <p className="text-[11px] text-neutral-500 dark:text-white/35">{l.desc}</p>
                      </div>
                      {boardLanguage === l.id && <Check size={13} className="shrink-0 text-violet-400" />}
                    </button>
                  ))}
                </div>
              )}
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

    <AlertDialog open={langLockDialogOpen} onOpenChange={setLangLockDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Language is locked for this session</AlertDialogTitle>
          <AlertDialogDescription>
            Language and board settings can't be changed mid-session. Start a new session to use a different language.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => { setLangLockDialogOpen(false); setOpen(false); onNewSession?.(); }}>
            New Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
