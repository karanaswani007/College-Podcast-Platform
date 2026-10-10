import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { errorText } from "@/lib/format";
import { getMyProfile } from "@/lib/podcast/api";
import type { Profile } from "@/lib/podcast/types";

export function useProfile() {
  const { user, isPending } = useCurrentUserState();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const userId = user?.id;

  useEffect(() => {
    if (isPending) return;
    if (!userId) {
      setProfile(null);
      setError(null);
      return;
    }
    let cancel = false;
    setProfile(null);
    setError(null);
    getMyProfile()
      .then((next) => {
        if (!cancel) setProfile(next);
      })
      .catch((err) => {
        if (!cancel) setError(errorText(err));
      });
    return () => {
      cancel = true;
    };
  }, [isPending, userId]);

  return { user, isPending, profile, error };
}
