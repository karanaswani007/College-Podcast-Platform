import { Link } from "@tanstack/react-router";
import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { formatTime } from "@/lib/format";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { saveListeningProgress } from "@/lib/podcast/api";
import type { PodcastCard } from "@/lib/podcast/types";
import { useLibrary } from "@/components/library/library-state";

type PlayerValue = {
  current: PodcastCard | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  error: string | null;
  start: (podcast: PodcastCard, at?: number) => void;
  replaceSource: (podcast: PodcastCard) => void;
  toggle: () => void;
  seek: (time: number) => void;
  skip: (delta: number) => void;
  setVolume: (volume: number) => void;
};

const PlayerContext = createContext<PlayerValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useCurrentUserState();
  const library = useLibrary();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentRef = useRef<PodcastCard | null>(null);
  const userIdRef = useRef<string | null>(null);
  const playAttemptRef = useRef(0);
  const skipPauseProgressRef = useRef(false);
  const pendingStart = useRef<number | null>(null);
  const lastSent = useRef(-1);
  const setPositionRef = useRef(library.setPosition);
  userIdRef.current = user?.id ?? null;
  setPositionRef.current = library.setPosition;

  const [current, setCurrent] = useState<PodcastCard | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.9);
  const [error, setError] = useState<string | null>(null);

  const pushProgress = async () => {
    const audio = audioRef.current;
    const podcast = currentRef.current;
    if (!audio || !podcast || !userIdRef.current) return;
    const position = Math.floor(audio.currentTime);
    if (position < 1 || Math.abs(position - lastSent.current) < 1) return;
    lastSent.current = position;
    const reportedDuration = Math.floor(Number.isFinite(audio.duration) ? audio.duration : podcast.durationSeconds);
    setPositionRef.current(podcast.id, position);
    try {
      await saveListeningProgress({
        data: { podcastId: podcast.id, position, duration: reportedDuration },
      });
    } catch {
      /* progress is best-effort */
    }
  };

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.volume = 0.9;
    audioRef.current = audio;
    const stored = window.localStorage.getItem("cpp-volume");
    if (stored) {
      const next = Number(stored);
      if (Number.isFinite(next) && next >= 0 && next <= 1) {
        audio.volume = next;
        setVolumeState(next);
      }
    }
    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onMeta = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      if (pendingStart.current && pendingStart.current > 0) {
        audio.currentTime = pendingStart.current;
        pendingStart.current = null;
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      if (skipPauseProgressRef.current) {
        skipPauseProgressRef.current = false;
        return;
      }
      void pushProgress();
    };
    const onEnded = () => {
      setPlaying(false);
      void pushProgress();
    };
    const onError = () => {
      setPlaying(false);
      setError(playbackErrorMessage(null, audio.error));
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    const onHide = () => void pushProgress();
    window.addEventListener("pagehide", onHide);
    const timer = window.setInterval(() => {
      if (!audio.paused && !audio.ended) void pushProgress();
    }, 8000);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", onHide);
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
    // The audio element is created once. Progress uses refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = (podcast: PodcastCard, at = 0) => {
    const audio = audioRef.current;
    if (!audio) return;
    setError(null);
    if (currentRef.current?.id !== podcast.id) {
      pendingStart.current = at > 0 ? at : null;
      lastSent.current = -1;
      audio.src = podcast.audioPath;
      currentRef.current = podcast;
      setCurrent(podcast);
      setCurrentTime(at > 0 ? at : 0);
      setDuration(podcast.durationSeconds);
    } else if (at > 0) {
      audio.currentTime = at;
      setCurrentTime(at);
    }
    requestPlay(audio);
  };

  const replaceSource = (podcast: PodcastCard) => {
    const audio = audioRef.current;
    if (!audio) return;
    playAttemptRef.current += 1;
    if (!audio.paused) {
      skipPauseProgressRef.current = true;
      audio.pause();
    }
    audio.src = podcast.audioPath;
    audio.load();
    currentRef.current = podcast;
    pendingStart.current = null;
    lastSent.current = -1;
    setCurrent(podcast);
    setCurrentTime(0);
    setDuration(podcast.durationSeconds);
    setPlaying(false);
    setError(null);
  };

  const requestPlay = (audio: HTMLAudioElement) => {
    const attempt = ++playAttemptRef.current;
    setError(null);
    void audio.play().catch((reason: unknown) => {
      if (attempt !== playAttemptRef.current) return;
      setPlaying(false);
      setError(playbackErrorMessage(reason, audio.error));
    });
  };

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || !currentRef.current) return;
    if (audio.paused) {
      requestPlay(audio);
    } else {
      playAttemptRef.current += 1;
      audio.pause();
    }
  };

  const seek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const max = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : time;
    const next = Math.min(Math.max(0, time), max);
    audio.currentTime = next;
    setCurrentTime(next);
  };

  const skip = (delta: number) => {
    const audio = audioRef.current;
    seek((audio?.currentTime ?? 0) + delta);
  };

  const setVolume = (next: number) => {
    const value = Math.min(1, Math.max(0, next));
    setVolumeState(value);
    if (audioRef.current) audioRef.current.volume = value;
    window.localStorage.setItem("cpp-volume", String(value));
  };

  const value = useMemo(
    () => ({ current, playing, currentTime, duration, volume, error, start, replaceSource, toggle, seek, skip, setVolume }),
    [current, playing, currentTime, duration, volume, error],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const value = useContext(PlayerContext);
  if (!value) throw new Error("usePlayer must be used inside PlayerProvider");
  return value;
}

function playbackErrorMessage(reason: unknown, mediaError: MediaError | null): string {
  const name =
    typeof reason === "object" && reason !== null && "name" in reason
      ? String(reason.name)
      : "";
  if (name === "NotAllowedError") {
    return "Your browser blocked audio playback. Press Play again to start listening.";
  }
  if (name === "AbortError" || mediaError?.code === MediaError.MEDIA_ERR_ABORTED) {
    return "Playback was interrupted. Press Play to resume.";
  }
  if (name === "NotSupportedError" || mediaError?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
    return "This audio format is not supported by your browser.";
  }
  if (mediaError?.code === MediaError.MEDIA_ERR_NETWORK) {
    return "The audio could not be loaded. Check your connection and try again.";
  }
  if (mediaError?.code === MediaError.MEDIA_ERR_DECODE) {
    return "This audio file could not be decoded. Try another file.";
  }
  if (reason instanceof Error && reason.message) return reason.message;
  return "Playback could not start. Press Play to try again.";
}

export function PlayerBar() {
  const player = usePlayer();
  if (!player.current) return null;
  const duration = player.duration || player.current.durationSeconds || 0;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2">
        <Link
          to="/podcasts/$slug"
          params={{ slug: player.current.slug }}
          className="shrink-0"
        >
          <img
            src={player.current.thumbnailPath ?? "/covers/studio.jpg"}
            alt=""
            className="size-12 rounded-xl object-cover"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to="/podcasts/$slug"
            params={{ slug: player.current.slug }}
            className="block truncate text-sm font-semibold"
          >
            {player.current.title}
          </Link>
          <input
            className="scrub"
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={Math.min(player.currentTime, duration || 1)}
            aria-label="Seek"
            onChange={(event) => player.seek(Number(event.target.value))}
          />
        </div>
        <span className="hidden text-xs text-muted sm:block">
          {formatTime(player.currentTime)} / {formatTime(duration)}
        </span>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-full bg-violet text-on-violet"
          aria-label={player.playing ? "Pause" : "Play"}
          onClick={player.toggle}
        >
          {player.playing ? <Pause className="size-5" /> : <Play className="size-5" />}
        </button>
      </div>
    </div>
  );
}

export function FullControls({ podcast, startAt = 0 }: { podcast: PodcastCard; startAt?: number }) {
  const player = usePlayer();
  const active = player.current?.id === podcast.id;
  const duration = active ? player.duration || podcast.durationSeconds : podcast.durationSeconds;
  const time = active ? player.currentTime : 0;
  const toggleHere = () => {
    if (active) player.toggle();
    else player.start(podcast, startAt);
  };
  return (
    <div>
      {player.error && active ? (
        <p role="alert" className="mb-3 text-sm text-rose">
          {player.error}
        </p>
      ) : null}
      <input
        className="scrub"
        type="range"
        min={0}
        max={duration || 1}
        step={0.1}
        value={Math.min(time, duration || 1)}
        aria-label="Seek through episode"
        onChange={(event) => {
          if (!active) player.start(podcast, Number(event.target.value));
          else player.seek(Number(event.target.value));
        }}
      />
      <div className="mt-1 flex justify-between text-xs text-muted">
        <span>{formatTime(time)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      <div className="mt-4 flex items-center justify-center gap-4">
        <button type="button" className="icon-btn" aria-label="Back 10 seconds" onClick={() => (active ? player.skip(-10) : player.start(podcast, Math.max(0, startAt - 10)))}>
          <RotateCcw className="size-5" />
        </button>
        <button
          type="button"
          className="grid size-16 place-items-center rounded-full bg-violet text-on-violet"
          aria-label={active && player.playing ? "Pause" : "Play"}
          onClick={toggleHere}
        >
          {active && player.playing ? <Pause className="size-7" /> : <Play className="size-7" />}
        </button>
        <button type="button" className="icon-btn" aria-label="Forward 10 seconds" onClick={() => (active ? player.skip(10) : player.start(podcast, startAt + 10))}>
          <RotateCw className="size-5" />
        </button>
      </div>
      <label className="mt-4 flex items-center gap-3 text-sm text-muted">
        Volume
        <input
          className="scrub"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={player.volume}
          aria-label="Volume"
          onChange={(event) => player.setVolume(Number(event.target.value))}
        />
      </label>
    </div>
  );
}
