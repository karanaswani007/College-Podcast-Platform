import { Link } from "@tanstack/react-router";
import { Bookmark, Heart, Pause, Play } from "lucide-react";
import { useState } from "react";
import { useLibrary } from "@/components/library/library-state";
import { usePlayer } from "@/components/player/player";
import { formatTime } from "@/lib/format";
import type { PodcastCard } from "@/lib/podcast/types";

export function FeatureCard({ podcast }: { podcast: PodcastCard }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-line bg-card shadow-card">
      <div className="relative">
        <Link to="/podcasts/$slug" params={{ slug: podcast.slug }} className="block aspect-[16/10] overflow-hidden">
          <Cover podcast={podcast} />
        </Link>
        <div className="absolute bottom-3 right-3">
          <RoundPlay podcast={podcast} />
        </div>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="font-semibold">
          <Link to="/podcasts/$slug" params={{ slug: podcast.slug }}>
            {podcast.title}
          </Link>
        </h3>
        <p className="text-sm text-muted">{podcast.speakerName}</p>
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-mist px-2.5 py-1 text-xs font-medium text-violet">{podcast.categoryName}</span>
          <span className="text-sm text-muted">{formatTime(podcast.durationSeconds)}</span>
        </div>
      </div>
    </article>
  );
}

export function PodcastRow({
  podcast,
  position,
}: {
  podcast: PodcastCard;
  position?: number;
}) {
  const progress = position && podcast.durationSeconds ? Math.min(100, (position / podcast.durationSeconds) * 100) : 0;
  return (
    <article className="rounded-3xl border border-line bg-card p-3 shadow-card">
      <div className="flex items-center gap-3">
        <Link to="/podcasts/$slug" params={{ slug: podcast.slug }} className="shrink-0">
          <img src={podcast.thumbnailPath ?? "/covers/studio.jpg"} alt="" className="size-16 rounded-2xl object-cover" />
        </Link>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">
            <Link to="/podcasts/$slug" params={{ slug: podcast.slug }}>
              {podcast.title}
            </Link>
          </h3>
          <p className="truncate text-sm text-muted">{podcast.speakerName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-mist px-2 py-0.5 font-medium text-violet">{podcast.categoryName}</span>
            <span className="text-muted">{formatTime(podcast.durationSeconds)}</span>
          </div>
          {progress > 0 ? (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-line" aria-hidden>
              <div className="h-full bg-violet" style={{ width: `${progress}%` }} />
            </div>
          ) : null}
        </div>
        <RoundPlay podcast={podcast} at={position} />
        <LikeButton podcast={podcast} />
        <SaveButton podcast={podcast} />
      </div>
    </article>
  );
}

export function LikeButton({ podcast }: { podcast: PodcastCard }) {
  const library = useLibrary();
  const liked = Boolean(library.liked[podcast.id]);
  const [count, setCount] = useState(podcast.likeCount);
  return (
    <button
      type="button"
      className={`icon-btn ${liked ? "text-rose" : ""}`}
      aria-pressed={liked}
      aria-label={liked ? `Unlike ${podcast.title}` : `Like ${podcast.title}`}
      onClick={() => {
        void library.toggleLike(podcast.id).then((result) => {
          if (result) setCount(result.likeCount);
        });
      }}
    >
      <Heart className="size-5" fill={liked ? "currentColor" : "none"} />
      <span className="text-xs">{count}</span>
    </button>
  );
}

export function SaveButton({ podcast }: { podcast: PodcastCard }) {
  const library = useLibrary();
  const saved = Boolean(library.saved[podcast.id]);
  return (
    <button
      type="button"
      className={`icon-btn ${saved ? "text-violet" : ""}`}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${podcast.title} from saved` : `Save ${podcast.title}`}
      onClick={() => void library.toggleSave(podcast.id)}
    >
      <Bookmark className="size-5" fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

function RoundPlay({ podcast, at }: { podcast: PodcastCard; at?: number }) {
  const player = usePlayer();
  const active = player.current?.id === podcast.id;
  return (
    <button
      type="button"
      className="grid size-11 shrink-0 place-items-center rounded-full bg-violet text-on-violet"
      aria-label={active && player.playing ? `Pause ${podcast.title}` : `Play ${podcast.title}`}
      onClick={() => {
        if (active) player.toggle();
        else player.start(podcast, at && at > 3 ? at : 0);
      }}
    >
      {active && player.playing ? <Pause className="size-5" /> : <Play className="size-5" />}
    </button>
  );
}

function Cover({ podcast }: { podcast: PodcastCard }) {
  return (
    <img
      src={podcast.thumbnailPath ?? "/covers/studio.jpg"}
      alt=""
      className="h-full w-full object-cover"
    />
  );
}

export function StatusPill({ status }: { status: string }) {
  const styles =
    status === "published"
      ? "bg-mint-soft text-mint"
      : status === "rejected"
        ? "bg-rose-soft text-rose"
        : status === "pending"
          ? "bg-mist text-violet"
          : "bg-paper text-muted";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${styles}`}>{status}</span>;
}
