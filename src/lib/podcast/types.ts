export type Role = "student" | "creator" | "admin" | "superadmin";

export type PodcastStatus = "draft" | "pending" | "published" | "rejected";

export type PodcastCard = {
  id: string;
  title: string;
  slug: string;
  description: string;
  speakerName: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  audioPath: string;
  thumbnailPath: string | null;
  durationSeconds: number;
  status: PodcastStatus;
  tags: string[];
  likeCount: number;
  playCount: number;
  publishedAt: string | null;
  createdAt: string;
};

export type ManagedPodcast = PodcastCard & {
  createdBy: string;
  rejectionReason: string | null;
};

export type ReviewItem = ManagedPodcast & { creatorName: string };

export type HistoryItem = PodcastCard & {
  positionSeconds: number;
  completed: boolean;
  lastListenedAt: string;
};

export type CategoryCard = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  podcastCount: number;
};

export type Profile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
  email: string | null;
  pendingCount: number;
};

export type LibrarySnapshot = {
  likes: string[];
  saves: string[];
  positions: Record<string, number>;
};

export type HomeFeed = {
  featured: PodcastCard[];
  more: PodcastCard[];
  categories: CategoryCard[];
};

export type LibraryPage = {
  items: PodcastCard[];
  total: number;
  page: number;
  pageSize: number;
  categories: CategoryCard[];
};

export type PodcastDetail = {
  podcast: PodcastCard;
  related: PodcastCard[];
  fromHost: PodcastCard[];
};

export type DashboardData = {
  played: number;
  saved: number;
  inProgress: number;
  recent: HistoryItem[];
  continueListening: HistoryItem | null;
  recommended: PodcastCard[];
};

export type AdminOverview = {
  published: number;
  users: number;
  students: number;
  plays: number;
  pending: number;
  playsByDay: { day: string; plays: number }[];
  byCategory: { name: string; total: number }[];
  top: { title: string; plays: number }[];
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  displayName: string | null;
  role: Role | null;
  createdAt: string;
  lastActiveAt: string | null;
  uploadCount: number;
  listeningCount: number;
  blockedAt: string | null;
};

export type AdminUsersPage = {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
};

export type ActionResult<T> = { ok: true; data: T } | { ok: false; message: string };
