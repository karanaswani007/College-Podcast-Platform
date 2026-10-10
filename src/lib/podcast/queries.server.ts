import { getSql, type Sql } from "@/lib/db";
import { DEMO_CATEGORIES, DEMO_EPISODES } from "@/lib/podcast/demo-catalog";
import { UserFacingError } from "@/lib/podcast/errors";
import {
  categoryFilter,
  cleanTags,
  mediaIdFromPath,
  pageNumber,
  searchTerm,
  shouldCountPlay,
  slugify,
} from "@/lib/podcast/rules";
import type {
  AdminOverview,
  AdminUser,
  CategoryCard,
  DashboardData,
  HistoryItem,
  HomeFeed,
  LibraryPage,
  LibrarySnapshot,
  ManagedPodcast,
  PodcastCard,
  PodcastDetail,
  PodcastStatus,
  Profile,
  ReviewItem,
  Role,
} from "@/lib/podcast/types";

const PAGE_SIZE = 6;

const CARD_SELECT = `
  p.id, p.title, p.slug, p.description, p.speaker_name, p.category_id,
  c.name as category_name, c.slug as category_slug,
  p.audio_path, p.thumbnail_path, p.duration_seconds, p.status, p.tags,
  p.created_by, p.rejection_reason,
  p.published_at::text as published_at, p.created_at::text as created_at,
  (select count(*)::int from podcast_likes l where l.podcast_id = p.id) as like_count,
  (select count(*)::int from podcast_plays pl where pl.podcast_id = p.id) as play_count
`;

let seedTask: Promise<void> | null = null;

async function database(): Promise<Sql> {
  const sql = await getSql();
  if (!seedTask) {
    seedTask = runSeed(sql).catch((err) => {
      seedTask = null;
      throw err;
    });
  }
  await seedTask;
  return sql;
}

async function runSeed(sql: Sql) {
  const flagged = await sql.query<{ value: string }>(
    "select value from app_meta where key = 'seeded'",
  );
  if (flagged.length > 0) return;
  for (const category of DEMO_CATEGORIES) {
    await sql.query(
      `insert into categories (id, name, slug, description, icon)
       values ($1, $2, $3, $4, $5)
       on conflict (id) do nothing`,
      [category.id, category.name, category.slug, category.description, category.icon],
    );
  }
  for (const episode of DEMO_EPISODES) {
    const publishedAt = new Date(Date.now() - episode.ageDays * 86_400_000).toISOString();
    await sql.query(
      `insert into podcasts (
         id, title, slug, description, speaker_name, category_id, audio_path, thumbnail_path,
         duration_seconds, status, tags, created_by, approved_by, published_at
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'published',$10,'demo-catalog','demo-catalog',$11)
       on conflict (id) do nothing`,
      [
        episode.id,
        episode.title,
        episode.slug,
        episode.description,
        episode.speakerName,
        episode.categoryId,
        episode.audioPath,
        episode.thumbnailPath,
        episode.durationSeconds,
        episode.tags,
        publishedAt,
      ],
    );
  }
  await sql.query(
    "insert into app_meta (key, value) values ('seeded', '1') on conflict (key) do nothing",
  );
}

function asStatus(value: unknown): PodcastStatus {
  if (value === "draft" || value === "pending" || value === "published" || value === "rejected") {
    return value;
  }
  return "draft";
}

function mapRow(row: Record<string, unknown>): ManagedPodcast {
  const tags = String(row.tags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  return {
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    description: String(row.description),
    speakerName: String(row.speaker_name),
    categoryId: String(row.category_id),
    categoryName: String(row.category_name),
    categorySlug: String(row.category_slug),
    audioPath: String(row.audio_path),
    thumbnailPath: row.thumbnail_path ? String(row.thumbnail_path) : null,
    durationSeconds: Number(row.duration_seconds ?? 0),
    status: asStatus(row.status),
    tags,
    likeCount: Number(row.like_count ?? 0),
    playCount: Number(row.play_count ?? 0),
    publishedAt: row.published_at ? String(row.published_at) : null,
    createdAt: String(row.created_at ?? ""),
    createdBy: String(row.created_by ?? ""),
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : null,
  };
}

function toPublic(row: ManagedPodcast): PodcastCard {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    speakerName: row.speakerName,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    categorySlug: row.categorySlug,
    audioPath: row.audioPath,
    thumbnailPath: row.thumbnailPath,
    durationSeconds: row.durationSeconds,
    status: row.status,
    tags: row.tags,
    likeCount: row.likeCount,
    playCount: row.playCount,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
  };
}

async function listCategories(sql: Sql): Promise<CategoryCard[]> {
  const rows = await sql.query<Record<string, unknown>>(
    `select c.id, c.name, c.slug, c.description, c.icon,
       (select count(*)::int from podcasts p where p.category_id = c.id and p.status = 'published') as podcast_count
     from categories c
     order by c.name`,
  );
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: String(row.description ?? ""),
    icon: String(row.icon ?? "mic"),
    podcastCount: Number(row.podcast_count ?? 0),
  }));
}

export async function homeFeed(): Promise<HomeFeed> {
  const sql = await database();
  const featured = await sql.query<Record<string, unknown>>(
    `select ${CARD_SELECT}
     from podcasts p join categories c on c.id = p.category_id
     where p.status = 'published'
     order by p.published_at desc
     limit 4`,
  );
  const more = await sql.query<Record<string, unknown>>(
    `select ${CARD_SELECT}
     from podcasts p join categories c on c.id = p.category_id
     where p.status = 'published'
     order by p.published_at desc
     limit 4 offset 4`,
  );
  return {
    featured: featured.map((row) => toPublic(mapRow(row))),
    more: more.map((row) => toPublic(mapRow(row))),
    categories: await listCategories(sql),
  };
}

export async function queryPublished(input: {
  q?: string;
  category?: string;
  sort?: "newest" | "popular";
  page?: number;
}): Promise<LibraryPage> {
  const sql = await database();
  const term = searchTerm(input.q);
  const category = categoryFilter(input.category);
  const page = pageNumber(input.page);
  const sort = input.sort === "popular" ? "popular" : "newest";
  const where = `
    p.status = 'published'
    and ($1 = '' or p.title ilike $2 or p.description ilike $2 or p.speaker_name ilike $2)
    and ($3 = 'all' or c.slug = $3)
  `;
  const params = [term, `%${term}%`, category];
  const order =
    sort === "popular"
      ? "play_count desc, p.published_at desc"
      : "p.published_at desc, p.created_at desc";
  const countRows = await sql.query<{ n: number }>(
    `select count(*)::int as n
     from podcasts p join categories c on c.id = p.category_id
     where ${where}`,
    params,
  );
  const rows = await sql.query<Record<string, unknown>>(
    `select ${CARD_SELECT}
     from podcasts p join categories c on c.id = p.category_id
     where ${where}
     order by ${order}
     limit $4 offset $5`,
    [...params, PAGE_SIZE, (page - 1) * PAGE_SIZE],
  );
  return {
    items: rows.map((row) => toPublic(mapRow(row))),
    total: Number(countRows[0]?.n ?? 0),
    page,
    pageSize: PAGE_SIZE,
    categories: await listCategories(sql),
  };
}

export async function podcastBySlug(slug: string): Promise<PodcastDetail | null> {
  const sql = await database();
  const rows = await sql.query<Record<string, unknown>>(
    `select ${CARD_SELECT}
     from podcasts p join categories c on c.id = p.category_id
     where p.slug = $1 and p.status = 'published'`,
    [slug],
  );
  const first = rows[0];
  if (!first) return null;
  const podcast = toPublic(mapRow(first));
  const fromHostRows = await sql.query<Record<string, unknown>>(
    `select ${CARD_SELECT}
     from podcasts p join categories c on c.id = p.category_id
     where p.status = 'published' and p.speaker_name = $1 and p.id <> $2
     order by p.published_at desc
     limit 3`,
    [podcast.speakerName, podcast.id],
  );
  const fromHost = fromHostRows.map((row) => toPublic(mapRow(row)));
  const relatedRows = await sql.query<Record<string, unknown>>(
    `select ${CARD_SELECT}
     from podcasts p join categories c on c.id = p.category_id
     where p.status = 'published' and p.category_id = $1 and p.id <> $2
     order by p.published_at desc
     limit 8`,
    [podcast.categoryId, podcast.id],
  );
  const hostIds = new Set(fromHost.map((item) => item.id));
  const related = relatedRows
    .map((row) => toPublic(mapRow(row)))
    .filter((item) => !hostIds.has(item.id))
    .slice(0, 3);
  return { podcast, fromHost, related };
}

export async function listCategoryOptions(): Promise<CategoryCard[]> {
  const sql = await database();
  return listCategories(sql);
}

async function ensureProfile(sql: Sql, userId: string): Promise<Profile> {
  const existing = await sql.query<Record<string, unknown>>(
    "select id, display_name, avatar_url, role from profiles where id = $1",
    [userId],
  );
  if (!existing[0]) {
    const users = await sql.query<{ name: string }>(`select name from "user" where id = $1`, [userId]);
    const name = String(users[0]?.name ?? "Student").trim().slice(0, 80) || "Student";
    const admins = await sql.query<{ n: number }>(
      "select count(*)::int as n from profiles where role = 'admin'",
    );
    const role: Role = Number(admins[0]?.n ?? 0) === 0 ? "admin" : "student";
    await sql.query(
      `insert into profiles (id, display_name, role) values ($1, $2, $3) on conflict (id) do nothing`,
      [userId, name, role],
    );
  }
  const rows = await sql.query<Record<string, unknown>>(
    `select p.id, p.display_name, p.avatar_url, p.role, u.email
     from profiles p
     left join "user" u on u.id = p.id
     where p.id = $1`,
    [userId],
  );
  const row = rows[0];
  if (!row) throw new UserFacingError("Your profile could not be created.");
  const role = row.role === "admin" || row.role === "creator" || row.role === "student" ? row.role : "student";
  let pendingCount = 0;
  if (role === "admin") {
    const pending = await sql.query<{ n: number }>(
      "select count(*)::int as n from podcasts where status = 'pending'",
    );
    pendingCount = Number(pending[0]?.n ?? 0);
  }
  return {
    id: String(row.id),
    displayName: String(row.display_name),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    role,
    email: row.email ? String(row.email) : null,
    pendingCount,
  };
}

function assertStaff(profile: Profile) {
  if (profile.role !== "admin" && profile.role !== "creator") {
    throw new UserFacingError("Ask an admin to grant creator access before uploading.");
  }
}

function assertAdmin(profile: Profile) {
  if (profile.role !== "admin") throw new UserFacingError("Only an admin can do that.");
}

export async function getProfile(userId: string): Promise<Profile> {
  const sql = await database();
  return ensureProfile(sql, userId);
}

export async function updateProfile(
  userId: string,
  input: { displayName: string; avatarUrl?: string | null },
): Promise<Profile> {
  const sql = await database();
  const current = await ensureProfile(sql, userId);
  let nextAvatar = current.avatarUrl;
  if (input.avatarUrl !== undefined) {
    if (!input.avatarUrl) nextAvatar = null;
    else {
      await assertOwnedMedia(sql, userId, input.avatarUrl, "image");
      nextAvatar = input.avatarUrl;
    }
  }
  await sql.query(
    "update profiles set display_name = $2, avatar_url = $3, updated_at = now() where id = $1",
    [userId, input.displayName.trim(), nextAvatar],
  );
  if (current.avatarUrl && current.avatarUrl !== nextAvatar) {
    await maybeDeleteMedia(sql, userId, false, current.avatarUrl);
  }
  return ensureProfile(sql, userId);
}

export async function librarySnapshot(userId: string): Promise<LibrarySnapshot> {
  const sql = await database();
  const likes = await sql.query<{ podcast_id: string }>(
    "select podcast_id from podcast_likes where user_id = $1",
    [userId],
  );
  const saves = await sql.query<{ podcast_id: string }>(
    "select podcast_id from saved_podcasts where user_id = $1",
    [userId],
  );
  const positions = await sql.query<{ podcast_id: string; playback_position_seconds: number }>(
    "select podcast_id, playback_position_seconds from listening_history where user_id = $1",
    [userId],
  );
  const map: Record<string, number> = {};
  for (const row of positions) map[row.podcast_id] = Number(row.playback_position_seconds);
  return {
    likes: likes.map((row) => row.podcast_id),
    saves: saves.map((row) => row.podcast_id),
    positions: map,
  };
}

async function requirePublished(sql: Sql, podcastId: string) {
  const rows = await sql.query<{ status: string }>("select status from podcasts where id = $1", [podcastId]);
  if (!rows[0] || rows[0].status !== "published") {
    throw new UserFacingError("Only published episodes can be saved or liked.");
  }
}

export async function toggleLike(userId: string, podcastId: string) {
  const sql = await database();
  await requirePublished(sql, podcastId);
  const existing = await sql.query(
    "select 1 from podcast_likes where user_id = $1 and podcast_id = $2",
    [userId, podcastId],
  );
  if (existing.length) {
    await sql.query("delete from podcast_likes where user_id = $1 and podcast_id = $2", [userId, podcastId]);
  } else {
    await sql.query(
      "insert into podcast_likes (user_id, podcast_id) values ($1, $2) on conflict do nothing",
      [userId, podcastId],
    );
  }
  const count = await sql.query<{ n: number }>(
    "select count(*)::int as n from podcast_likes where podcast_id = $1",
    [podcastId],
  );
  return { liked: existing.length === 0, likeCount: Number(count[0]?.n ?? 0) };
}

export async function toggleSave(userId: string, podcastId: string) {
  const sql = await database();
  await requirePublished(sql, podcastId);
  const existing = await sql.query(
    "select 1 from saved_podcasts where user_id = $1 and podcast_id = $2",
    [userId, podcastId],
  );
  if (existing.length) {
    await sql.query("delete from saved_podcasts where user_id = $1 and podcast_id = $2", [userId, podcastId]);
    return { saved: false };
  }
  await sql.query(
    "insert into saved_podcasts (user_id, podcast_id) values ($1, $2) on conflict do nothing",
    [userId, podcastId],
  );
  return { saved: true };
}

export async function saveProgress(
  userId: string,
  input: { podcastId: string; position: number; duration: number },
) {
  const sql = await database();
  const position = Math.floor(input.position);
  const duration = Math.floor(input.duration);
  const rows = await sql.query<Record<string, unknown>>(
    "select id, status, created_by, duration_seconds from podcasts where id = $1",
    [input.podcastId],
  );
  const podcast = rows[0];
  if (!podcast) throw new UserFacingError("That episode could not be found.");
  const profile = await ensureProfile(sql, userId);
  const allowed =
    podcast.status === "published" || podcast.created_by === userId || profile.role === "admin";
  if (!allowed) throw new UserFacingError("You do not have permission to record progress for that episode.");
  const effective = duration || Number(podcast.duration_seconds ?? 0);
  if (effective > 0 && position > effective + 5) {
    throw new UserFacingError("That playback position is not valid.");
  }
  const completed = effective > 0 && position >= effective - 3;
  await sql.query(
    `insert into listening_history (user_id, podcast_id, playback_position_seconds, completed, last_listened_at)
     values ($1, $2, $3, $4, now())
     on conflict (user_id, podcast_id) do update set
       playback_position_seconds = excluded.playback_position_seconds,
       completed = listening_history.completed or excluded.completed,
       last_listened_at = now()`,
    [userId, input.podcastId, position, completed],
  );
  let counted = false;
  if (podcast.status === "published" && shouldCountPlay(position, effective)) {
    const inserted = await sql.query(
      `insert into podcast_plays (id, user_id, podcast_id)
       values ($1, $2, $3)
       on conflict (user_id, podcast_id) do nothing
       returning id`,
      [crypto.randomUUID(), userId, input.podcastId],
    );
    counted = inserted.length > 0;
  }
  return { counted, position };
}

function mapHistory(row: Record<string, unknown>): HistoryItem {
  return {
    ...toPublic(mapRow(row)),
    positionSeconds: Number(row.playback_position_seconds ?? 0),
    completed: Boolean(row.completed),
    lastListenedAt: String(row.last_listened_at ?? ""),
  };
}

export async function dashboard(userId: string): Promise<DashboardData> {
  const sql = await database();
  const played = await sql.query<{ n: number }>(
    `select count(*)::int as n from listening_history h
     join podcasts p on p.id = h.podcast_id
     where h.user_id = $1 and p.status = 'published'`,
    [userId],
  );
  const saved = await sql.query<{ n: number }>(
    `select count(*)::int as n from saved_podcasts s
     join podcasts p on p.id = s.podcast_id
     where s.user_id = $1 and p.status = 'published'`,
    [userId],
  );
  const inProgress = await sql.query<{ n: number }>(
    `select count(*)::int as n from listening_history
     where user_id = $1 and completed = false and playback_position_seconds > 0`,
    [userId],
  );
  const recentRows = await sql.query<Record<string, unknown>>(
    `select ${CARD_SELECT}, h.playback_position_seconds, h.completed, h.last_listened_at::text as last_listened_at
     from listening_history h
     join podcasts p on p.id = h.podcast_id
     join categories c on c.id = p.category_id
     where h.user_id = $1 and p.status = 'published'
     order by h.last_listened_at desc
     limit 6`,
    [userId],
  );
  const continueRows = await sql.query<Record<string, unknown>>(
    `select ${CARD_SELECT}, h.playback_position_seconds, h.completed, h.last_listened_at::text as last_listened_at
     from listening_history h
     join podcasts p on p.id = h.podcast_id
     join categories c on c.id = p.category_id
     where h.user_id = $1 and p.status = 'published' and h.completed = false and h.playback_position_seconds > 0
     order by h.last_listened_at desc
     limit 1`,
    [userId],
  );
  const recommendedRows = await sql.query<Record<string, unknown>>(
    `select ${CARD_SELECT}
     from podcasts p join categories c on c.id = p.category_id
     where p.status = 'published'
       and not exists (
         select 1 from listening_history h where h.user_id = $1 and h.podcast_id = p.id
       )
     order by p.published_at desc
     limit 4`,
    [userId],
  );
  return {
    played: Number(played[0]?.n ?? 0),
    saved: Number(saved[0]?.n ?? 0),
    inProgress: Number(inProgress[0]?.n ?? 0),
    recent: recentRows.map(mapHistory),
    continueListening: continueRows[0] ? mapHistory(continueRows[0]) : null,
    recommended: recommendedRows.map((row) => toPublic(mapRow(row))),
  };
}

export async function savedPodcasts(userId: string): Promise<PodcastCard[]> {
  const sql = await database();
  const rows = await sql.query<Record<string, unknown>>(
    `select ${CARD_SELECT}
     from saved_podcasts s
     join podcasts p on p.id = s.podcast_id
     join categories c on c.id = p.category_id
     where s.user_id = $1 and p.status = 'published'
     order by s.created_at desc`,
    [userId],
  );
  return rows.map((row) => toPublic(mapRow(row)));
}

export async function listeningHistory(userId: string): Promise<HistoryItem[]> {
  const sql = await database();
  const rows = await sql.query<Record<string, unknown>>(
    `select ${CARD_SELECT}, h.playback_position_seconds, h.completed, h.last_listened_at::text as last_listened_at
     from listening_history h
     join podcasts p on p.id = h.podcast_id
     join categories c on c.id = p.category_id
     where h.user_id = $1 and p.status = 'published'
     order by h.last_listened_at desc`,
    [userId],
  );
  return rows.map(mapHistory);
}

async function assertOwnedMedia(sql: Sql, userId: string, path: string, kind: "audio" | "image") {
  const id = mediaIdFromPath(path);
  if (!id) throw new UserFacingError("Upload the file again before saving.");
  const rows = await sql.query<{ kind: string; owner_id: string }>(
    "select kind, owner_id from media_objects where id = $1",
    [id],
  );
  if (!rows[0] || rows[0].owner_id !== userId || rows[0].kind !== kind) {
    throw new UserFacingError("That file is not available for this account.");
  }
}

async function maybeDeleteMedia(sql: Sql, userId: string, isAdmin: boolean, path: string | null) {
  const id = mediaIdFromPath(path);
  if (!id || !path) return;
  const refs = await sql.query(
    "select 1 from podcasts where audio_path = $1 or thumbnail_path = $1",
    [path],
  );
  if (refs.length) return;
  const profiles = await sql.query(
    "select 1 from profiles where avatar_url = $1",
    [path],
  );
  if (profiles.length) return;
  if (isAdmin) await sql.query("delete from media_objects where id = $1", [id]);
  else await sql.query("delete from media_objects where id = $1 and owner_id = $2", [id, userId]);
}

async function uniqueSlug(sql: Sql, title: string): Promise<string> {
  const base = slugify(title);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const rows = await sql.query("select 1 from podcasts where slug = $1", [slug]);
    if (!rows.length) return slug;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createPodcast(
  userId: string,
  input: {
    title: string;
    description: string;
    speakerName: string;
    categoryId: string;
    audioPath: string;
    thumbnailPath: string;
    durationSeconds: number;
    tags?: string;
    publishNow?: boolean;
  },
) {
  const sql = await database();
  const profile = await ensureProfile(sql, userId);
  assertStaff(profile);
  const category = await sql.query("select id from categories where id = $1", [input.categoryId]);
  if (!category.length) throw new UserFacingError("Choose a valid category.");
  const duplicate = await sql.query(
    `select id from podcasts
     where created_by = $1 and lower(title) = lower($2) and created_at > now() - interval '2 minutes'`,
    [userId, input.title.trim()],
  );
  if (duplicate.length) {
    throw new UserFacingError("That title was just submitted. Wait a moment before trying again.");
  }
  await assertOwnedMedia(sql, userId, input.audioPath, "audio");
  await assertOwnedMedia(sql, userId, input.thumbnailPath, "image");
  const status: PodcastStatus = profile.role === "admin" && input.publishNow !== false ? "published" : "pending";
  const id = crypto.randomUUID();
  const slug = await uniqueSlug(sql, input.title);
  await sql.query(
    `insert into podcasts (
       id, title, slug, description, speaker_name, category_id, audio_path, thumbnail_path,
       duration_seconds, status, tags, created_by, approved_by, published_at
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      id,
      input.title.trim(),
      slug,
      input.description.trim(),
      input.speakerName.trim(),
      input.categoryId,
      input.audioPath,
      input.thumbnailPath,
      input.durationSeconds,
      status,
      cleanTags(input.tags ?? ""),
      userId,
      status === "published" ? userId : null,
      status === "published" ? new Date().toISOString() : null,
    ],
  );
  return { slug, status };
}

export async function getManagedPodcast(userId: string, id: string): Promise<ManagedPodcast | null> {
  const sql = await database();
  const profile = await ensureProfile(sql, userId);
  const rows = await sql.query<Record<string, unknown>>(
    `select ${CARD_SELECT}
     from podcasts p join categories c on c.id = p.category_id
     where p.id = $1`,
    [id],
  );
  if (!rows[0]) return null;
  const podcast = mapRow(rows[0]);
  if (podcast.status !== "published" && podcast.createdBy !== userId && profile.role !== "admin") {
    throw new UserFacingError("You do not have permission to view that episode.");
  }
  if (profile.role === "student" && podcast.createdBy !== userId && podcast.status !== "published") {
    throw new UserFacingError("You do not have permission to view that episode.");
  }
  return podcast;
}

export async function updatePodcast(
  userId: string,
  input: {
    id: string;
    title: string;
    description: string;
    speakerName: string;
    categoryId: string;
    tags: string;
    audioPath?: string;
    thumbnailPath?: string;
    durationSeconds?: number;
  },
) {
  const sql = await database();
  const profile = await ensureProfile(sql, userId);
  assertStaff(profile);
  const rows = await sql.query<Record<string, unknown>>(
    `select ${CARD_SELECT} from podcasts p join categories c on c.id = p.category_id where p.id = $1`,
    [input.id],
  );
  if (!rows[0]) throw new UserFacingError("That episode could not be found.");
  const current = mapRow(rows[0]);
  if (profile.role !== "admin" && current.createdBy !== userId) {
    throw new UserFacingError("You can only edit your own episodes.");
  }
  const category = await sql.query("select id from categories where id = $1", [input.categoryId]);
  if (!category.length) throw new UserFacingError("Choose a valid category.");
  let audioPath = current.audioPath;
  let thumbnail = current.thumbnailPath;
  let duration = current.durationSeconds;
  if (input.audioPath && input.audioPath !== audioPath) {
    await assertOwnedMedia(sql, userId, input.audioPath, "audio");
    if (!input.durationSeconds || input.durationSeconds < 1) {
      throw new UserFacingError("Audio duration could not be read.");
    }
    audioPath = input.audioPath;
    duration = input.durationSeconds;
  }
  if (input.thumbnailPath && input.thumbnailPath !== thumbnail) {
    await assertOwnedMedia(sql, userId, input.thumbnailPath, "image");
    thumbnail = input.thumbnailPath;
  }
  let status = current.status;
  let rejection = current.rejectionReason;
  if (status === "rejected") {
    status = "pending";
    rejection = null;
  }
  await sql.query(
    `update podcasts set
       title = $2, description = $3, speaker_name = $4, category_id = $5,
       audio_path = $6, thumbnail_path = $7, duration_seconds = $8, tags = $9,
       status = $10, rejection_reason = $11, updated_at = now()
     where id = $1`,
    [
      input.id,
      input.title.trim(),
      input.description.trim(),
      input.speakerName.trim(),
      input.categoryId,
      audioPath,
      thumbnail,
      duration,
      cleanTags(input.tags),
      status,
      rejection,
    ],
  );
  return { slug: current.slug, status };
}

export async function deletePodcast(userId: string, id: string) {
  const sql = await database();
  const profile = await ensureProfile(sql, userId);
  const rows = await sql.query<{ audio_path: string; thumbnail_path: string | null; created_by: string }>(
    "select audio_path, thumbnail_path, created_by from podcasts where id = $1",
    [id],
  );
  const current = rows[0];
  if (!current) throw new UserFacingError("That episode could not be found.");
  if (profile.role !== "admin" && current.created_by !== userId) {
    throw new UserFacingError("You can only delete your own episodes.");
  }
  if (profile.role === "student") throw new UserFacingError("Creator access is required to delete episodes.");
  const audio = current.audio_path;
  const thumb = current.thumbnail_path;
  await sql.query("delete from podcasts where id = $1", [id]);
  await maybeDeleteMedia(sql, userId, profile.role === "admin", audio);
  await maybeDeleteMedia(sql, userId, profile.role === "admin", thumb);
  return { deleted: true };
}

function utcDays(count: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let index = count - 1; index >= 0; index -= 1) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - index));
    days.push(day.toISOString().slice(0, 10));
  }
  return days;
}

export async function adminOverview(userId: string): Promise<AdminOverview> {
  const sql = await database();
  assertAdmin(await ensureProfile(sql, userId));
  const metrics = await sql.query<{
    published: number;
    users: number;
    students: number;
    plays: number;
    pending: number;
  }>(
    `select
       (select count(*)::int from podcasts where status = 'published') as published,
       (select count(*)::int from profiles) as users,
       (select count(*)::int from profiles where role = 'student') as students,
       (select count(*)::int from podcast_plays) as plays,
       (select count(*)::int from podcasts where status = 'pending') as pending`,
  );
  const days = await sql.query<{ day: string; plays: number }>(
    `select to_char(played_at at time zone 'UTC', 'YYYY-MM-DD') as day, count(*)::int as plays
     from podcast_plays
     where played_at >= now() - interval '13 days'
     group by 1
     order by 1`,
  );
  const byDay = new Map(days.map((row) => [String(row.day), Number(row.plays)]));
  const byCategory = await sql.query<{ name: string; total: number }>(
    `select c.name, count(p.id)::int as total
     from categories c
     left join podcasts p on p.category_id = c.id and p.status = 'published'
     group by c.id, c.name
     order by c.name`,
  );
  const top = await sql.query<{ title: string; plays: number }>(
    `select p.title, count(pl.id)::int as plays
     from podcasts p
     left join podcast_plays pl on pl.podcast_id = p.id
     where p.status = 'published'
     group by p.id, p.title
     order by plays desc, p.title
     limit 5`,
  );
  const row = metrics[0];
  return {
    published: Number(row?.published ?? 0),
    users: Number(row?.users ?? 0),
    students: Number(row?.students ?? 0),
    plays: Number(row?.plays ?? 0),
    pending: Number(row?.pending ?? 0),
    playsByDay: utcDays(14).map((day) => ({ day, plays: byDay.get(day) ?? 0 })),
    byCategory: byCategory.map((item) => ({ name: item.name, total: Number(item.total) })),
    top: top.map((item) => ({ title: item.title, plays: Number(item.plays) })),
  };
}

export async function adminPodcasts(userId: string, input: { q?: string; status?: string }) {
  const sql = await database();
  assertAdmin(await ensureProfile(sql, userId));
  const term = searchTerm(input.q);
  const allowed = new Set(["draft", "pending", "published", "rejected"]);
  const status = input.status && allowed.has(input.status) ? input.status : "all";
  const rows = await sql.query<Record<string, unknown>>(
    `select ${CARD_SELECT}
     from podcasts p join categories c on c.id = p.category_id
     where ($1 = '' or p.title ilike $2 or p.speaker_name ilike $2)
       and ($3 = 'all' or p.status = $3)
     order by p.created_at desc
     limit 100`,
    [term, `%${term}%`, status],
  );
  return rows.map(mapRow);
}

export async function setPodcastStatus(
  userId: string,
  input: { id: string; status: PodcastStatus; reason?: string },
) {
  const sql = await database();
  assertAdmin(await ensureProfile(sql, userId));
  const found = await sql.query("select id from podcasts where id = $1", [input.id]);
  if (!found.length) throw new UserFacingError("That episode could not be found.");
  if (input.status === "rejected" && (input.reason ?? "").trim().length < 3) {
    throw new UserFacingError("Add a short reason so the creator knows what to fix.");
  }
  if (input.status === "published") {
    await sql.query(
      `update podcasts set status = 'published', published_at = coalesce(published_at, now()),
         approved_by = $2, rejection_reason = null, updated_at = now() where id = $1`,
      [input.id, userId],
    );
  } else if (input.status === "rejected") {
    await sql.query(
      `update podcasts set status = 'rejected', rejection_reason = $3, approved_by = $2, updated_at = now()
       where id = $1`,
      [input.id, userId, input.reason?.trim() ?? ""],
    );
  } else if (input.status === "draft") {
    await sql.query("update podcasts set status = 'draft', updated_at = now() where id = $1", [input.id]);
  } else {
    await sql.query(
      "update podcasts set status = 'pending', rejection_reason = null, updated_at = now() where id = $1",
      [input.id],
    );
  }
  return { status: input.status };
}

export async function reviewQueue(userId: string): Promise<ReviewItem[]> {
  const sql = await database();
  assertAdmin(await ensureProfile(sql, userId));
  const rows = await sql.query<Record<string, unknown>>(
    `select ${CARD_SELECT}, coalesce(pr.display_name, 'Unknown creator') as creator_name
     from podcasts p
     join categories c on c.id = p.category_id
     left join profiles pr on pr.id = p.created_by
     where p.status = 'pending'
     order by p.created_at asc`,
  );
  return rows.map((row) => ({ ...mapRow(row), creatorName: String(row.creator_name) }));
}

export async function adminUsers(userId: string, q?: string): Promise<AdminUser[]> {
  const sql = await database();
  assertAdmin(await ensureProfile(sql, userId));
  const term = searchTerm(q);
  const rows = await sql.query<Record<string, unknown>>(
    `select u.id, u.email, u.name, u."createdAt"::text as created_at, p.display_name, p.role
     from "user" u
     left join profiles p on p.id = u.id
     where ($1 = '' or u.email ilike $2 or u.name ilike $2 or coalesce(p.display_name, '') ilike $2)
     order by u."createdAt" desc
     limit 200`,
    [term, `%${term}%`],
  );
  return rows.map((row) => ({
    id: String(row.id),
    email: String(row.email ?? ""),
    name: String(row.name ?? ""),
    displayName: row.display_name ? String(row.display_name) : null,
    role: row.role === "admin" || row.role === "creator" || row.role === "student" ? row.role : null,
    createdAt: String(row.created_at ?? ""),
  }));
}

export async function setUserRole(userId: string, targetId: string, role: Role) {
  const sql = await database();
  assertAdmin(await ensureProfile(sql, userId));
  const users = await sql.query(`select id from "user" where id = $1`, [targetId]);
  if (!users.length) throw new UserFacingError("That account could not be found.");
  const current = await ensureProfile(sql, targetId);
  if (current.role === "admin" && role !== "admin") {
    const admins = await sql.query<{ n: number }>(
      "select count(*)::int as n from profiles where role = 'admin'",
    );
    if (Number(admins[0]?.n ?? 0) <= 1) {
      throw new UserFacingError("The platform needs at least one admin.");
    }
  }
  await sql.query("update profiles set role = $2, updated_at = now() where id = $1", [targetId, role]);
  return { role };
}

async function uniqueCategorySlug(sql: Sql, name: string, currentId = ""): Promise<string> {
  const base = slugify(name);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const rows = await sql.query<{ id: string }>("select id from categories where slug = $1", [slug]);
    if (!rows.length || rows[0]?.id === currentId) return slug;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function saveCategory(
  userId: string,
  input: { id?: string; name: string; description: string },
) {
  const sql = await database();
  assertAdmin(await ensureProfile(sql, userId));
  const name = input.name.trim();
  const description = input.description.trim();
  const clash = await sql.query(
    "select id from categories where lower(name) = lower($1) and id <> $2",
    [name, input.id ?? ""],
  );
  if (clash.length) throw new UserFacingError("A category with that name already exists.");
  if (input.id) {
    const slug = await uniqueCategorySlug(sql, name, input.id);
    const updated = await sql.query(
      "update categories set name = $2, slug = $3, description = $4 where id = $1 returning id",
      [input.id, name, slug, description],
    );
    if (!updated.length) throw new UserFacingError("That category could not be found.");
    return { id: input.id };
  }
  const id = crypto.randomUUID();
  const slug = await uniqueCategorySlug(sql, name);
  await sql.query(
    "insert into categories (id, name, slug, description, icon) values ($1, $2, $3, $4, 'mic')",
    [id, name, slug, description],
  );
  return { id };
}

export async function removeCategory(userId: string, id: string) {
  const sql = await database();
  assertAdmin(await ensureProfile(sql, userId));
  const used = await sql.query<{ n: number }>(
    "select count(*)::int as n from podcasts where category_id = $1",
    [id],
  );
  if (Number(used[0]?.n ?? 0) > 0) {
    throw new UserFacingError("That category still has episodes. Move or delete them first.");
  }
  const removed = await sql.query("delete from categories where id = $1 returning id", [id]);
  if (!removed.length) throw new UserFacingError("That category could not be found.");
  return { deleted: true };
}

export async function saveMedia(
  userId: string,
  kind: "audio" | "image",
  mime: string,
  bytes: Uint8Array,
) {
  const sql = await database();
  const profile = await ensureProfile(sql, userId);
  if (kind === "audio" && profile.role === "student") {
    throw new UserFacingError("Ask an admin to grant creator access before uploading audio.");
  }
  const id = crypto.randomUUID();
  await sql.query(
    `insert into media_objects (id, owner_id, kind, mime_type, byte_size, data)
     values ($1, $2, $3, $4, $5, $6)`,
    [id, userId, kind, mime, bytes.byteLength, Buffer.from(bytes)],
  );
  return { id, url: `/api/media/${id}` };
}

export async function readMedia(id: string) {
  const sql = await getSql();
  const rows = await sql.query<{ mime_type: string; data: unknown; byte_size: number }>(
    "select mime_type, data, byte_size from media_objects where id = $1",
    [id],
  );
  return rows[0] ?? null;
}
