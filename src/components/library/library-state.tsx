import { useNavigate } from "@tanstack/react-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { errorText } from "@/lib/format";
import { getMyLibrary, toggleEpisodeLike, toggleEpisodeSave } from "@/lib/podcast/api";

type LibraryValue = {
  ready: boolean;
  liked: Record<string, true>;
  saved: Record<string, true>;
  positions: Record<string, number>;
  toggleLike: (podcastId: string) => Promise<{ liked: boolean; likeCount: number } | null>;
  toggleSave: (podcastId: string) => Promise<{ saved: boolean } | null>;
  setPosition: (podcastId: string, position: number) => void;
};

const LibraryContext = createContext<LibraryValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [liked, setLiked] = useState<Record<string, true>>({});
  const [saved, setSaved] = useState<Record<string, true>>({});
  const [positions, setPositions] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  const userId = user?.id;

  useEffect(() => {
    if (isPending) return;
    if (!userId) {
      setLiked({});
      setSaved({});
      setPositions({});
      setReady(true);
      return;
    }
    let cancel = false;
    setReady(false);
    getMyLibrary()
      .then((snapshot) => {
        if (cancel) return;
        setLiked(Object.fromEntries(snapshot.likes.map((id) => [id, true as const])));
        setSaved(Object.fromEntries(snapshot.saves.map((id) => [id, true as const])));
        setPositions(snapshot.positions);
        setReady(true);
      })
      .catch(() => {
        if (!cancel) setReady(true);
      });
    return () => {
      cancel = true;
    };
  }, [isPending, userId]);

  const requireUser = useCallback(() => {
    if (userId) return true;
    void navigate({ to: "/login", search: { mode: "login" } });
    return false;
  }, [navigate, userId]);

  const toggleLike = useCallback(
    async (podcastId: string) => {
      if (!requireUser()) return null;
      try {
        const result = await toggleEpisodeLike({ data: { podcastId } });
        if (!result.ok) {
          toast.error(result.message);
          return null;
        }
        setLiked((current) => {
          const next = { ...current };
          if (result.data.liked) next[podcastId] = true;
          else delete next[podcastId];
          return next;
        });
        return result.data;
      } catch (err) {
        toast.error(errorText(err));
        return null;
      }
    },
    [requireUser],
  );

  const toggleSave = useCallback(
    async (podcastId: string) => {
      if (!requireUser()) return null;
      try {
        const result = await toggleEpisodeSave({ data: { podcastId } });
        if (!result.ok) {
          toast.error(result.message);
          return null;
        }
        setSaved((current) => {
          const next = { ...current };
          if (result.data.saved) next[podcastId] = true;
          else delete next[podcastId];
          return next;
        });
        return result.data;
      } catch (err) {
        toast.error(errorText(err));
        return null;
      }
    },
    [requireUser],
  );

  const setPosition = useCallback((podcastId: string, position: number) => {
    setPositions((current) => ({ ...current, [podcastId]: position }));
  }, []);

  const value = useMemo(
    () => ({ ready, liked, saved, positions, toggleLike, toggleSave, setPosition }),
    [ready, liked, saved, positions, toggleLike, toggleSave, setPosition],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const value = useContext(LibraryContext);
  if (!value) throw new Error("useLibrary must be used inside LibraryProvider");
  return value;
}
