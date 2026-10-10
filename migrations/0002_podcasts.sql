-- College Podcast Platform schema.
-- The browser never connects to Postgres. Access control lives in server
-- functions, which scope every per-user query to the verified session user.

create table if not exists profiles (
  id text primary key,
  display_name text not null,
  avatar_url text,
  role text not null default 'student' check (role in ('student', 'creator', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists categories (
  id text primary key,
  name text not null unique,
  slug text not null unique,
  description text not null default '',
  icon text not null default 'mic',
  created_at timestamptz not null default now()
);

create table if not exists podcasts (
  id text primary key,
  title text not null,
  slug text not null unique,
  description text not null,
  speaker_name text not null,
  category_id text not null references categories (id),
  audio_path text not null,
  thumbnail_path text,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  status text not null default 'pending' check (status in ('draft', 'pending', 'published', 'rejected')),
  rejection_reason text,
  tags text not null default '',
  created_by text not null,
  approved_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists podcasts_status_published_idx on podcasts (status, published_at);
create index if not exists podcasts_category_idx on podcasts (category_id);
create index if not exists podcasts_created_by_idx on podcasts (created_by);

create table if not exists podcast_likes (
  user_id text not null,
  podcast_id text not null references podcasts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, podcast_id)
);

create table if not exists saved_podcasts (
  user_id text not null,
  podcast_id text not null references podcasts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, podcast_id)
);

create table if not exists listening_history (
  user_id text not null,
  podcast_id text not null references podcasts (id) on delete cascade,
  playback_position_seconds integer not null default 0 check (playback_position_seconds >= 0),
  completed boolean not null default false,
  last_listened_at timestamptz not null default now(),
  primary key (user_id, podcast_id)
);

-- One counted play per signed-in listener per episode.
-- A play is inserted only after playback passes a threshold (see shouldCountPlay).
create table if not exists podcast_plays (
  id text primary key,
  user_id text not null,
  podcast_id text not null references podcasts (id) on delete cascade,
  played_at timestamptz not null default now(),
  unique (user_id, podcast_id)
);

create index if not exists podcast_plays_played_at_idx on podcast_plays (played_at);
create index if not exists podcast_plays_podcast_idx on podcast_plays (podcast_id);

create table if not exists media_objects (
  id text primary key,
  owner_id text not null,
  kind text not null check (kind in ('audio', 'image')),
  mime_type text not null,
  byte_size integer not null check (byte_size > 0),
  data bytea not null,
  created_at timestamptz not null default now()
);

create index if not exists media_objects_owner_idx on media_objects (owner_id);

create table if not exists app_meta (
  key text primary key,
  value text not null
);
