import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { UserFacingError } from "@/lib/podcast/errors";
import {
  adminListSchema,
  categorySchema,
  createPodcastSchema,
  idSchema,
  libraryQuerySchema,
  podcastIdSchema,
  profileSchema,
  progressSchema,
  roleSchema,
  statusSchema,
  updatePodcastSchema,
  userQuerySchema,
} from "@/lib/podcast/schemas";
import type { ActionResult } from "@/lib/podcast/types";

async function read<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof UserFacingError) throw err;
    if (err instanceof Error && err.message === "Unauthorized") throw err;
    console.error(err);
    throw new Error("Something went wrong while loading data.");
  }
}

async function mutate<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof UserFacingError) return { ok: false, message: err.message };
    if (err instanceof Error && err.message === "Unauthorized") {
      return { ok: false, message: "Please sign in to continue." };
    }
    console.error(err);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

function issue(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

export const getHomeFeed = createServerFn({ method: "GET" }).handler(async () => {
  const { homeFeed } = await import("./queries.server");
  return read(() => homeFeed());
});

export const listPodcasts = createServerFn({ method: "GET" })
  .validator((input: unknown) => input)
  .handler(async ({ data }) => {
    const parsed = libraryQuerySchema.safeParse(data ?? {});
    if (!parsed.success) throw new UserFacingError(issue(parsed.error));
    const { queryPublished } = await import("./queries.server");
    return read(() => queryPublished(parsed.data));
  });

export const getPodcast = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data }) => {
    const { podcastBySlug } = await import("./queries.server");
    return read(() => podcastBySlug(data));
  });

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { listCategoryOptions } = await import("./queries.server");
  return read(() => listCategoryOptions());
});

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getProfile } = await import("./queries.server");
    return read(() => getProfile(context.userId));
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => input)
  .handler(async ({ data, context }) => {
    const parsed = profileSchema.safeParse(data);
    if (!parsed.success) return { ok: false as const, message: issue(parsed.error) };
    const { updateProfile } = await import("./queries.server");
    return mutate(() => updateProfile(context.userId, parsed.data));
  });

export const getMyLibrary = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { librarySnapshot } = await import("./queries.server");
    return read(() => librarySnapshot(context.userId));
  });

export const toggleEpisodeLike = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => input)
  .handler(async ({ data, context }) => {
    const parsed = podcastIdSchema.safeParse(data);
    if (!parsed.success) return { ok: false as const, message: issue(parsed.error) };
    const { toggleLike } = await import("./queries.server");
    return mutate(() => toggleLike(context.userId, parsed.data.podcastId));
  });

export const toggleEpisodeSave = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => input)
  .handler(async ({ data, context }) => {
    const parsed = podcastIdSchema.safeParse(data);
    if (!parsed.success) return { ok: false as const, message: issue(parsed.error) };
    const { toggleSave } = await import("./queries.server");
    return mutate(() => toggleSave(context.userId, parsed.data.podcastId));
  });

export const saveListeningProgress = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => input)
  .handler(async ({ data, context }) => {
    const parsed = progressSchema.safeParse(data);
    if (!parsed.success) return { ok: false as const, message: issue(parsed.error) };
    const { saveProgress } = await import("./queries.server");
    return mutate(() => saveProgress(context.userId, parsed.data));
  });

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { dashboard } = await import("./queries.server");
    return read(() => dashboard(context.userId));
  });

export const getSaved = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { savedPodcasts } = await import("./queries.server");
    return read(() => savedPodcasts(context.userId));
  });

export const getHistory = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { listeningHistory } = await import("./queries.server");
    return read(() => listeningHistory(context.userId));
  });

export const createEpisode = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => input)
  .handler(async ({ data, context }) => {
    const parsed = createPodcastSchema.safeParse(data);
    if (!parsed.success) return { ok: false as const, message: issue(parsed.error) };
    const { createPodcast } = await import("./queries.server");
    return mutate(() => createPodcast(context.userId, parsed.data));
  });

export const updateEpisode = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => input)
  .handler(async ({ data, context }) => {
    const parsed = updatePodcastSchema.safeParse(data);
    if (!parsed.success) return { ok: false as const, message: issue(parsed.error) };
    const { updatePodcast } = await import("./queries.server");
    return mutate(() => updatePodcast(context.userId, parsed.data));
  });

export const deleteEpisode = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => input)
  .handler(async ({ data, context }) => {
    const parsed = idSchema.safeParse(data);
    if (!parsed.success) return { ok: false as const, message: issue(parsed.error) };
    const { deletePodcast } = await import("./queries.server");
    return mutate(() => deletePodcast(context.userId, parsed.data.id));
  });

export const getManagedEpisode = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: unknown) => input)
  .handler(async ({ data, context }) => {
    const parsed = idSchema.safeParse(data);
    if (!parsed.success) throw new UserFacingError(issue(parsed.error));
    const { getManagedPodcast } = await import("./queries.server");
    return read(() => getManagedPodcast(context.userId, parsed.data.id));
  });

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { adminOverview } = await import("./queries.server");
    return read(() => adminOverview(context.userId));
  });

export const getAdminPodcasts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: unknown) => input)
  .handler(async ({ data, context }) => {
    const parsed = adminListSchema.safeParse(data ?? {});
    if (!parsed.success) throw new UserFacingError(issue(parsed.error));
    const { adminPodcasts } = await import("./queries.server");
    return read(() => adminPodcasts(context.userId, parsed.data));
  });

export const changeEpisodeStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => input)
  .handler(async ({ data, context }) => {
    const parsed = statusSchema.safeParse(data);
    if (!parsed.success) return { ok: false as const, message: issue(parsed.error) };
    const { setPodcastStatus } = await import("./queries.server");
    return mutate(() => setPodcastStatus(context.userId, parsed.data));
  });

export const getReviewQueue = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { reviewQueue } = await import("./queries.server");
    return read(() => reviewQueue(context.userId));
  });

export const getAdminUsers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: unknown) => input)
  .handler(async ({ data, context }) => {
    const parsed = userQuerySchema.safeParse(data ?? {});
    if (!parsed.success) throw new UserFacingError(issue(parsed.error));
    const { adminUsers } = await import("./queries.server");
    return read(() => adminUsers(context.userId, parsed.data.q));
  });

export const changeUserRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => input)
  .handler(async ({ data, context }) => {
    const parsed = roleSchema.safeParse(data);
    if (!parsed.success) return { ok: false as const, message: issue(parsed.error) };
    const { setUserRole } = await import("./queries.server");
    return mutate(() => setUserRole(context.userId, parsed.data.userId, parsed.data.role));
  });

export const getAdminCategories = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { listCategoryOptions, getProfile } = await import("./queries.server");
    return read(async () => {
      const profile = await getProfile(context.userId);
      if (profile.role !== "admin") throw new UserFacingError("Only an admin can do that.");
      return listCategoryOptions();
    });
  });

export const saveAdminCategory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => input)
  .handler(async ({ data, context }) => {
    const parsed = categorySchema.safeParse(data);
    if (!parsed.success) return { ok: false as const, message: issue(parsed.error) };
    const { saveCategory } = await import("./queries.server");
    return mutate(() => saveCategory(context.userId, parsed.data));
  });

export const deleteAdminCategory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => input)
  .handler(async ({ data, context }) => {
    const parsed = idSchema.safeParse(data);
    if (!parsed.success) return { ok: false as const, message: issue(parsed.error) };
    const { removeCategory } = await import("./queries.server");
    return mutate(() => removeCategory(context.userId, parsed.data.id));
  });
