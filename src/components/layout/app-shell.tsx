import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bookmark,
  Headphones,
  History,
  LayoutDashboard,
  LogOut,
  Mic,
  Shield,
  Tags,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/lib/auth/client";
import { errorText } from "@/lib/format";
import type { Role } from "@/lib/podcast/types";
import { usePlayer } from "@/components/player/player";
import type { ReactNode } from "react";

type Item = { to: string; label: string; icon: typeof LayoutDashboard; badge?: number; hash?: string };

export function AppShell({
  role,
  pendingCount = 0,
  variant,
  children,
}: {
  role: Role;
  pendingCount?: number;
  variant: "campus" | "admin";
  children: ReactNode;
}) {
  const player = usePlayer();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const hash = useRouterState({ select: (state) => state.location.hash });
  const items: Item[] =
    variant === "admin"
      ? [
          { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
          { to: "/admin/podcasts", label: "Manage Podcasts", icon: Headphones },
          { to: "/admin/review", label: "Review", icon: Shield, badge: pendingCount },
          { to: "/admin/users", label: "Users", icon: Users },
          { to: "/admin/categories", label: "Categories", icon: Tags },
          { to: "/upload", label: "Upload", icon: Upload },
          { to: "/dashboard", label: "My listening", icon: Bookmark },
        ]
      : [
          { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { to: "/podcasts", label: "Browse Podcasts", icon: Headphones },
          { to: "/dashboard", hash: "saved", label: "Saved Podcasts", icon: Bookmark },
          { to: "/dashboard", hash: "history", label: "Listening History", icon: History },
          { to: "/dashboard", hash: "profile", label: "Profile", icon: UserRound },
          ...(role !== "student" ? [{ to: "/upload", label: "Upload", icon: Upload }] : []),
          ...(role === "admin" || role === "superadmin" ? [{ to: "/admin", label: "Admin", icon: Shield }] : []),
        ];

  return (
    <div className={`min-h-screen bg-paper md:grid md:grid-cols-[250px_1fr] ${player.current ? "pb-28" : ""}`}>
      <aside className="bg-ink text-on-navy md:min-h-screen">
        <Link to="/" className="flex items-center gap-2 px-4 py-5">
          <span className="grid size-10 place-items-center rounded-2xl bg-violet text-on-violet">
            <Mic className="size-5" />
          </span>
          <span>
            <span className="block font-brand text-base">College Podcast</span>
            <span className="block text-xs text-on-navy/70">Platform</span>
          </span>
        </Link>
        <nav className="flex gap-2 overflow-x-auto px-3 pb-4 md:flex-col md:overflow-visible" aria-label="Account">
          {items.map((item) => {
            const active = item.hash
              ? path === "/dashboard" && hash === `#${item.hash}`
              : item.to === "/admin" || item.to === "/dashboard"
                ? path === item.to
                : path === item.to || path.startsWith(`${item.to}/`);
            const Icon = item.icon;
            const link = (
              <>
                <Icon className="size-4 shrink-0" />
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="ml-auto rounded-full bg-rose px-2 py-0.5 text-xs text-on-violet">{item.badge}</span>
                ) : null}
              </>
            );
            return item.hash ? (
              <a
                key={item.hash}
                href={`/dashboard#${item.hash}`}
                className="nav-pill"
                aria-current={active ? "location" : undefined}
              >
                {link}
              </a>
            ) : (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: true }}
                className="nav-pill"
                aria-current={active ? "page" : undefined}
              >
                {link}
              </Link>
            );
          })}
          <button
            type="button"
            className="nav-pill text-left"
            onClick={() => {
              void signOut("/").catch((err) => toast.error(errorText(err)));
            }}
          >
            <LogOut className="size-4" />
            Log out
          </button>
        </nav>
      </aside>
      <div className="min-w-0">
        <div className="flex items-center justify-end border-b border-line bg-card px-4 py-3 text-sm text-muted">
          <span className="rounded-full bg-mist px-3 py-1 font-medium capitalize text-violet">{role}</span>
        </div>
        <div className="px-4 py-6 md:px-8">{children}</div>
      </div>
    </div>
  );
}
