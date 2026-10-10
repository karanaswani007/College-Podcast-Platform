import { getBearerToken } from "@/lib/auth/client";

export type UploadedAudio = {
  url: string;
  durationSeconds: number;
};

export async function uploadPodcastMp3(file: File): Promise<UploadedAudio> {
  if (!file.name.toLowerCase().endsWith(".mp3")) {
    throw new Error("Choose an MP3 file. MP3 is supported across desktop and mobile browsers.");
  }
  if (
    file.type &&
    file.type !== "audio/mpeg" &&
    file.type !== "audio/mp3" &&
    file.type !== "application/octet-stream"
  ) {
    throw new Error("This file is not recognized as an MP3. Export or convert it to MP3 first.");
  }
  if (file.size <= 0 || file.size > 6 * 1024 * 1024) {
    throw new Error("MP3 files must be under 6 MB.");
  }

  const bytes = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  if (!hasMp3Frame(bytes)) {
    throw new Error("This file does not contain valid MP3 audio. Choose a different MP3 file.");
  }

  const durationSeconds = await readMp3Duration(file);
  const formData = new FormData();
  formData.set("kind", "audio");
  formData.set("file", file);
  const token = getBearerToken();
  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  });
  const result: unknown = await response.json();
  if (!response.ok) {
    const detail =
      typeof result === "object" &&
      result !== null &&
      "error" in result &&
      typeof result.error === "string"
        ? result.error
        : "The audio could not be uploaded.";
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
  return { url: result.url, durationSeconds };
}

function hasMp3Frame(bytes: Uint8Array): boolean {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0x49 &&
    bytes[1] === 0x44 &&
    bytes[2] === 0x33
  ) {
    return true;
  }
  for (let index = 0; index < bytes.length - 1; index += 1) {
    if (bytes[index] === 0xff && (bytes[index + 1] & 0xe0) === 0xe0) return true;
  }
  return false;
}

function readMp3Duration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      audio.removeAttribute("src");
      URL.revokeObjectURL(url);
      callback();
    };
    const timeout = window.setTimeout(() => {
      finish(() => reject(new Error("Reading the MP3 timed out. Try another file.")));
    }, 15000);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
        finish(() => reject(new Error("Could not read the MP3 duration. Try another file.")));
        return;
      }
      finish(() => resolve(Math.ceil(audio.duration)));
    };
    audio.onerror = () =>
      finish(() => reject(new Error("This MP3 could not be decoded by your browser. Try another file.")));
    audio.src = url;
  });
}
