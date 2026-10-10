import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookmarkCheck, Clock3, Headphones, Sparkles, UserRound } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PodcastRow } from "@/components/podcast/podcast-card";
import { errorText, formatTime } from "@/lib/format";
import { getDashboard, getHistory, getMyProfile, getSaved, updateMyProfile } from "@/lib/podcast/api";
import { loadSignedIn } from "@/lib/auth/route-guard";

export const Route = createFileRoute("/dashboard")({
  loader: () =>
    loadSignedIn(async () => {
      const [dashboard, saved, history, profile] = await Promise.all([
        getDashboard(),
        getSaved(),
        getHistory(),
        getMyProfile(),
      ]);
      return { dashboard, saved, history, profile };
    }),
  component: DashboardPage,
});

function DashboardPage() {
  const { dashboard: data, saved, history, profile } = Route.useLoaderData();
  const role = profile?.role ?? "student";
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);
    try {
      const result = await updateMyProfile({
        data: { displayName, avatarUrl: profile.avatarUrl },
      });
      if (result.ok) {
        setDisplayName(result.data.displayName);
        setProfileMessage("Profile updated.");
      } else {
        setProfileMessage(result.message);
      }
    } catch (error) {
      setProfileMessage(errorText(error));
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <AppShell role={role} variant="campus">
      <div className="space-y-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet">Your listening</p>
            <h1 className="mt-1 text-3xl font-semibold">Your dashboard</h1>
            <p className="mt-2 text-sm text-muted">Your profile, saved episodes, and listening progress in one place.</p>
          </div>
          <Link to="/podcasts" search={{ q: "", category: "all", sort: "newest", page: 1 }} className="btn btn-outline">
            Browse more episodes
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard icon={Headphones} label="Episodes played" value={String(data.played)} accent="violet" />
          <StatCard icon={BookmarkCheck} label="Saved" value={String(data.saved)} accent="mint" />
          <StatCard icon={Clock3} label="In progress" value={String(data.inProgress)} accent="pink" />
        </section>

        {data.continueListening ? (
          <section className="rounded-3xl border border-line bg-card p-5 shadow-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet">Continue listening</p>
                <h2 className="mt-2 text-xl font-semibold">{data.continueListening.title}</h2>
              </div>
              <Link to="/podcasts/$slug" params={{ slug: data.continueListening.slug }} className="btn btn-primary">
                Resume <ArrowRight className="size-4" />
              </Link>
            </div>
            <p className="mt-2 text-sm text-muted">
              {data.continueListening.speakerName} · {formatTime(data.continueListening.positionSeconds)} elapsed
            </p>
          </section>
        ) : null}

        <section id="history" className="scroll-mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-violet">Your progress</p>
              <h2 className="mt-1 text-xl font-semibold">Listening history</h2>
            </div>
            <span className="text-sm text-muted">{history.length} {history.length === 1 ? "episode" : "episodes"}</span>
          </div>
          {history.length > 0 ? (
            <div className="space-y-3">
              {history.map((item) => (
                <PodcastRow key={item.id} podcast={item} position={item.positionSeconds} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-line bg-card p-8 text-center text-muted">
              No listening history yet. Pick an episode to start your queue.
            </div>
          )}
        </section>

        <section id="saved" className="scroll-mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-violet">Your library</p>
              <h2 className="mt-1 text-xl font-semibold">Saved podcasts</h2>
            </div>
            <span className="text-sm text-muted">{saved.length} {saved.length === 1 ? "episode" : "episodes"}</span>
          </div>
          {saved.length > 0 ? (
            <div className="space-y-3">
              {saved.map((podcast) => <PodcastRow key={podcast.id} podcast={podcast} />)}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-line bg-card p-8 text-center">
              <p className="text-muted">Your saved podcast list is empty.</p>
              <Link to="/podcasts" search={{ q: "", category: "all", sort: "newest", page: 1 }} className="mt-3 inline-flex font-medium text-violet">
                Find something to save
              </Link>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-violet">Picked for you</p>
              <h2 className="mt-1 text-xl font-semibold">Recommended podcasts</h2>
            </div>
            <Sparkles className="size-4 text-violet" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {data.recommended.map((podcast) => <PodcastRow key={podcast.id} podcast={podcast} />)}
          </div>
        </section>

        <section id="profile" className="scroll-mt-6 space-y-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-violet">Account</p>
            <h2 className="mt-1 text-xl font-semibold">Your profile</h2>
          </div>
          <div className="grid gap-4 rounded-3xl border border-line bg-card p-5 shadow-card md:grid-cols-[minmax(0,1fr)_minmax(18rem,1fr)] md:items-center">
            <div className="flex items-center gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-full bg-violet text-xl font-semibold text-on-violet">
                <UserRound className="size-6" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{displayName}</p>
                <p className="truncate text-sm text-muted">{profile.email ?? "No email on file"}</p>
                <p className="mt-1 text-xs capitalize text-violet">{profile.role} account</p>
              </div>
            </div>
            <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(event) => void saveProfile(event)}>
              <label className="block min-w-0 flex-1 text-sm font-medium">
                Display name
                <input
                  className="field mt-1"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  minLength={2}
                  maxLength={60}
                  required
                />
              </label>
              <button className="btn btn-primary shrink-0" type="submit" disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Save profile"}
              </button>
            </form>
            {profileMessage ? (
              <p role="status" className="text-sm text-muted md:col-span-2">{profileMessage}</p>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Headphones;
  label: string;
  value: string;
  accent: "violet" | "mint" | "pink";
}) {
  const accentClasses =
    accent === "violet"
      ? "bg-mist text-violet"
      : accent === "mint"
        ? "bg-mint-soft text-mint"
        : "bg-rose-soft text-rose";

  return (
    <div className="rounded-3xl border border-line bg-card p-5 shadow-card">
      <div className={`mb-4 grid size-11 place-items-center rounded-2xl ${accentClasses}`}>
        <Icon className="size-5" />
      </div>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}
