import { Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { daysUntilJEE } from "@/lib/analytics";
import { useAuth } from "@/contexts/AuthContext";
import { useAirgap } from "@/hooks/useAirgap";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/tracks", label: "Tracks" },
  { to: "/focus", label: "Focus" },
  { to: "/log", label: "Log" },
  { to: "/airgap", label: "Airgap" },
  { to: "/matrix", label: "Matrix" },
] as const;

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
  const days = daysUntilJEE();
  const { user, signOut } = useAuth();
  const { isOn, isExtensionReady } = useAirgap();

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
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        {/* Left: brand + nav links */}
        <div className="flex items-center gap-6">
          <Link to="/" className="text-base font-semibold tracking-tight">
            JEE Workstation
          </Link>
          <nav className="flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                activeOptions={{ exact: l.to === "/" }}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                activeProps={{ className: "bg-accent text-foreground font-medium" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: countdown + avatar dropdown */}
        <div className="flex items-center gap-3">
          <div className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium tabular-nums">
            <span className="text-muted-foreground">JEE 2027 · </span>
            <span className="text-foreground">{days} days</span>
          </div>
          <Badge variant={isExtensionReady ? (isOn ? "default" : "outline") : "secondary"}>
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
                      <p className="truncate text-xs font-normal text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem disabled className="opacity-50 cursor-default">
                  <User className="mr-2 h-4 w-4" />
                  Profile (coming soon)
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  id="sign-out-btn"
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
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
    </header>
  );
}
