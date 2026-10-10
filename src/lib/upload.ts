import { getBearerToken } from "@/lib/auth/client";

export function uploadMedia(
  file: File,
  kind: "audio" | "image",
  onProgress: (ratio: number) => void,
): Promise<{ id: string; url: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    const token = getBearerToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onerror = () => reject(new Error("The upload failed. Check your connection and try again."));
    xhr.onload = () => {
      let payload: { id?: string; url?: string; error?: string } = {};
      try {
        payload = JSON.parse(xhr.responseText) as typeof payload;
      } catch {
        payload = {};
      }
      if (xhr.status >= 200 && xhr.status < 300 && payload.id && payload.url) {
        resolve({ id: payload.id, url: payload.url });
        return;
      }
      reject(new Error(payload.error || "The upload failed. Please try again."));
    };
    const body = new FormData();
    body.set("kind", kind);
    body.set("file", file);
    xhr.send(body);
  });
}

export function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      URL.revokeObjectURL(url);
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error("Could not read the audio duration."));
        return;
      }
      resolve(Math.round(duration));
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that audio file."));
    };
    audio.src = url;
  });
}
