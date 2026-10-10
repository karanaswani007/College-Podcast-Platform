import { createFileRoute, Navigate } from "@tanstack/react-router";
import { getMyProfile } from "@/lib/podcast/api";
import { loadSignedIn } from "@/lib/auth/route-guard";

export const Route = createFileRoute("/dashboard/profile")({
  loader: () => loadSignedIn(() => getMyProfile()),
  component: () => <Navigate to="/dashboard" hash="profile" />,
});
