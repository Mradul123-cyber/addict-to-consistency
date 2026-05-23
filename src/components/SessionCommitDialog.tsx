import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addSession } from "@/lib/store";
import { isoDay } from "@/lib/analytics";

export function SessionCommitDialog({
  open,
  plannedMinutes,
  chapterId,
  onClose,
}: {
  open: boolean;
  plannedMinutes: number;
  chapterId: string | null;
  onClose: () => void;
}) {
  const [minutes, setMinutes] = useState(plannedMinutes);
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(3);

  const save = () => {
    addSession({
      chapterId,
      dateISO: isoDay(new Date()),
      minutes: Math.max(0, Math.round(minutes)),
      focusRating: rating,
      source: "timer",
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Commit session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
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
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Discard
          </Button>
          <Button onClick={save}>Save session</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
