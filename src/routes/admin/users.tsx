import { createFileRoute } from "@tanstack/react-router";
import { Activity, Ban, Search, ShieldCheck, Trash2, UserRoundCheck, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { useProfile } from "@/components/layout/use-profile";
import { errorText, formatWhen } from "@/lib/format";
import {
  changeUserRole,
  deleteAdminUser,
  getAdminUsers,
  restoreAdminUser,
  setAdminUserBlocked,
} from "@/lib/podcast/api";
import { loadSignedIn } from "@/lib/auth/route-guard";
import type { AdminUser, Role } from "@/lib/podcast/types";

export const Route = createFileRoute("/admin/users")({
  loader: () => loadSignedIn(() => getAdminUsers({ data: { q: "" } })),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const initial = Route.useLoaderData();
  const { profile } = useProfile();
  const [items, setItems] = useState(initial.users);
  const [total, setTotal] = useState(initial.total);
  const [page, setPage] = useState(initial.page);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const isSuperAdmin = profile?.role === "superadmin";
  const role: Role = profile?.role ?? "admin";
  const blockedCount = items.filter((user) => user.blockedAt).length;
  const adminCount = items.filter((user) => user.role === "admin" || user.role === "superadmin").length;

  async function loadUsers(nextPage: number, nextQuery: string) {
    setSearching(true);
    try {
      const result = await getAdminUsers({ data: { q: nextQuery, page: nextPage } });
      setItems(result.users);
      setTotal(result.total);
      setPage(result.page);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSearching(false);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadUsers(1, query);
  }

  async function handleRoleChange(userId: string, nextRole: "student" | "creator" | "admin") {
    setBusyUserId(userId);
    try {
      const result = await changeUserRole({ data: { userId, role: nextRole } });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setItems((current) => current.map((item) => (item.id === userId ? { ...item, role: nextRole } : item)));
      toast.success("User role updated.");
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleBlock(user: AdminUser) {
    setBusyUserId(user.id);
    try {
      const result = user.blockedAt
        ? await restoreAdminUser({ data: { userId: user.id } })
        : await setAdminUserBlocked({ data: { userId: user.id } });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setItems((current) =>
        current.map((item) =>
          item.id === user.id
            ? { ...item, blockedAt: user.blockedAt ? null : new Date().toISOString() }
            : item,
        ),
      );
      toast.success(user.blockedAt ? "Account access restored." : "Account blocked and sessions ended.");
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleDelete(user: AdminUser) {
    const confirmed = window.confirm(
      `Permanently delete ${user.displayName ?? user.name} (${user.email})? Their account, listening data, uploads, and sessions will be removed.`,
    );
    if (!confirmed) return;
    setBusyUserId(user.id);
    try {
      const result = await deleteAdminUser({ data: { userId: user.id } });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setItems((current) => current.filter((item) => item.id !== user.id));
      setTotal((current) => Math.max(0, current - 1));
      if (items.length === 1 && page > 1) await loadUsers(page - 1, query);
      toast.success("User and associated data deleted.");
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <AppShell role={role} variant="admin">
      <div className="space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet">People</p>
            <h1 className="mt-1 text-3xl font-semibold">User management</h1>
            <p className="mt-2 text-sm text-muted">Review activity, control account access, and manage platform roles.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-mist px-3 py-2 text-sm font-medium text-violet">
            <ShieldCheck className="size-4" />
            {isSuperAdmin ? "Superadmin controls" : "Admin view"}
          </span>
        </header>

        <section className="grid gap-3 sm:grid-cols-3" aria-label="User account summary">
          <SummaryCard icon={Users} label="Matching accounts" value={total} />
          <SummaryCard icon={ShieldCheck} label="Admins on this page" value={adminCount} />
          <SummaryCard icon={Ban} label="Blocked on this page" value={blockedCount} />
        </section>

        <form onSubmit={(event) => void handleSearch(event)} className="flex flex-col gap-3 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search users</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              className="field w-full pl-11"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or email"
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={searching}>
            {searching ? "Searching..." : "Search users"}
          </button>
        </form>

        {items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-card px-6 py-12 text-center">
            <h2 className="font-semibold">No users found</h2>
            <p className="mt-2 text-sm text-muted">Try a different name or email address.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((user) => {
              const isSelf = user.id === profile?.id;
              const isSuperAdminAccount = user.role === "superadmin";
              const canManage = isSuperAdmin || (user.role !== "admin" && !isSuperAdminAccount);
              const busy = busyUserId === user.id;

              return (
                <article key={user.id} className="rounded-3xl border border-line bg-card p-4 shadow-card sm:p-5">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-lg font-semibold">{user.displayName ?? user.name}</h2>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          user.blockedAt ? "bg-rose-soft text-rose" : "bg-mist text-violet"
                        }`}>
                          {user.blockedAt ? "Blocked" : "Active"}
                        </span>
                        {user.role ? (
                          <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-medium capitalize text-muted">
                            {user.role}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 break-all text-sm text-muted">{user.email}</p>
                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                        <ActivityItem icon={Users} label="Joined" value={formatWhen(user.createdAt) || "Unknown"} />
                        <ActivityItem icon={Activity} label="Last active" value={user.lastActiveAt ? formatWhen(user.lastActiveAt) : "No recent session"} />
                        <ActivityItem icon={UserRoundCheck} label="Episodes uploaded" value={String(user.uploadCount)} />
                        <ActivityItem icon={Activity} label="Episodes listened" value={String(user.listeningCount)} />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row xl:w-64 xl:flex-col">
                      {isSuperAdmin && !isSuperAdminAccount ? (
                        <label className="sr-only" htmlFor={`role-${user.id}`}>Role for {user.displayName ?? user.name}</label>
                      ) : null}
                      {isSuperAdmin && !isSuperAdminAccount ? (
                        <select
                          id={`role-${user.id}`}
                          className="field min-w-36"
                          value={user.role ?? "student"}
                          disabled={busy || isSelf}
                          onChange={(event) => {
                            const nextRole = event.target.value;
                            if (nextRole === "student" || nextRole === "creator" || nextRole === "admin") {
                              void handleRoleChange(user.id, nextRole);
                            }
                          }}
                        >
                          <option value="student">User</option>
                          <option value="creator">Creator</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : null}

                      {canManage && !isSelf && !isSuperAdminAccount ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-outline"
                            disabled={busy}
                            onClick={() => void handleBlock(user)}
                          >
                            <Ban className="size-4" />
                            {user.blockedAt ? "Unblock" : "Block"}
                          </button>
                          <button
                            type="button"
                            className="btn border border-rose/30 bg-rose-soft text-rose hover:bg-rose/15"
                            disabled={busy}
                            onClick={() => void handleDelete(user)}
                          >
                            <Trash2 className="size-4" />
                            Delete user
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {!isSuperAdmin ? (
          <p className="rounded-2xl border border-line bg-card p-4 text-sm text-muted">
            You can review accounts and manage standard users. Contact the superadmin to change account roles or administer another admin.
          </p>
        ) : null}
        {total > initial.pageSize ? (
          <nav className="flex items-center justify-between gap-3" aria-label="User list pages">
            <p className="text-sm text-muted">
              Showing {(page - 1) * initial.pageSize + 1}–{Math.min(page * initial.pageSize, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-outline"
                disabled={searching || page <= 1}
                onClick={() => void loadUsers(page - 1, query)}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={searching || page * initial.pageSize >= total}
                onClick={() => void loadUsers(page + 1, query)}
              >
                Next
              </button>
            </div>
          </nav>
        ) : null}
        <p className="text-xs text-muted">For safety, only a superadmin can change roles or manage another admin account.</p>
      </div>
    </AppShell>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mist text-violet"><Icon className="size-5" /></span>
      <div>
        <p className="text-sm text-muted">{label}</p>
        <p className="text-xl font-semibold">{value}</p>
      </div>
    </div>
  );
}

function ActivityItem({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-violet" />
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate font-medium">{value}</p>
      </div>
    </div>
  );
}
