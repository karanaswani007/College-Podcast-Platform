import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, CircleDashed, Mic, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { useProfile } from "@/components/layout/use-profile";
import { getAdminOverview } from "@/lib/podcast/api";
import { loadSignedIn } from "@/lib/auth/route-guard";

export const Route = createFileRoute("/admin")({
  loader: () => loadSignedIn(() => getAdminOverview()),
  component: AdminPage,
});

function AdminPage() {
  const overview = Route.useLoaderData();
  const { profile } = useProfile();
  const role = profile?.role ?? "admin";

  return (
    <AppShell role={role} variant="admin" pendingCount={overview.pending}>
      <div className="space-y-6">
        <header>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet">Operations</p>
          <h1 className="mt-1 text-3xl font-semibold">Admin dashboard</h1>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Mic} label="Published" value={String(overview.published)} />
          <MetricCard icon={Users} label="Users" value={String(overview.users)} />
          <MetricCard icon={BarChart3} label="Plays" value={String(overview.plays)} />
          <MetricCard icon={CircleDashed} label="Pending" value={String(overview.pending)} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-line bg-card p-5 shadow-card">
            <h2 className="text-xl font-semibold">Top episodes</h2>
            <div className="mt-4 space-y-3">
              {overview.top.map((item) => (
                <div key={item.title} className="flex items-center justify-between gap-3 rounded-2xl bg-paper px-3 py-2">
                  <span className="min-w-0 truncate font-medium">{item.title}</span>
                  <span className="text-sm text-muted">{item.plays} plays</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-card p-5 shadow-card">
            <h2 className="text-xl font-semibold">Category mix</h2>
            <div className="mt-4 space-y-3">
              {overview.byCategory.map((category) => (
                <div key={category.name}>
                  <div className="mb-1 flex items-center justify-between text-sm text-muted">
                    <span>{category.name}</span>
                    <span>{category.total}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-violet"
                      style={{ width: `${Math.min(100, (category.total / Math.max(1, overview.published)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Mic; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-line bg-card p-5 shadow-card">
      <div className="mb-4 grid size-11 place-items-center rounded-2xl bg-mist text-violet">
        <Icon className="size-5" />
      </div>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}
