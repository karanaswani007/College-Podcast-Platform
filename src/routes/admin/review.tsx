import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useProfile } from "@/components/layout/use-profile";
import { StatusPill } from "@/components/podcast/podcast-card";
import { changeEpisodeStatus, getReviewQueue } from "@/lib/podcast/api";
import { loadSignedIn } from "@/lib/auth/route-guard";

export const Route = createFileRoute("/admin/review")({
  loader: () => loadSignedIn(() => getReviewQueue()),
  component: ReviewPage,
});

function ReviewPage() {
  const initial = Route.useLoaderData();
  const { profile } = useProfile();
  const [items, setItems] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const role = profile?.role ?? "admin";

  async function handleDecision(id: string, status: "published" | "rejected") {
    const result = await changeEpisodeStatus({ data: { id, status } });
    if (result.ok) {
      setItems((current) => current.filter((item) => item.id !== id));
      setMessage("Decision saved.");
    } else {
      setMessage(result.message);
    }
  }

  return (
    <AppShell role={role} variant="admin" pendingCount={items.length}>
      <div className="space-y-4">
        <header>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet">Approval</p>
          <h1 className="mt-1 text-3xl font-semibold">Review queue</h1>
        </header>
        {message ? <p className="text-sm text-muted">{message}</p> : null}
        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-3xl border border-line bg-card p-4 shadow-card">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">{item.title}</h2>
                    <p className="text-sm text-muted">{item.createdBy}</p>
                  </div>
                  <StatusPill status={item.status} />
                </div>
                <p className="mt-2 text-sm text-muted">{item.description}</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" className="btn btn-primary" onClick={() => void handleDecision(item.id, "published")}>
                    Approve
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => void handleDecision(item.id, "rejected")}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-line bg-card p-10 text-center text-muted">
            No pending submissions.
          </div>
        )}
      </div>
    </AppShell>
  );
}
