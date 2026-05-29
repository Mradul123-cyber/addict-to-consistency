import { useRef } from "react";
import { motion } from "framer-motion";
import { FileText, ImageIcon, Mic, MicOff, Paperclip, SendHorizonal, X } from "lucide-react";
import type { BottomDockProps } from "@/types/teach";

export function BottomDock({
  inputState,
  actions,
  attachments,
  onInputChange,
  disabled = false,
  placeholder = "Ask anything about this concept…",
}: BottomDockProps) {
  const fileRef = useRef<HTMLInputElement>(null);

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
