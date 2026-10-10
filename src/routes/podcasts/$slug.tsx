import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PublicFrame } from "@/components/layout/public-frame";
import { LikeButton, PodcastRow, SaveButton } from "@/components/podcast/podcast-card";
import { FullControls } from "@/components/player/player";
import { usePlayer } from "@/components/player/player";
import { useProfile } from "@/components/layout/use-profile";
import { useLibrary } from "@/components/library/library-state";
import { errorText, formatTime } from "@/lib/format";
import { getPodcast, updateEpisode } from "@/lib/podcast/api";
import { uploadPodcastMp3 } from "@/lib/podcast/media-upload";
import type { PodcastCard } from "@/lib/podcast/types";
import { useState, type ChangeEvent } from "react";

export const Route = createFileRoute("/podcasts/$slug")({
  loader: async ({ params }) => {
    const detail = await getPodcast({ data: params.slug });
    if (!detail) throw notFound();
    return detail;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.podcast.title ?? "Podcast"} · College Podcast Platform` }],
  }),
  component: DetailPage,
  notFoundComponent: () => (
    <PublicFrame>
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-3xl font-semibold">Episode not found</h1>
        <p className="mt-2 text-muted">It may be unpublished, or the link is incorrect.</p>
        <Link to="/podcasts" search={{ q: "", category: "all", sort: "newest", page: 1 }} className="btn btn-primary mt-6">
          Browse podcasts
        </Link>
      </div>
    </PublicFrame>
  ),
});

function DetailPage() {
  const { podcast, related, fromHost } = Route.useLoaderData();
  const library = useLibrary();
  const position = library.positions[podcast.id] ?? 0;
  const resume = position > 3 && position < podcast.durationSeconds - 3 ? position : 0;

  return (
    <PublicFrame>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-line bg-card p-5 shadow-card sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <img
              src={podcast.thumbnailPath ?? "/covers/studio.jpg"}
              alt=""
              className="aspect-square w-full rounded-3xl object-cover sm:size-36"
            />
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold sm:text-3xl">{podcast.title}</h1>
              <p className="mt-2 text-sm text-muted">
                {podcast.speakerName} · {formatTime(podcast.durationSeconds)}
              </p>
              <span className="mt-3 inline-flex rounded-full bg-mist px-2.5 py-1 text-xs font-medium text-violet">
                {podcast.categoryName}
              </span>
            </div>
          </div>
          <div className="mt-6">
            <FullControls podcast={podcast} startAt={resume} />
          </div>
          {resume > 0 ? (
            <p className="mt-2 text-sm text-muted">Continue from {formatTime(resume)} when you press play.</p>
          ) : null}
          <ReplaceAudio podcast={podcast} />
          <div className="mt-4 flex items-center gap-2">
            <LikeButton podcast={podcast} />
            <span className="text-sm text-muted">Like</span>
            <SaveButton podcast={podcast} />
            <span className="text-sm text-muted">Save</span>
            <span className="ml-auto text-sm text-muted">{podcast.playCount} plays</span>
          </div>
        </section>
        <div className="space-y-6">
          <section className="rounded-3xl border border-line bg-card p-5 shadow-card">
            <h2 className="text-lg font-semibold">About this podcast</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{podcast.description}</p>
            {podcast.tags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {podcast.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-paper px-2.5 py-1 text-xs text-muted">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </section>
          {fromHost.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">More from this host</h2>
              {fromHost.map((item) => (
                <PodcastRow key={item.id} podcast={item} />
              ))}
            </section>
          ) : null}
          {related.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Related</h2>
              {related.map((item) => (
                <PodcastRow key={item.id} podcast={item} />
              ))}
            </section>
          ) : null}
        </div>
      </div>
    </PublicFrame>
  );
}

function ReplaceAudio({ podcast }: { podcast: PodcastCard }) {
  const { profile } = useProfile();
  const player = usePlayer();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);

  if (profile?.role !== "creator" && profile?.role !== "admin" && profile?.role !== "superadmin") return null;

  const onSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const uploaded = await uploadPodcastMp3(file);
      const result = await updateEpisode({
        data: {
          id: podcast.id,
          title: podcast.title,
          description: podcast.description,
          speakerName: podcast.speakerName,
          categoryId: podcast.categoryId,
          tags: podcast.tags.join(", "),
          audioPath: uploaded.url,
          durationSeconds: uploaded.durationSeconds,
        },
      });
      if (!result.ok) throw new Error(result.message);
      player.replaceSource({
        ...podcast,
        audioPath: uploaded.url,
        durationSeconds: uploaded.durationSeconds,
      });
      setMessage("Audio replaced. Press Play to listen.");
      setMessageIsError(false);
    } catch (error) {
      setMessage(errorText(error));
      setMessageIsError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-5 rounded-2xl border border-line bg-paper p-4">
      <h2 className="text-sm font-semibold">Having trouble playing this episode?</h2>
      <p className="mt-1 text-xs leading-5 text-muted">
        Replace its audio with an MP3 file (up to 6 MB). Other episode details stay unchanged.
      </p>
      <label className="btn btn-secondary mt-3 inline-flex">
        {busy ? "Replacing audio..." : "Replace audio"}
        <input
          className="sr-only"
          type="file"
          accept=".mp3,audio/mpeg,audio/mp3"
          disabled={busy}
          onChange={(event) => void onSelect(event)}
        />
      </label>
      {message ? (
        <p className={`mt-2 text-sm ${messageIsError ? "text-danger" : "text-violet"}`} role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
