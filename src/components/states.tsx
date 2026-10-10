import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-line", className)} />;
}

export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-8">
      <Skeleton className="h-12 w-48" />
      <Skeleton className="h-40 w-full" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-3xl border border-rose/30 bg-rose-soft p-4 text-fg">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="btn btn-primary mt-3" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-card px-6 py-12 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p>
    </div>
  );
}
