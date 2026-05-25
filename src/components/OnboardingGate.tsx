import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import {
  DAILY_GOAL_OPTIONS,
  DEFAULT_DAILY_GOAL_MINUTES,
  MAX_DAILY_GOAL_MINUTES,
  MIN_DAILY_GOAL_MINUTES,
  JEE_TARGET_YEARS,
  type JeeTargetYear,
} from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export function OnboardingModal() {
  const { saveProfile } = useProfile();
  const [selectedYear, setSelectedYear] = useState<JeeTargetYear>(2027);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(DEFAULT_DAILY_GOAL_MINUTES);
  const [dailyGoalMode, setDailyGoalMode] = useState("150");
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (dailyGoalMinutes < MIN_DAILY_GOAL_MINUTES || dailyGoalMinutes > MAX_DAILY_GOAL_MINUTES) {
      toast.error(`Daily goal must be between ${MIN_DAILY_GOAL_MINUTES} and ${MAX_DAILY_GOAL_MINUTES} minutes.`);
      return;
    }

    setSaving(true);
    try {
      await saveProfile({ targetYear: selectedYear, dailyGoalMinutes });
      toast.success(`Your JEE ${selectedYear} countdown is ready.`);
    } catch (err) {
      console.error("Failed to save profile:", err);
      toast.error("Could not save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background px-4">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)]" />
      <div className="absolute top-1/4 left-1/4 -z-10 h-[50vw] w-[50vw] rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-[50vw] w-[50vw] rounded-full bg-violet-500/10 blur-[120px]" />

      <div className="w-full max-w-md space-y-6 rounded-xl border border-border/80 bg-card/80 p-8 shadow-2xl backdrop-blur-xl">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Welcome to JEE Console</h1>
          <p className="text-sm text-muted-foreground">
            Set your target exam year and daily focus goal so we can personalize your dashboard.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="jee-year">When is your JEE?</Label>
          <Select
            value={String(selectedYear)}
            onValueChange={(value) => setSelectedYear(Number(value) as JeeTargetYear)}
            disabled={saving}
          >
            <SelectTrigger id="jee-year" className="w-full">
              <SelectValue placeholder="Select exam year" />
            </SelectTrigger>
            <SelectContent>
              {JEE_TARGET_YEARS.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  JEE {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Your countdown will target 20 January {selectedYear}.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="daily-goal">Daily focus goal</Label>
          <Select
            value={dailyGoalMode}
            onValueChange={(value) => {
              setDailyGoalMode(value);
              if (value !== "custom") setDailyGoalMinutes(Number(value));
            }}
            disabled={saving}
          >
            <SelectTrigger id="daily-goal" className="w-full">
              <SelectValue placeholder="Select daily goal" />
            </SelectTrigger>
            <SelectContent>
              {DAILY_GOAL_OPTIONS.map((minutes) => (
                <SelectItem key={minutes} value={String(minutes)}>
                  {minutes} minutes/day
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          {dailyGoalMode === "custom" && (
            <Input
              type="number"
              min={MIN_DAILY_GOAL_MINUTES}
              max={MAX_DAILY_GOAL_MINUTES}
              value={dailyGoalMinutes}
              onChange={(e) => setDailyGoalMinutes(Number(e.target.value))}
              disabled={saving}
            />
          )}
        </div>

        <Button className="w-full" onClick={() => void handleConfirm()} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Continue to dashboard"
          )}
        </Button>
      </div>
    </div>
  );
}

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return <OnboardingModal />;
  }

  return <>{children}</>;
}
