import { Bookmark, Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  expr: string;
  label?: string;
  bookmarked: boolean;
  highlighted?: boolean;
  onToggleBookmark: () => void;
}

export function FormulaBlock({ expr, label, bookmarked, highlighted, onToggleBookmark }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(expr);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div
      className={cn(
        "group relative my-3 rounded-lg border border-border bg-formula px-4 py-3 transition-colors hover:border-accent/50",
        highlighted && "animate-bookmark-flash",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {label && (
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
          )}
          <code className="block break-words font-mono text-[15px] leading-relaxed text-formula-foreground">
            {expr}
          </code>
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={onToggleBookmark}
            aria-label="Bookmark formula"
            className={cn(
              "rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-accent",
              bookmarked && "text-accent opacity-100",
            )}
          >
            <Bookmark className={cn("h-4 w-4", bookmarked && "fill-current")} />
          </button>
          <button
            type="button"
            onClick={copy}
            aria-label="Copy formula"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
          >
            {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        {bookmarked && (
          <div className="absolute right-2 top-2 opacity-100 group-hover:hidden">
            <Bookmark className="h-3.5 w-3.5 fill-accent text-accent" />
          </div>
        )}
      </div>
    </div>
  );
}
