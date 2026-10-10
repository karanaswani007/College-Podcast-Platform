import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, GraduationCap, Heart, Laptop, Play, Users } from "lucide-react";
import { PublicFrame } from "@/components/layout/public-frame";
import { FeatureCard, PodcastRow } from "@/components/podcast/podcast-card";
import { getHomeFeed } from "@/lib/podcast/api";
import type { CategoryCard } from "@/lib/podcast/types";

export const Route = createFileRoute("/")({
  loader: () => getHomeFeed(),
  component: Home,
});

const ICONS = {
  graduation: GraduationCap,
  laptop: Laptop,
  users: Users,
  calendar: Calendar,
  heart: Heart,
};

function Home() {
  const feed = Route.useLoaderData();
  return (
    <PublicFrame>
      <div className="mx-auto max-w-6xl space-y-12 px-4 py-6">
        <section className="hero-shell relative overflow-hidden bg-navy text-on-navy">
          <img src="/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/80 to-navy/25" />
          <div className="relative grid gap-8 px-6 py-12 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
            <div>
              <h1 className="max-w-xl font-brand text-4xl font-semibold sm:text-5xl">
                College <span className="text-violet">Podcast</span> Platform
              </h1>
              <p className="mt-4 max-w-md text-lg text-on-navy/85">
                A digital audio-based communication and learning system for campus life.
              </p>
              <p className="mt-3 text-sm tracking-wide text-on-navy/75">Listen · Learn · Grow</p>
              <Link to="/podcasts" search={{ q: "", category: "all", sort: "newest", page: 1 }} className="btn btn-primary mt-6">
                <Play className="size-4" />
                Explore Podcasts
              </Link>
            </div>
            <p className="self-end text-right font-brand text-2xl italic text-on-navy/90 sm:text-3xl">
              Better ideas through audio
            </p>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-2xl font-semibold">Featured Podcasts</h2>
            <Link to="/podcasts" search={{ q: "", category: "all", sort: "newest", page: 1 }} className="text-sm font-medium text-violet">
              View all
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {feed.featured.map((podcast) => (
              <FeatureCard key={podcast.id} podcast={podcast} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Categories</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {feed.categories.map((category) => (
              <CategoryTile key={category.id} category={category} />
            ))}
          </div>
        </section>

        {feed.more.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">More to explore</h2>
            {feed.more.map((podcast) => (
              <PodcastRow key={podcast.id} podcast={podcast} />
            ))}
          </section>
        ) : null}
      </div>
    </PublicFrame>
  );
}

function CategoryTile({ category }: { category: CategoryCard }) {
  const Icon = ICONS[category.icon as keyof typeof ICONS] ?? GraduationCap;
  return (
    <Link
      to="/podcasts"
      search={{ q: "", category: category.slug, sort: "newest", page: 1 }}
      className="flex flex-col items-center gap-2 rounded-3xl border border-line bg-card px-3 py-5 text-center shadow-card"
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-mist text-violet">
        <Icon className="size-5" />
      </span>
      <span className="font-medium">{category.name}</span>
      <span className="text-xs text-muted">{category.podcastCount} episodes</span>
    </Link>
  );
}
