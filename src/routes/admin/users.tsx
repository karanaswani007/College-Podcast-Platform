import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useProfile } from "@/components/layout/use-profile";
import { changeUserRole, getAdminUsers } from "@/lib/podcast/api";
import { loadSignedIn } from "@/lib/auth/route-guard";

export const Route = createFileRoute("/admin/users")({
  loader: () => loadSignedIn(() => getAdminUsers({ data: { q: "" } })),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const initial = Route.useLoaderData();
  const { profile } = useProfile();
  const [items, setItems] = useState(initial);
  const role = profile?.role ?? "admin";

  async function handleRoleChange(userId: string, nextRole: "student" | "creator" | "admin") {
    const result = await changeUserRole({ data: { userId, role: nextRole } });
    if (result.ok) {
      setItems((current) => current.map((item) => (item.id === userId ? { ...item, role: nextRole } : item)));
    }
  }

  return (
    <AppShell role={role} variant="admin">
      <div className="space-y-4">
        <header>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet">People</p>
          <h1 className="mt-1 text-3xl font-semibold">User roles</h1>
        </header>
        <div className="space-y-3">
          {items.map((user) => (
            <div key={user.id} className="rounded-3xl border border-line bg-card p-4 shadow-card">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold">{user.displayName ?? user.name}</h2>
                  <p className="text-sm text-muted">{user.email}</p>
                </div>
                <select
                  className="field"
                  value={user.role ?? "student"}
                  onChange={(event) => void handleRoleChange(user.id, event.target.value as "student" | "creator" | "admin")}
                >
                  <option value="student">Student</option>
                  <option value="creator">Creator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
