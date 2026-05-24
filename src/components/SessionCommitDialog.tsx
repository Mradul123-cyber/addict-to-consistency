import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  addSession,
  type DriftClassification,
  type DriftDomainVisit,
  type DriftSummary,
} from "@/lib/store";
import { isoDay } from "@/lib/analytics";
import { useAirgap } from "@/hooks/useAirgap";

/** Use a full-height sheet when the per-site list would overcrowd the dialog. */
const SHEET_SITE_THRESHOLD = 5;

function classificationLabel(c: DriftClassification): string {
  if (c === "healthy") return "Healthy";
  if (c === "distraction") return "Distraction";
  return "Neutral";
}

function classificationBadgeClass(c: DriftClassification): string {
  if (c === "healthy") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  }
  if (c === "distraction") {
    return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
}

function mergeDomainVisits(topDomains: DriftDomainVisit[], neutralDomains: string[]): DriftDomainVisit[] {
  const map = new Map<string, DriftDomainVisit>();
  for (const entry of topDomains) {
    map.set(entry.domain, entry);
  }
  for (const domain of neutralDomains) {
    if (!map.has(domain)) {
      map.set(domain, { domain, minutes: 0, classification: "neutral" });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.minutes - a.minutes);
}

function formatSiteMinutes(minutes: number): string {
  if (minutes < 0.1) return "<0.1m";
  if (minutes < 1) return `${minutes.toFixed(1)}m`;
  return `${Math.round(minutes * 10) / 10}m`;
}

function DriftSummarySection({
  driftSummary,
  resolvedDomains,
  onResolveNeutral,
}: {
  driftSummary: DriftSummary;
  resolvedDomains: Record<string, "healthy" | "distraction">;
  onResolveNeutral: (domain: string, choice: "healthy" | "distraction") => void;
}) {
  const siteVisits = useMemo(
    () => mergeDomainVisits(driftSummary.topDomains ?? [], driftSummary.neutralDomains),
    [driftSummary],
  );

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-400">
          ✅ {driftSummary.healthyMinutes}m focused
        </span>
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-400">
          ⚠️ {driftSummary.neutralMinutes}m neutral
        </span>
        <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-red-700 dark:text-red-400">
          ❌ {driftSummary.distractionMinutes}m distraction
        </span>
      </div>

      {siteVisits.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sites during this session
          </p>
          <ul className="divide-y rounded-md border bg-background/80">
            {siteVisits.map((entry) => {
              const resolved = resolvedDomains[entry.domain];
              const isNeutral = entry.classification === "neutral";
              return (
                <li key={entry.domain} className="space-y-2 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{entry.domain}</p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {formatSiteMinutes(entry.minutes)} on this site
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[10px] ${classificationBadgeClass(entry.classification)}`}
                    >
                      {classificationLabel(entry.classification)}
                    </Badge>
                  </div>

                  {isNeutral && (
                    <div className="rounded-md border border-dashed border-border/80 bg-muted/20 p-2.5">
                      {resolved ? (
                        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                          <Check className="h-3.5 w-3.5" />
                          Marked as {resolved === "healthy" ? "healthy" : "distraction"} for next time
                        </div>
                      ) : (
                        <>
                          <p className="mb-2 text-xs text-muted-foreground">
                            Call it honestly — this is your JEE journey:
                          </p>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => onResolveNeutral(entry.domain, "healthy")}
                            >
                              Healthy
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => onResolveNeutral(entry.domain, "distraction")}
                            >
                              Distraction
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          No other browser tabs were recorded during this session.
        </p>
      )}
    </div>
  );
}

function CommitFormBody({
  minutes,
  setMinutes,
  rating,
  setRating,
  driftSummary,
  showDriftSummary,
  resolvedDomains,
  onResolveNeutral,
  listScrollable,
}: {
  minutes: number;
  setMinutes: (n: number) => void;
  rating: 1 | 2 | 3 | 4 | 5;
  setRating: (n: 1 | 2 | 3 | 4 | 5) => void;
  driftSummary: DriftSummary | null | undefined;
  showDriftSummary: boolean;
  resolvedDomains: Record<string, "healthy" | "distraction">;
  onResolveNeutral: (domain: string, choice: "healthy" | "distraction") => void;
  listScrollable?: boolean;
}) {
  const driftBlock =
    showDriftSummary && driftSummary ? (
      <div className={listScrollable ? "max-h-[50vh] overflow-y-auto pr-1" : undefined}>
        <DriftSummarySection
          driftSummary={driftSummary}
          resolvedDomains={resolvedDomains}
          onResolveNeutral={onResolveNeutral}
        />
      </div>
    ) : null;

  return (
    <div className="space-y-4 py-2">
      {driftBlock}

      <div className="space-y-2">
        <Label htmlFor="mins">Actual minutes studied</Label>
        <Input
          id="mins"
          type="number"
          min={0}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
        />
      </div>
      <div className="space-y-2">
        <Label>Focus rating</Label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <Button
              key={n}
              type="button"
              variant={rating === n ? "default" : "outline"}
              size="sm"
              onClick={() => setRating(n as 1 | 2 | 3 | 4 | 5)}
              className="w-12"
            >
              {n}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SessionCommitDialog({
  open,
  plannedMinutes,
  chapterId,
  driftSummary,
  onClose,
}: {
  open: boolean;
  plannedMinutes: number;
  chapterId: string | null;
  driftSummary?: DriftSummary | null;
  onClose: () => void;
}) {
  const { isExtensionReady, addHealthySiteEntry, addBlocklistEntry } = useAirgap();
  const [minutes, setMinutes] = useState(plannedMinutes);
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [resolvedDomains, setResolvedDomains] = useState<Record<string, "healthy" | "distraction">>(
    {},
  );

  useEffect(() => {
    if (open) {
      setMinutes(plannedMinutes);
      setResolvedDomains({});
    }
  }, [open, plannedMinutes]);

  const showDriftSummary = Boolean(driftSummary && isExtensionReady);

  const siteCount = useMemo(() => {
    if (!driftSummary) return 0;
    return mergeDomainVisits(driftSummary.topDomains ?? [], driftSummary.neutralDomains).length;
  }, [driftSummary]);

  const useSheet = showDriftSummary && siteCount > SHEET_SITE_THRESHOLD;

  const resolveNeutral = async (domain: string, choice: "healthy" | "distraction") => {
    if (choice === "healthy") {
      await addHealthySiteEntry(domain);
    } else {
      await addBlocklistEntry(domain);
    }
    setResolvedDomains((prev) => ({ ...prev, [domain]: choice }));
  };

  const save = () => {
    addSession({
      chapterId,
      dateISO: isoDay(new Date()),
      minutes: Math.max(0, Math.round(minutes)),
      focusRating: rating,
      source: "timer",
      ...(driftSummary ? { driftSummary } : {}),
    });
    onClose();
  };

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>
        Discard
      </Button>
      <Button onClick={save}>Save session</Button>
    </>
  );

  const bodyProps = {
    minutes,
    setMinutes,
    rating,
    setRating,
    driftSummary,
    showDriftSummary,
    resolvedDomains,
    onResolveNeutral: (domain: string, choice: "healthy" | "distraction") => {
      void resolveNeutral(domain, choice);
    },
    listScrollable: !useSheet && siteCount > 3,
  };

  if (useSheet) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="bottom" className="flex max-h-[92vh] flex-col gap-0 rounded-t-xl px-4 pb-6">
          <SheetHeader className="shrink-0 pb-4 text-left">
            <SheetTitle>Commit session</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <CommitFormBody {...bodyProps} listScrollable={false} />
          </div>
          <SheetFooter className="mt-4 shrink-0 border-t pt-4 sm:justify-end">{footer}</SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={showDriftSummary && siteCount > 3 ? "max-h-[90vh] overflow-y-auto sm:max-w-md" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle>Commit session</DialogTitle>
        </DialogHeader>
        <CommitFormBody {...bodyProps} />
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
