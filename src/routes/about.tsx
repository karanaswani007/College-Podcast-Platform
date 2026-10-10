import { createFileRoute } from "@tanstack/react-router";
import { PublicFrame } from "@/components/layout/public-frame";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About · College Podcast Platform" }] }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <PublicFrame>
      <article className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        <header>
          <p className="text-sm font-semibold text-violet">Major project</p>
          <h1 className="mt-2 font-brand text-4xl">About the platform</h1>
          <p className="mt-4 text-lg text-muted">
            College Podcast Platform is a listening room for campus learning. Students find short educational episodes, keep their place, and save what they want to hear again.
          </p>
        </header>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Who it is for</h2>
          <p>
            Students browse and listen. Creators submit episodes for review. Administrators publish work, manage categories, and see listening activity that comes from real playback, not pasted-in numbers.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">What you can do</h2>
          <ul className="list-disc space-y-2 pl-5 text-muted">
            <li>Search and filter published episodes by category.</li>
            <li>Play audio with seek, volume, and ten-second skips.</li>
            <li>Like, save, and resume an episode after you sign in.</li>
            <li>Submit a new episode if an admin has given you creator access.</li>
            <li>Review the queue, roles, and category list from the admin panel.</li>
          </ul>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">How it is built</h2>
          <p>
            The interface is a TanStack Start application. Accounts use Better Auth with email and password, plus Google and X sign-in. Episode data lives in Postgres. The browser never receives a database password. Every like, save, upload, and admin change goes through a server function that checks the signed-in user and their role.
          </p>
          <p>
            The sample episodes are fictional campus briefings. They are here so the project can be demonstrated before anyone uploads their own audio. They do not describe a real college partnership.
          </p>
        </section>
        <section className="rounded-3xl bg-navy p-6 text-on-navy">
          <p className="font-brand text-2xl">Listen · Learn · Grow</p>
          <p className="mt-2 text-sm text-on-navy/80">
            The first account created on a fresh database becomes the admin. Later accounts start as students until an admin changes their role.
          </p>
        </section>
      </article>
    </PublicFrame>
  );
}
