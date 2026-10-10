import { createFileRoute } from "@tanstack/react-router";

function toBytes(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (typeof data === "string") {
    const hex = data.startsWith("\\x") ? data.slice(2) : data;
    return Uint8Array.from(Buffer.from(hex, "hex"));
  }
  return new Uint8Array();
}

export const Route = createFileRoute("/api/media/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new Response("Not found", { status: 404 });
        const { readMedia } = await import("@/lib/podcast/queries.server");
        const row = await readMedia(params.id);
        if (!row) return new Response("Not found", { status: 404 });
        const bytes = toBytes(row.data);
        if (bytes.byteLength === 0) return new Response("Not found", { status: 404 });
        const type = row.mime_type || "application/octet-stream";
        const range = request.headers.get("range");
        if (range) {
          const match = /^bytes=(\d*)-(\d*)$/.exec(range);
          if (!match) return new Response("Invalid range", { status: 416 });
          const start = match[1] ? Number(match[1]) : Math.max(0, bytes.byteLength - Number(match[2] || 0));
          const end = match[2] && match[1] ? Number(match[2]) : bytes.byteLength - 1;
          if (start > end || start >= bytes.byteLength) {
            return new Response(null, {
              status: 416,
              headers: { "Content-Range": `bytes */${bytes.byteLength}` },
            });
          }
          const slice = Buffer.from(bytes.subarray(start, end + 1));
          return new Response(slice, {
            status: 206,
            headers: {
              "Content-Type": type,
              "Content-Length": String(slice.byteLength),
              "Content-Range": `bytes ${start}-${end}/${bytes.byteLength}`,
              "Accept-Ranges": "bytes",
              "Cache-Control": "public, max-age=3600",
              "X-Content-Type-Options": "nosniff",
            },
          });
        }
        return new Response(Buffer.from(bytes), {
          status: 200,
          headers: {
            "Content-Type": type,
            "Content-Length": String(bytes.byteLength),
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
