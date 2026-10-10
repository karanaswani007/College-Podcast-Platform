import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicFrame } from "@/components/layout/public-frame";

export const Route = createFileRoute("/unauthorized")({
  component: UnauthorizedPage,
});

function UnauthorizedPage() {
  return (
    <PublicFrame>
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-3xl font-semibold">You cannot open that page</h1>
        <p className="mt-3 text-muted">Your account does not have the role this area requires.</p>
        <Link to="/dashboard" className="btn btn-primary mt-6">
          Go to your dashboard
        </Link>
      </div>
    </PublicFrame>
  );
}
