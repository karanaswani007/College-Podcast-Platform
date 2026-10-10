import { createFileRoute, Navigate } from "@tanstack/react-router";
import { getHistory } from "@/lib/podcast/api";
import { loadSignedIn } from "@/lib/auth/route-guard";

export const Route = createFileRoute("/dashboard/history")({
  loader: () => loadSignedIn(() => getHistory()),
  component: () => <Navigate to="/dashboard" hash="history" />,
});
