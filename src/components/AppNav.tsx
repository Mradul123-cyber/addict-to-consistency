import { Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { daysUntilJEE } from "@/lib/analytics";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/tracks", label: "Tracks" },
  { to: "/focus", label: "Focus" },
  { to: "/log", label: "Log" },
  { to: "/matrix", label: "Matrix" },
] as const;

export function AppNav() {
  useStore();
  const days = daysUntilJEE();
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
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
        <div className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium tabular-nums">
          <span className="text-muted-foreground">JEE 2027 · </span>
          <span className="text-foreground">{days} days</span>
        </div>
      </div>
    </header>
  );
}
