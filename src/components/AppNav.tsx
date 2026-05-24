import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { daysUntilExam } from "@/lib/profile";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAirgap } from "@/hooks/useAirgap";
import { useTheme } from "@/hooks/useTheme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Download, LogOut, Menu, Moon, Sun, User, X } from "lucide-react";
import {
  getDeferredPrompt,
  isInstalledPwa,
  subscribePwaInstall,
  triggerInstallPrompt,
} from "@/lib/pwa-install";

function isIOSDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}


const links = [
  { to: "/", label: "Dashboard" },
  { to: "/tracks", label: "Tracks" },
  { to: "/focus", label: "Focus" },
  { to: "/log", label: "Log" },
  { to: "/airgap", label: "Airgap" },
  { to: "/matrix", label: "Matrix" },
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
  const { profile, targetDate } = useProfile();
  const days = targetDate ? daysUntilExam(targetDate) : 0;
  const { user, signOut } = useAuth();
  const { isOn, isExtensionReady } = useAirgap();
  const { isDark, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  const iosInstallMessage =
    "Tap the Share icon in Safari (square with arrow), then choose \"Add to Home Screen\" to install Matrix on your home screen.";

  const desktopInstallFallbackMessage =
    "If no install dialog appeared: in Chrome or Edge, open the menu (⋮) or look for an install icon in the address bar, then choose \"Install\" or \"Install Matrix\".";

  useEffect(() => {
    const updateInstalled = () => setIsInstalled(isInstalledPwa());

    updateInstalled();

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
    };

    const onAppInstalled = () => {
      deferredPromptRef.current = null;
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOSDevice()) {
      setInstallHelpOpen(true);
      return;
    }

    const prompt = deferredPromptRef.current;
    if (!prompt) {
      setInstallHelpOpen(true);
      toast.info("Install instructions", {
        description: desktopInstallFallbackMessage,
        duration: 8000,
      });
      return;
    }

    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        deferredPromptRef.current = null;
        setIsInstalled(true);
        toast.success("Matrix installed!");
      } else {
        toast.message("Install dismissed", {
          description: "You can install anytime from the profile menu.",
        });
      }
    } catch (err) {
      console.error("PWA install prompt failed:", err);
      setInstallHelpOpen(true);
      toast.error("Could not open install dialog", {
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

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 md:gap-4">
        {/* Left: brand + desktop nav + mobile menu toggle */}
        <div className="flex min-w-0 items-center gap-2 md:gap-6">
          <Link
            to="/"
            className="shrink-0 text-base font-semibold tracking-tight max-[529px]:max-w-[7.5rem] max-[529px]:truncate"
          >
            JEE Console
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

        {/* Right: theme, countdown, airgap, avatar */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
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

          <div className="rounded-md border bg-background px-2 py-1.5 text-xs font-medium tabular-nums max-[529px]:px-1.5 max-[529px]:text-[10px] sm:px-3">
            <span className="text-muted-foreground">JEE {profile?.targetYear ?? "—"} · </span>
            <span className="text-foreground">{days} days</span>
          </div>

          <Badge
            variant={isExtensionReady ? (isOn ? "default" : "outline") : "secondary"}
            className="hidden min-[530px]:inline-flex"
          >
            Airgap {isExtensionReady ? (isOn ? "ON" : "OFF") : "Not detected"}
          </Badge>

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

                <DropdownMenuItem disabled className="cursor-default opacity-50">
                  <User className="mr-2 h-4 w-4" />
                  Profile (coming soon)
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
