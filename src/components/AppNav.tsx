import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import {
  canChangeDailyGoal,
  DAILY_GOAL_OPTIONS,
  DEFAULT_DAILY_GOAL_MINUTES,

  daysUntilExam,
  MAX_DAILY_GOAL_MINUTES,
  MIN_DAILY_GOAL_MINUTES,
  nextDailyGoalChangeDate,
} from "@/lib/profile";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAirgap } from "@/hooks/useAirgap";
import { useTheme } from "@/hooks/useTheme";
import { useNotesChrome } from "@/contexts/NotesChromeContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bookmark, ChevronDown, ClipboardList, Download, LogOut, Menu, Moon, Shield, Sparkles, Sun, Target, X } from "lucide-react";
import { isInstalledPwa, subscribePwaInstall, triggerInstallPrompt } from "@/lib/pwa-install";

/** Chromium PWA install prompt (not available on iOS Safari). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isIOSDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}


const JEE_LINKS = [
  { to: "/", label: "Dashboard" },
  { to: "/notes", label: "Notes" },
  { to: "/focus", label: "Focus" },
  { to: "/airgap", label: "Airgap" },
  { to: "/matrix", label: "Tracks" },
  { to: "/teach", label: "Studio" },
] as const;

const PRO_LINKS = [
  { to: "/teach", label: "Studio" },
  { to: "/focus", label: "Focus" },
  { to: "/airgap", label: "Airgap" },
] as const;

const navLinkClass =
  "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
const navLinkActiveClass = "bg-accent text-foreground font-medium";

/** Returns the 1–2 initial letters to show in the avatar fallback */
function getInitials(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email ? email[0].toUpperCase() : "?";
}

export function AppNav() {
  useStore();
  const { profile, targetDate, saveDailyGoalMinutes, saveProfile } = useProfile();
  const isPro = profile?.mode === "professional";
  const links = isPro ? PRO_LINKS : JEE_LINKS;
  const days = targetDate ? daysUntilExam(targetDate) : 0;
  const { user, signOut } = useAuth();
  const { isOn, isExtensionReady } = useAirgap();
  const { isDark, toggleTheme } = useTheme();
  const isNotesRoute = useRouterState({
    select: (s) => s.location.pathname.startsWith("/notes"),
  });
  const isStudioRoute = useRouterState({
    select: (s) => s.location.pathname === "/teach",
  });
  const { bookmarkCount, openBookmarks } = useNotesChrome();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const [customGoalOpen, setCustomGoalOpen] = useState(false);
  const [goalExpanded, setGoalExpanded] = useState(false);
  const [customGoalValue, setCustomGoalValue] = useState("");
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const todayStr = new Date().toISOString().slice(0, 10);

  const [taskNotif, setTaskNotif] = useState<string[]>(() => {
    try {
      const tasks = JSON.parse(localStorage.getItem("calendar-tasks") ?? "{}");
      return (tasks[todayStr] ?? []).filter((t: any) => !t.done).map((t: any) => t.text);
    } catch { return []; }
  });
  const [showTaskNotif, setShowTaskNotif] = useState(() => {
    return localStorage.getItem("taskNotifMutedDate") !== todayStr;
  });
  const [lockedHovered, setLockedHovered] = useState(false);

  const iosInstallMessage =
    "Tap the Share icon in Safari (square with arrow), then choose \"Add to Home Screen\" to install Matrix on your home screen.";

  const desktopInstallFallbackMessage =
    "If no install dialog appeared: in Chrome or Edge, open the menu (⋮) or look for an install icon in the address bar, then choose \"Install\" or \"Install Matrix\".";

    useEffect(() => {
      const sync = () => {
        setIsInstalled(isInstalledPwa());
      };
      sync();
      return subscribePwaInstall(sync);
    }, []);

  const handleInstallClick = async () => {
    if (isIOSDevice()) {
      setInstallHelpOpen(true);
      return;
    }

    const outcome = await triggerInstallPrompt();
    if (outcome === "accepted") {
      setIsInstalled(true);
      toast.success("Matrix installed!");
    } else if (outcome === "dismissed") {
      toast.message("Install dismissed", {
        description: "You can install anytime from the profile menu.",
      });
    } else {
      setInstallHelpOpen(true);
      toast.info("Install instructions", {
        description: desktopInstallFallbackMessage,
        duration: 8000,
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error("Sign out failed", err);
    }
  };

  const initials = user ? getInitials(user.displayName, user.email) : "";
  const photoURL = user?.photoURL ?? null;
  const dailyGoalMinutes = profile?.dailyGoalMinutes ?? DEFAULT_DAILY_GOAL_MINUTES;
  const goalCanChange = canChangeDailyGoal(profile?.dailyGoalChangedAt);
  const nextGoalChangeDate = nextDailyGoalChangeDate(profile?.dailyGoalChangedAt);
  const nextGoalChangeLabel = nextGoalChangeDate
    ? nextGoalChangeDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const handleDailyGoalChange = async (value: string) => {
    const minutes = Number(value);
    if (!Number.isFinite(minutes) || minutes === dailyGoalMinutes) return;
    if (!goalCanChange) {
      setLockedHovered(true);
      setTimeout(() => setLockedHovered(false), 500);
      return;
    }

    const toastId = toast.loading("Updating daily goal...");
    try {
      await saveDailyGoalMinutes(minutes);
      toast.success(`Daily goal updated to ${minutes} minutes.`, { id: toastId });
    } catch (err) {
      console.error("Daily goal update failed:", err);
      toast.error("Could not update daily goal", {
        id: toastId,
        description:
          err instanceof Error ? err.message : "Daily goal can only be changed once every 30 days.",
      });
    }
  };

  const openCustomGoalDialog = () => {
    if (!goalCanChange) {
      toast.warning("Daily goal is locked", {
        description: nextGoalChangeLabel
          ? `You can change it again on ${nextGoalChangeLabel}.`
          : "You can change it once every 30 days.",
      });
      return;
    }
    setCustomGoalValue(String(dailyGoalMinutes));
    setCustomGoalOpen(true);
  };

  const handleCustomGoalSubmit = async () => {
    const minutes = Number(customGoalValue);
    if (
      !Number.isFinite(minutes) ||
      minutes < MIN_DAILY_GOAL_MINUTES ||
      minutes > MAX_DAILY_GOAL_MINUTES
    ) {
      toast.error(
        `Daily goal must be between ${MIN_DAILY_GOAL_MINUTES} and ${MAX_DAILY_GOAL_MINUTES} minutes.`,
      );
      return;
    }

    setCustomGoalOpen(false);
    await handleDailyGoalChange(String(Math.round(minutes)));
  };

  return (
    <header className="border-b bg-card">
      {showTaskNotif && taskNotif.length > 0 && (
        <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card ring-1 ring-border/80 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-start gap-4 mb-5">
              <img src="/icons/bell.png" alt="" className="h-12 w-12 shrink-0" />
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-base font-bold text-foreground">Today's Tasks</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {taskNotif.length} task{taskNotif.length !== 1 ? "s" : ""} scheduled for today
                </p>
              </div>
            </div>
            <ul className={`space-y-3 mb-6 ${taskNotif.length === 1 ? "text-center" : ""}`}>
              {taskNotif.map((t, i) => (
                <li key={i} className="text-base font-bold text-foreground leading-snug"><span className="mr-2.5 text-foreground">•</span>{t}</li>
              ))}
            </ul>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowTaskNotif(false)}
                className="w-full py-2.5 rounded-md text-sm font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
              >
                Got it
              </button>
              <button
                onClick={() => { localStorage.setItem("taskNotifMutedDate", todayStr); setShowTaskNotif(false); }}
                className="w-full py-2 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Mute for today
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 md:gap-4">
        {/* Left: brand + desktop nav + mobile menu toggle */}
        <div className="flex min-w-0 items-center gap-2 md:gap-6">
          <Link
            to={isPro ? "/teach" : "/"}
            className="shrink-0 text-base font-semibold tracking-tight max-[529px]:max-w-[7.5rem] max-[529px]:truncate"
          >
            {isPro ? "Matrix" : "Matrix"}
          </Link>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 md:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                activeOptions={{ exact: l.to === "/" }}
                className={navLinkClass}
                activeProps={{ className: navLinkActiveClass }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: bookmarks (notes), theme, countdown, airgap, avatar */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          {isNotesRoute && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative h-9 w-9"
              aria-label="Saved formulas"
              onClick={openBookmarks}
            >
              <Bookmark className="h-4 w-4" />
              {bookmarkCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                  {bookmarkCount}
                </span>
              )}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden h-9 w-9 min-[530px]:inline-flex"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={toggleTheme}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {!isPro && (
            <div className="rounded-md border bg-background px-2 py-1.5 text-xs font-medium tabular-nums max-[529px]:px-1.5 max-[529px]:text-[10px] sm:px-3">
              <span className="text-muted-foreground">JEE {profile?.targetYear ?? "—"} · </span>
              <span className="text-foreground">{days} days</span>
            </div>
          )}

          <Link to="/airgap">
            <Badge
              variant={isExtensionReady ? (isOn ? "default" : "outline") : "secondary"}
              className="hidden min-[530px]:inline-flex cursor-pointer hover:opacity-80 transition-opacity"
            >
              Airgap {isExtensionReady ? (isOn ? "ON" : "OFF") : "Not detected"}
            </Badge>
          </Link>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  id="user-avatar-trigger"
                  className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full ring-2 ring-border ring-offset-1 ring-offset-background transition-all hover:ring-primary focus-visible:outline-none focus-visible:ring-primary"
                  aria-label="User menu"
                >
                  {photoURL ? (
                    <img
                      src={photoURL}
                      alt={user.displayName ?? "User avatar"}
                      className="h-9 w-9 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white select-none">
                      {initials}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-0.5 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-bold text-white">
                      {photoURL ? (
                        <img
                          src={photoURL}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold leading-tight text-foreground">
                        {user.displayName ?? "User"}
                      </p>
                      {user.email && (
                        <p className="truncate text-xs font-normal text-muted-foreground">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="cursor-pointer min-[530px]:hidden"
                  onClick={toggleTheme}
                >
                  {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  {isDark ? "Light mode" : "Dark mode"}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="min-[530px]:hidden" />

                {!isPro && (
                  <DropdownMenuItem asChild>
                    <Link to="/log" className="cursor-pointer">
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Log
                    </Link>
                  </DropdownMenuItem>
                )}


                <DropdownMenuSeparator />

                {!isInstalled && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={() => {
                      void handleInstallClick();
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Install Matrix
                  </DropdownMenuItem>
                )}

                {!isInstalled && <DropdownMenuSeparator />}

                {/* Daily goal — inline expandable, no side submenu */}
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={(e) => { e.preventDefault(); setGoalExpanded(o => !o); }}
                >
                  <Target className="mr-2 h-4 w-4" />
                  Daily goal
                  <span className="ml-1 rounded bg-muted px-1 text-xs text-muted-foreground">{dailyGoalMinutes}m</span>
                  <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform ${goalExpanded ? "rotate-180" : ""}`} />
                </DropdownMenuItem>
                {goalExpanded && (
                  <>
                    <DropdownMenuLabel className={`pl-8 text-xs font-normal transition-colors ${lockedHovered ? "text-red-500 animate-shake" : "text-muted-foreground"}`}>
                      {goalCanChange ? "Choose your daily goal" : `Locked until ${nextGoalChangeLabel ?? "30 days pass"}`}
                    </DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={String(dailyGoalMinutes)}
                      onValueChange={(value) => { void handleDailyGoalChange(value); setGoalExpanded(false); }}
                    >
                      {DAILY_GOAL_OPTIONS.map((minutes) => (
                        <DropdownMenuRadioItem
                          key={minutes}
                          value={String(minutes)}
                          className={`cursor-pointer pl-8 ${!goalCanChange && minutes !== dailyGoalMinutes ? "opacity-50" : ""}`}
                          onSelect={(e) => {
                            if (!goalCanChange && minutes !== dailyGoalMinutes) {
                              e.preventDefault();
                              setLockedHovered(true);
                              setTimeout(() => setLockedHovered(false), 500);
                            }
                          }}
                          onMouseEnter={() => { if (!goalCanChange && minutes !== dailyGoalMinutes) setLockedHovered(true); }}
                          onMouseLeave={() => setLockedHovered(false)}
                        >
                          {minutes} minutes
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className={`cursor-pointer pl-8 ${!goalCanChange ? "opacity-50" : ""}`}
                      onSelect={(e) => {
                        if (!goalCanChange) { setLockedHovered(true); setTimeout(() => setLockedHovered(false), 500); return; }
                        e.preventDefault();
                        setGoalExpanded(false);
                        openCustomGoalDialog();
                      }}
                      onMouseEnter={() => { if (!goalCanChange) setLockedHovered(true); }}
                      onMouseLeave={() => setLockedHovered(false)}
                    >
                      Custom minutes
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/privacy">
                    <Shield className="mr-2 h-4 w-4" />
                    Privacy Policy
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  id="sign-out-btn"
                  className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {isStudioRoute && (
            <button
              onClick={() => {
                const el = document.getElementById("studio-upgrade-trigger");
                el?.click();
              }}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 sm:px-3 text-xs font-bold text-white shadow-sm transition-all hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #4285F4 0%, #9C27B0 35%, #E91E63 65%, #FF7043 100%)",
                backgroundSize: "200% 200%",
                animation: "gemini-shift 4s ease infinite",
              }}
            >
              <Sparkles size={12} />
              <span className="sm:hidden">Pro</span>
              <span className="hidden sm:inline">Upgrade</span>
            </button>
          )}
        </div>
      </div>

      <AlertDialog open={installHelpOpen} onOpenChange={setInstallHelpOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Install Matrix</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              {isIOSDevice() ? iosInstallMessage : desktopInstallFallbackMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Got it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={customGoalOpen} onOpenChange={setCustomGoalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Custom Daily Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Choose a daily focus goal from {MIN_DAILY_GOAL_MINUTES} to {MAX_DAILY_GOAL_MINUTES} minutes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="custom-daily-goal">Minutes</Label>
            <Input
              id="custom-daily-goal"
              type="number"
              min={MIN_DAILY_GOAL_MINUTES}
              max={MAX_DAILY_GOAL_MINUTES}
              value={customGoalValue}
              onChange={(e) => setCustomGoalValue(e.target.value)}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleCustomGoalSubmit();
              }}
            >
              Save goal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {mobileMenuOpen && (
        <nav className="border-t px-4 py-2 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                activeOptions={{ exact: l.to === "/" }}
                className={navLinkClass}
                activeProps={{ className: navLinkActiveClass }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
