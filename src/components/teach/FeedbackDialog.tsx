import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { saveTeachFeedback } from "@/lib/teach-quota";

const FEEDBACK_OPTIONS = [
  "Explanations were clear",
  "Diagrams helped me understand",
  "Too many / unnecessary diagrams",
  "Answers felt rushed or shallow",
  "I want more practice problems",
  "I'd pay / use this regularly",
];

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uid: string | null;
  promptCount: number;
}

export function FeedbackDialog({ open, onOpenChange, uid, promptCount }: FeedbackDialogProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggle = (opt: string) => {
    setSelected((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );
  };

  const submit = async () => {
    if (!uid) {
      toast.error("You need to be signed in to send feedback.");
      return;
    }
    setSubmitting(true);
    try {
      await saveTeachFeedback(uid, {
        reasons: selected,
        comment: comment.trim() || undefined,
        promptCount,
      });
      toast.success("Thanks — your feedback was saved.");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Could not save feedback. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>You've used all 5 free prompts</DialogTitle>
          <DialogDescription>
            Help us shape the AI teacher — pick what fits and add a note if you'd like.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {FEEDBACK_OPTIONS.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted"
            >
              <Checkbox
                checked={selected.includes(opt)}
                onCheckedChange={() => toggle(opt)}
                className="mt-0.5"
              />
              <span className="text-sm leading-tight">{opt}</span>
            </label>
          ))}

          <Textarea
            placeholder="Anything else? (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={500}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Skip
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Saving…" : "Send feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
