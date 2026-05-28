import { motion } from "framer-motion";
import { AlertCircle, RotateCcw } from "lucide-react";

interface ErrorCardProps {
  message: string;
  onRetry: () => void;
}

export function ErrorCard({ message, onRetry }: ErrorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/5 p-5 text-left shadow-[0_4px_24px_rgba(239,68,68,0.08)] backdrop-blur-sm max-w-4xl mx-auto"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-red-200">
            Connection Error
          </span>
          <span className="text-xs text-red-300/80 leading-relaxed">
            {message}
          </span>
        </div>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-4 py-2 text-xs font-bold text-red-200 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
      >
        <RotateCcw size={14} className="animate-pulse" />
        Retry Attempt
      </button>
    </motion.div>
  );
}
