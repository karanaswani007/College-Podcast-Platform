import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { PublicFrame } from "@/components/layout/public-frame";
import { PodcastRow } from "@/components/podcast/podcast-card";
import { EmptyState } from "@/components/states";
import { useLibrary } from "@/components/library/library-state";
import { listPodcasts } from "@/lib/podcast/api";

export type LibrarySearch = {
  q: string;
  category: string;
  sort: "newest" | "popular";
  page: number;
};

export const Route = createFileRoute("/podcasts/")({
  validateSearch: (search: Record<string, unknown>): LibrarySearch => ({
    q: typeof search.q === "string" ? search.q.slice(0, 80) : "",
    category: typeof search.category === "string" ? search.category : "all",
    sort: search.sort === "popular" ? "popular" : "newest",
    page: Math.min(100, Math.max(1, Number(search.page) || 1)),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => listPodcasts({ data: deps }),
  head: () => ({ meta: [{ title: "Podcasts · College Podcast Platform" }] }),
  component: LibraryPage,
});

function LibraryPage() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/podcasts/" });
  const library = useLibrary();
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <PublicFrame>
      <div className="mx-auto max-w-4xl space-y-5 px-4 py-8">
        <h1 className="text-3xl font-semibold">All Podcasts</h1>
        <form
          className="grid gap-3 sm:grid-cols-[minmax(16rem,1fr)_auto_auto_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void navigate({
              search: {
                q: String(form.get("q") ?? ""),
                category: String(form.get("category") ?? "all"),
                sort: form.get("sort") === "popular" ? "popular" : "newest",
                page: 1,
              },
            });
          }}
        >
          <label className="relative block">
            <span className="sr-only">Search podcasts</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input className="field pl-10" name="q" defaultValue={search.q} placeholder="Search title, description, or speaker" />
          </label>
          <select
            className="field"
            name="category"
            defaultValue={search.category}
            aria-label="Category"
            onChange={(event) =>
              void navigate({ search: { ...search, category: event.target.value, page: 1 } })
            }
          >
            <option value="all">All categories</option>
            {data.categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            className="field"
            name="sort"
            defaultValue={search.sort}
            aria-label="Sort"
            onChange={(event) =>
              void navigate({
                search: { ...search, sort: event.target.value === "popular" ? "popular" : "newest", page: 1 },
              })
            }
          >
            <option value="newest">Newest</option>
            <option value="popular">Most played</option>
          </select>
          <button className="btn btn-primary whitespace-nowrap" type="submit">
            <Search className="size-4" />
            Search
          </button>
        </form>
        <p className="text-sm text-muted">
          {data.total} published {data.total === 1 ? "episode" : "episodes"}
        </p>
        {data.items.length === 0 ? (
          <EmptyState title="No episodes match" body="Try another word, or clear the category filter." />
        ) : (
          <div className="space-y-3">
            {data.items.map((podcast) => (
              <PodcastRow key={podcast.id} podcast={podcast} position={library.positions[podcast.id]} />
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="btn btn-outline"
            disabled={search.page <= 1}
            onClick={() => void navigate({ search: { ...search, page: search.page - 1 } })}
          >
            Previous
          </button>
          <span className="text-sm text-muted">
            Page {search.page} of {pages}
          </span>
          <button
            type="button"
            className="btn btn-outline"
            disabled={search.page >= pages}
            onClick={() => void navigate({ search: { ...search, page: search.page + 1 } })}
          >
            Next
          </button>
        </div>
      </div>
    </PublicFrame>
  );
}
