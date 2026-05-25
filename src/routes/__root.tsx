import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { cn } from "@/lib/utils";

import appCss from "../styles.css?url";
import { AppNav } from "@/components/AppNav";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGate } from "@/components/AuthGate";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { NotesChromeProvider } from "@/contexts/NotesChromeContext";
import { OnboardingGate } from "@/components/OnboardingGate";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "JEE Console" },
      { name: "description", content: "Focus timer and consistency tracker for JEE preparation across Physics, Chemistry, and Math." },
      { property: "og:site_name", content: "JEE Console" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              name: "JEE Console",
              url: "https://addict-to-consistency.lovable.app",
              description: "Focus timer and consistency tracker for JEE preparation.",
            },
            {
              "@type": "Organization",
              name: "JEE Console",
              url: "https://addict-to-consistency.lovable.app",
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark")document.documentElement.classList.add("dark");}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const isNotesRoute = useRouterState({
    select: (s) => s.location.pathname.startsWith("/notes"),
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate>
          <ProfileProvider>
            <OnboardingGate>
              <NotesChromeProvider>
                <div className="flex min-h-screen flex-col bg-background text-foreground">
                  <AppNav />
                  <main
                  className={cn(
                    "min-h-0 flex-1",
                    isNotesRoute
                      ? "flex flex-col max-w-none p-0"
                      : "mx-auto w-full max-w-6xl px-4 py-8",
                  )}
                >
                    <Outlet />
                  </main>
                </div>
              </NotesChromeProvider>
            </OnboardingGate>
          </ProfileProvider>
        </AuthGate>
      </AuthProvider>
      <Toaster richColors closeButton position="top-center" />
    </QueryClientProvider>
  );
}
