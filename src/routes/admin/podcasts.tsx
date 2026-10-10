import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useProfile } from "@/components/layout/use-profile";
import { StatusPill } from "@/components/podcast/podcast-card";
import { changeEpisodeStatus, getAdminPodcasts } from "@/lib/podcast/api";
import { loadSignedIn } from "@/lib/auth/route-guard";

export const Route = createFileRoute("/admin/podcasts")({
  loader: () => loadSignedIn(() => getAdminPodcasts({ data: { q: "", status: "all" } })),
  component: AdminPodcastsPage,
});

function AdminPodcastsPage() {
  const initial = Route.useLoaderData();
  const { profile } = useProfile();
  const [items, setItems] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const role = profile?.role ?? "admin";

  async function updateStatus(id: string, status: "published" | "rejected" | "pending") {
    const result = await changeEpisodeStatus({ data: { id, status } });
    if (result.ok) {
      setItems((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
      setMessage("Status updated.");
    } else {
      setMessage(result.message);
    }
  }

  return (
    <AppShell role={role} variant="admin" pendingCount={items.filter((item) => item.status === "pending").length}>
      <div className="space-y-4">
        <header>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet">Content</p>
          <h1 className="mt-1 text-3xl font-semibold">Manage podcasts</h1>
        </header>
        {message ? <p className="text-sm text-muted">{message}</p> : null}
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-3xl border border-line bg-card p-4 shadow-card">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold">{item.title}</h2>
                  <p className="text-sm text-muted">{item.speakerName}</p>
                </div>
                <StatusPill status={item.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn btn-outline" onClick={() => void updateStatus(item.id, "published")}>
                  Publish
                </button>
                <button type="button" className="btn btn-outline" onClick={() => void updateStatus(item.id, "pending")}>
                  Pending
                </button>
                <button type="button" className="btn btn-outline" onClick={() => void updateStatus(item.id, "rejected")}>
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
