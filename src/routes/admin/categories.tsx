import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useProfile } from "@/components/layout/use-profile";
import { deleteAdminCategory, getAdminCategories, saveAdminCategory } from "@/lib/podcast/api";
import { loadSignedIn } from "@/lib/auth/route-guard";

export const Route = createFileRoute("/admin/categories")({
  loader: () => loadSignedIn(() => getAdminCategories()),
  component: AdminCategoriesPage,
});

function AdminCategoriesPage() {
  const initial = Route.useLoaderData();
  const { profile } = useProfile();
  const [items, setItems] = useState(initial);
  const [form, setForm] = useState({ name: "", description: "" });
  const [message, setMessage] = useState<string | null>(null);
  const role = profile?.role ?? "admin";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await saveAdminCategory({ data: { name: form.name, description: form.description } });
    if (result.ok) {
      setItems((current) => [...current, { id: result.data.id, name: form.name, slug: form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), description: form.description, icon: "mic", podcastCount: 0 }]);
      setForm({ name: "", description: "" });
      setMessage("Category saved.");
    } else {
      setMessage(result.message);
    }
  }

  async function onDelete(id: string) {
    const result = await deleteAdminCategory({ data: { id } });
    if (result.ok) {
      setItems((current) => current.filter((item) => item.id !== id));
      setMessage("Category removed.");
    } else {
      setMessage(result.message);
    }
  }

  return (
    <AppShell role={role} variant="admin">
      <div className="space-y-5">
        <header>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet">Structure</p>
          <h1 className="mt-1 text-3xl font-semibold">Categories</h1>
        </header>

        <form className="rounded-3xl border border-line bg-card p-5 shadow-card" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium md:col-span-2">
              Name
              <input
                className="field mt-1"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label className="block text-sm font-medium md:col-span-2">
              Description
              <textarea
                className="field mt-1 min-h-24"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </label>
          </div>
          <button className="btn btn-primary mt-4" type="submit">Add category</button>
          {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}
        </form>

        <div className="space-y-3">
          {items.map((category) => (
            <div key={category.id} className="flex items-center justify-between gap-3 rounded-3xl border border-line bg-card p-4 shadow-card">
              <div>
                <p className="font-semibold">{category.name}</p>
                <p className="text-sm text-muted">{category.description}</p>
              </div>
              <button type="button" className="btn btn-outline" onClick={() => void onDelete(category.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
