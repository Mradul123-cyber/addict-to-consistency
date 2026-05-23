import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const REMINDERS = [
  "The urge is a wave. Let it pass — don't paddle.",
  "Closing this tab won't fix the problem behind it.",
  "Your future self at the JEE hall is watching this moment.",
  "Boredom is the doorway to deep work.",
];

export function UrgeSurfer() {
  const [open, setOpen] = useState(false);
  const [remaining, setRemaining] = useState(90);
  const [reminder, setReminder] = useState(REMINDERS[0]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setRemaining(90);
      return;
    }
    setReminder(REMINDERS[Math.floor(Math.random() * REMINDERS.length)]);
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [open]);

  const phase = Math.floor((90 - remaining) / 4) % 2 === 0 ? "Inhale" : "Exhale";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Urge Surfer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Surf the urge — 90 seconds</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-4">
          <div
            className="flex h-40 w-40 items-center justify-center rounded-full bg-primary/15 text-primary transition-transform duration-[4000ms] ease-in-out"
            style={{ transform: phase === "Inhale" ? "scale(1.2)" : "scale(0.8)" }}
          >
            <span className="text-lg font-medium">{phase}</span>
          </div>
          <div className="text-3xl font-semibold tabular-nums">{remaining}s</div>
          <p className="text-center text-sm text-muted-foreground">{reminder}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
