import { createFileRoute } from "@tanstack/react-router";

const AUDIO_EXT = new Set(["mp3"]);
const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp"]);
const AUDIO_MIME = new Set(["", "audio/mpeg", "audio/mp3", "application/octet-stream"]);
const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function extension(name: string) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? (parts.pop() ?? "") : "";
}

function hasMp3Frame(bytes: Uint8Array) {
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return true;
  for (let index = 0; index < bytes.length - 1; index += 1) {
    if (bytes[index] === 0xff && (bytes[index + 1] & 0xe0) === 0xe0) return true;
  }
  return false;
}

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
          assertSameSiteRequest();
          const header = request.headers.get("authorization") ?? "";
          const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : undefined;
          const { getSessionUser } = await import("@/lib/auth/verify.server");
          const user = await getSessionUser(token);
          if (!user) return Response.json({ error: "Please sign in to upload." }, { status: 401 });
          const form = await request.formData();
          const kind = form.get("kind");
          const file = form.get("file");
          if (kind !== "audio" && kind !== "image") {
            return Response.json({ error: "Choose an audio file or an image." }, { status: 400 });
          }
          if (!(file instanceof File)) return Response.json({ error: "Choose a file to upload." }, { status: 400 });
          const ext = extension(file.name);
          const mime = file.type.toLowerCase();
          const allowed = kind === "audio"
            ? AUDIO_EXT.has(ext) && AUDIO_MIME.has(mime)
            : IMAGE_EXT.has(ext) || IMAGE_MIME.has(mime);
          if (!allowed) {
            return Response.json(
              { error: kind === "audio" ? "Use an MP3 audio file. Other audio formats may not play in every browser." : "Use a JPG, PNG, or WebP image." },
              { status: 400 },
            );
          }
          const max = kind === "audio" ? 6 * 1024 * 1024 : 2 * 1024 * 1024;
          if (file.size <= 0 || file.size > max) {
            return Response.json(
              { error: kind === "audio" ? "Audio files must be under 6 MB." : "Images must be under 2 MB." },
              { status: 413 },
            );
          }
          const bytes = new Uint8Array(await file.arrayBuffer());
          if (kind === "audio" && !hasMp3Frame(bytes.subarray(0, 4096))) {
            return Response.json({ error: "This file does not contain valid MP3 audio." }, { status: 400 });
          }
          const storedMime = kind === "audio" ? "audio/mpeg" : mime || "image/jpeg";
          const { saveMedia } = await import("@/lib/podcast/queries.server");
          const saved = await saveMedia(user.id, kind, storedMime, bytes);
          return Response.json(saved);
        } catch (err) {
          const name = err instanceof Error ? err.name : "";
          const message = err instanceof Error ? err.message : "The upload failed.";
          if (name === "UserFacingError") return Response.json({ error: message }, { status: 400 });
          if (name === "CrossSiteRequestError") return Response.json({ error: "Upload blocked." }, { status: 403 });
          console.error(err);
          return Response.json({ error: "The upload failed. Please try again." }, { status: 500 });
        }
      },
    },
  },
});
