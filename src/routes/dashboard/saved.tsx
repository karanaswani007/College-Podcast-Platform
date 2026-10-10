import { createFileRoute, Navigate } from "@tanstack/react-router";
import { getSaved } from "@/lib/podcast/api";
import { loadSignedIn } from "@/lib/auth/route-guard";

export const Route = createFileRoute("/dashboard/saved")({
  loader: () => loadSignedIn(() => getSaved()),
  component: () => <Navigate to="/dashboard" hash="saved" />,
});
