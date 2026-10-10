import { createFileRoute } from "@tanstack/react-router";
import { ImagePlus, Music2, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { errorText } from "@/lib/format";
import { createEpisode, getMyProfile, listCategories } from "@/lib/podcast/api";
import { loadSignedIn } from "@/lib/auth/route-guard";
import { uploadPodcastMp3 } from "@/lib/podcast/media-upload";

export const Route = createFileRoute("/upload")({
  loader: async () => {
    const profile = await loadSignedIn(() => getMyProfile());
    const categories = await listCategories();
    return { categories, profile };
  },
  component: UploadPage,
});

function UploadPage() {
  const { categories, profile } = Route.useLoaderData();
  const role = profile?.role ?? "student";
  const [form, setForm] = useState({
    title: "",
    description: "",
    speakerName: "",
    categoryId: "",
    audioPath: "",
    thumbnailPath: "",
    tags: "",
    durationSeconds: 0,
  });
  const [audioBusy, setAudioBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canCreate = role === "admin" || role === "superadmin" || role === "creator";
  const busy = audioBusy || imageBusy || submitting;

  useEffect(() => {
    setForm((current) => ({
      ...current,
      speakerName: current.speakerName || profile?.displayName || "",
      categoryId: current.categoryId || categories[0]?.id || "",
    }));
  }, [categories, profile?.displayName]);

  async function uploadFile(kind: "audio" | "image", file?: File) {
    if (!file) return;
    setError(null);
    setMessage(null);
    if (kind === "audio") setAudioBusy(true);
    else setImageBusy(true);

    try {
      if (kind === "audio") {
        const uploaded = await uploadPodcastMp3(file);
        setForm((current) => ({
          ...current,
          audioPath: uploaded.url,
          durationSeconds: uploaded.durationSeconds,
        }));
        setMessage("MP3 uploaded.");
        return;
      }
      const formData = new FormData();
      formData.set("kind", kind);
      formData.set("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const detail =
          typeof result === "object" && result !== null && "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "The file could not be uploaded.";
        throw new Error(detail);
      }
      if (
        typeof result !== "object" ||
        result === null ||
        !("url" in result) ||
        typeof result.url !== "string"
      ) {
        throw new Error("The upload response was invalid. Please try again.");
      }
      const uploadedUrl: string = result.url;
      setForm((current) => ({
        ...current,
        thumbnailPath: uploadedUrl,
      }));
      setMessage("Cover image uploaded.");
    } catch (uploadError) {
      setError(errorText(uploadError));
    } finally {
      if (kind === "audio") setAudioBusy(false);
      else setImageBusy(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setMessage(null);
    setError(null);
    if (!canCreate) {
      setError("Creator access is required to upload a podcast.");
      return;
    }
    if (!form.title.trim() || !form.description.trim() || !form.speakerName.trim()) {
      setError("Complete the title, speaker, and description before submitting.");
      return;
    }
    if (!form.audioPath || !form.thumbnailPath || !form.durationSeconds) {
      setError("Upload both an audio file and a cover image before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createEpisode({
        data: {
          title: form.title,
          description: form.description,
          speakerName: form.speakerName,
          categoryId: form.categoryId,
          audioPath: form.audioPath,
          thumbnailPath: form.thumbnailPath,
          durationSeconds: form.durationSeconds,
          tags: form.tags,
          publishNow: role === "admin" || role === "superadmin",
        },
      });
      if (result.ok) {
        formElement.reset();
        setMessage(`Submitted as ${result.data.status}.`);
        setForm((current) => ({
          ...current,
          title: "",
          description: "",
          tags: "",
          audioPath: "",
          thumbnailPath: "",
          durationSeconds: 0,
        }));
      } else {
        setError(result.message);
      }
    } catch (submitError) {
      setError(errorText(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell role={role} variant={role === "admin" || role === "superadmin" ? "admin" : "campus"}>
      <div className="mx-auto max-w-2xl space-y-4">
        <header>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet">Create</p>
          <h1 className="mt-1 text-3xl font-semibold">Upload a podcast</h1>
        </header>
        {!canCreate ? (
          <div className="rounded-3xl border border-dashed border-line bg-card p-6 text-muted">
            Creator access is required before uploading episodes.
          </div>
        ) : (
          <form className="space-y-5 rounded-3xl border border-line bg-card p-5 shadow-card sm:p-7" onSubmit={onSubmit}>
            <div className="rounded-2xl bg-mist p-4 text-sm text-violet">
              Your episode will be sent to the review queue. Upload MP3 audio up to 6 MB and a JPG, PNG, or WebP cover up to 2 MB.
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium md:col-span-2">
                Title
                <input
                  className="field mt-1"
                  value={form.title}
                  required
                  minLength={3}
                  maxLength={140}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                />
              </label>
              <label className="block text-sm font-medium md:col-span-2">
                Description
                <textarea
                  className="field mt-1 min-h-28"
                  value={form.description}
                  required
                  minLength={20}
                  maxLength={4000}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                />
              </label>
              <label className="block text-sm font-medium">
                Speaker name
                <input
                  className="field mt-1"
                  value={form.speakerName}
                  required
                  minLength={2}
                  maxLength={80}
                  onChange={(event) => setForm((current) => ({ ...current, speakerName: event.target.value }))}
                />
              </label>
              <label className="block text-sm font-medium">
                Category
                <select
                  className="field mt-1"
                  value={form.categoryId}
                  required
                  onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
                >
                  <option value="" disabled>Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                <span className="flex items-center gap-2"><Music2 className="size-4 text-violet" /> Audio file</span>
                <input
                  className="field mt-1"
                  type="file"
                  accept=".mp3,audio/mpeg,audio/mp3"
                  required={!form.audioPath}
                  disabled={audioBusy || submitting}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    void uploadFile("audio", file);
                  }}
                />
                <span className="mt-1 block text-xs text-muted">MP3 only. Maximum 6 MB.</span>
                {audioBusy ? <span className="mt-2 block text-sm text-violet">Uploading audio…</span> : null}
                {form.audioPath ? <audio className="mt-2 w-full" controls src={form.audioPath} /> : null}
              </label>
              <label className="block text-sm font-medium">
                <span className="flex items-center gap-2"><ImagePlus className="size-4 text-violet" /> Cover image</span>
                <input
                  className="field mt-1"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  required={!form.thumbnailPath}
                  disabled={imageBusy || submitting}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    void uploadFile("image", file);
                  }}
                />
                <span className="mt-1 block text-xs text-muted">JPG, PNG, or WebP. Maximum 2 MB.</span>
                {imageBusy ? <span className="mt-2 block text-sm text-violet">Uploading cover…</span> : null}
                {form.thumbnailPath ? (
                  <img className="mt-2 aspect-video w-full rounded-2xl object-cover" src={form.thumbnailPath} alt="Uploaded cover preview" />
                ) : null}
              </label>
              <label className="block text-sm font-medium">
                Tags
                <input
                  className="field mt-1"
                  value={form.tags}
                  maxLength={200}
                  onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                />
              </label>
              <label className="block text-sm font-medium">
                Duration (seconds)
                <input
                  type="number"
                  className="field mt-1"
                  value={form.durationSeconds}
                  readOnly
                />
                <span className="mt-1 block text-xs text-muted">Read from the uploaded audio file.</span>
              </label>
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {audioBusy || imageBusy ? "Uploading files…" : submitting ? "Submitting…" : <><UploadCloud className="size-4" /> Submit for review</>}
            </button>
            {message ? <p role="status" className="text-sm text-mint">{message}</p> : null}
            {error ? <p role="alert" className="text-sm text-rose">{error}</p> : null}
          </form>
        )}
      </div>
    </AppShell>
  );
}
