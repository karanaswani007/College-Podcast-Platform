import { z } from "zod";

export const libraryQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  sort: z.enum(["newest", "popular"]).optional(),
  page: z.number().optional(),
});

export const idSchema = z.object({
  id: z.string().trim().min(1),
});

export const podcastIdSchema = z.object({
  podcastId: z.string().trim().min(1),
});

export const progressSchema = z.object({
  podcastId: z.string().trim().min(1),
  position: z.number().min(0).max(60 * 60 * 5),
  duration: z.number().min(0).max(60 * 60 * 5),
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  avatarUrl: z.string().nullable().optional(),
});

export const createPodcastSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(140),
  description: z.string().trim().min(20, "Description must be at least 20 characters").max(4000),
  speakerName: z.string().trim().min(2, "Enter the speaker name").max(80),
  categoryId: z.string().trim().min(1, "Choose a category"),
  audioPath: z.string().trim().min(1, "Upload an audio file"),
  thumbnailPath: z.string().trim().min(1, "Upload a cover image"),
  durationSeconds: z.number().int().positive("Audio duration could not be read").max(60 * 60 * 4),
  tags: z.string().trim().max(200).optional(),
  publishNow: z.boolean().optional(),
});

export const updatePodcastSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(140),
  description: z.string().trim().min(20, "Description must be at least 20 characters").max(4000),
  speakerName: z.string().trim().min(2, "Enter the speaker name").max(80),
  categoryId: z.string().trim().min(1, "Choose a category"),
  tags: z.string().trim().max(200),
  audioPath: z.string().optional(),
  thumbnailPath: z.string().optional(),
  durationSeconds: z.number().int().nonnegative().max(60 * 60 * 4).optional(),
});

export const statusSchema = z.object({
  id: z.string().trim().min(1),
  status: z.enum(["draft", "pending", "published", "rejected"]),
  reason: z.string().trim().max(500).optional(),
});

export const roleSchema = z.object({
  userId: z.string().trim().min(1),
  role: z.enum(["student", "creator", "admin"]),
});

export const userActionSchema = z.object({
  userId: z.string().trim().min(1),
});

export const userQuerySchema = z.object({
  q: z.string().optional(),
  page: z.number().int().min(1).max(10000).optional(),
});

export const adminListSchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
});

export const categorySchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(40),
  description: z.string().trim().max(300),
});
