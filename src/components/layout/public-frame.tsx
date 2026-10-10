import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Mic, X } from "lucide-react";
import { useState } from "react";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useProfile } from "@/components/layout/use-profile";
import { usePlayer } from "@/components/player/player";
import type { ReactNode } from "react";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/podcasts", label: "Podcasts" },
  { to: "/about", label: "About" },
] as const;

export function PublicFrame({ children }: { children: ReactNode }) {
  const player = usePlayer();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const { user, isPending } = useCurrentUserState();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);

  return (
    <div className={player.current ? "pb-28" : undefined}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-card focus:px-4 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-2xl bg-navy text-on-navy">
              <Mic className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block font-brand text-base font-semibold">College Podcast</span>
              <span className="block text-xs text-muted">Platform</span>
            </span>
          </Link>
          <nav className="ml-6 hidden items-center gap-6 md:flex" aria-label="Primary">
            {LINKS.map((link) => {
              const active = link.to === "/" ? path === "/" : path.startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  aria-current={active ? "page" : undefined}
                  className={active ? "border-b-2 border-violet pb-1 font-semibold text-fg" : "text-muted"}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto hidden items-center gap-2 md:flex">
            <AuthLinks isPending={isPending} signedIn={Boolean(user)} admin={profile?.role === "admin"} name={profile?.displayName} />
          </div>
          <button type="button" className="icon-btn ml-auto md:hidden" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((value) => !value)}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open ? (
          <div className="space-y-2 border-t border-line px-4 py-3 md:hidden">
            {LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="block py-2 font-medium" onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
            <AuthLinks isPending={isPending} signedIn={Boolean(user)} admin={profile?.role === "admin"} name={profile?.displayName} />
          </div>
        ) : null}
      </header>
      <main id="main">{children}</main>
      <footer className="mt-16 bg-navy text-on-navy">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-brand text-2xl">College Podcast Platform</p>
            <p className="mt-2 text-sm text-on-navy/80">Listen · Learn · Grow</p>
          </div>
          <div>
            <p className="text-sm font-semibold">Explore</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-on-navy/80">
              <Link to="/podcasts" search={{ q: "", category: "all", sort: "newest", page: 1 }}>Podcasts</Link>
              <Link to="/about">About the project</Link>
              <Link to="/login" search={{ mode: "register" }}>Create an account</Link>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold">Support</p>
            <p className="mt-3 text-sm text-on-navy/80">Need help? Contact your campus podcast administrator.</p>
          </div>
          <div>
            <p className="text-sm font-semibold">For listeners</p>
            <p className="mt-3 text-sm text-on-navy/80">Sample episodes are fictional campus briefings, not recordings of a real institution.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AuthLinks({
  isPending,
  signedIn,
  admin,
  name,
}: {
  isPending: boolean;
  signedIn: boolean;
  admin: boolean;
  name?: string;
}) {
  if (isPending) return <div className="h-10 w-28 animate-pulse rounded-full bg-line" />;
  if (!signedIn) {
    return (
      <div className="flex items-center gap-2">
        <Link to="/login" search={{ mode: "login" }} className="btn btn-outline">
          Login
        </Link>
        <Link to="/login" search={{ mode: "register" }} className="btn btn-primary">
          Register
        </Link>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link to="/dashboard" className="btn btn-outline">
        {name ? name : "Dashboard"}
      </Link>
      {admin ? (
        <Link to="/admin" className="btn btn-navy">
          Admin
        </Link>
      ) : null}
      <button type="button" className="btn btn-primary" onClick={() => void signOut("/")}>
        Log out
      </button>
    </div>
  );
}
