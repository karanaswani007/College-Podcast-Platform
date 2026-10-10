import type { ReactNode } from "react";
import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { LibraryProvider } from "@/components/library/library-state";
import { PlayerBar, PlayerProvider } from "@/components/player/player";
import { AuthProvider } from "@/lib/auth/provider";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "College Podcast Platform" },
      {
        name: "description",
        content: "Listen, learn, and grow with campus podcasts for students.",
      },
      { name: "theme-color", content: "#0b1020" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560;9..144,680&family=Outfit:wght@400;500;600;700&display=swap",
      },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootApp,
  notFoundComponent: NotFound,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootApp() {
  return (
    <AuthProvider>
      <LibraryProvider>
        <PlayerProvider>
          <Outlet />
          <PlayerBar />
          <Toaster position="top-center" theme="light" />
        </PlayerProvider>
      </LibraryProvider>
    </AuthProvider>
  );
}

function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold text-violet">404</p>
      <h1 className="font-brand text-4xl text-fg">This page is not on the schedule.</h1>
      <p className="text-muted">The link may be old, or the episode is not published.</p>
      <Link to="/" className="btn btn-primary">
        Back home
      </Link>
    </main>
  );
}
