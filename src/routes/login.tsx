import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, EyeOff, Mic } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { authClient, GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { errorText } from "@/lib/format";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search.mode === "register" ? ("register" as const) : ("login" as const),
  }),
  head: () => ({ meta: [{ title: "Sign in · College Podcast Platform" }] }),
  component: LoginPage,
});

function LoginPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState(search.mode);
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for the password.");
      return;
    }
    if (mode === "register" && name.length < 2) {
      setError("Enter the name you want on your profile.");
      return;
    }
    setBusy(true);
    setError(null);
    const result =
      mode === "register"
        ? await authClient.signUp.email({ email, password, name, callbackURL: "/dashboard" })
        : await authClient.signIn.email({ email, password, callbackURL: "/dashboard" });
    setBusy(false);
    if (result.error) {
      setError(result.error.message ?? "That sign-in did not work.");
      return;
    }
    window.location.href = "/dashboard";
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-navy text-on-navy lg:flex lg:flex-col lg:justify-between lg:p-10">
        <img src="/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-navy/75" />
        <Link to="/" className="relative flex items-center gap-2">
          <span className="grid size-11 place-items-center rounded-2xl bg-violet">
            <Mic />
          </span>
          <span className="font-brand text-xl">College Podcast Platform</span>
        </Link>
        <div className="relative max-w-md">
          <h1 className="font-brand text-4xl">{mode === "register" ? "Join the listening room" : "Welcome back"}</h1>
          <p className="mt-4 text-on-navy/80">
            Listen to campus briefings, keep your place, and come back to the episodes you saved.
          </p>
          <div className="mt-8 flex h-10 items-end gap-1" aria-hidden>
            {[8, 16, 28, 14, 22, 10, 18, 26, 12].map((height, index) => (
              <span key={index} className="w-1.5 rounded-full bg-violet" style={{ height }} />
            ))}
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex rounded-full bg-paper p-1">
            {(["login", "register"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={`flex-1 rounded-full py-2 font-semibold capitalize ${mode === item ? "bg-card text-violet shadow-card" : "text-muted"}`}
                onClick={() => {
                  setMode(item);
                  setError(null);
                  void navigate({ search: { mode: item }, replace: true });
                }}
              >
                {item === "login" ? "Login" : "Register"}
              </button>
            ))}
          </div>
          {isPending ? <div className="h-10 animate-pulse rounded-full bg-line" /> : null}
          {!isPending && user ? (
            <p className="mb-4 text-sm text-muted">
              You are already signed in. <Link to="/dashboard" className="font-semibold text-violet">Go to your dashboard</Link>
            </p>
          ) : null}
          <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
            {mode === "register" ? (
              <label className="block text-sm font-medium">
                Display name
                <input className="field mt-1" name="name" autoComplete="name" required minLength={2} />
              </label>
            ) : null}
            <label className="block text-sm font-medium">
              Email
              <input className="field mt-1" name="email" type="email" autoComplete="email" required />
            </label>
            <label className="block text-sm font-medium">
              Password
              <span className="relative mt-1 block">
                <input
                  className="field pr-12"
                  name="password"
                  type={show ? "text" : "password"}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  required
                  minLength={8}
                />
                <button type="button" className="icon-btn absolute right-1 top-1/2 -translate-y-1/2" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((value) => !value)}>
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </label>
            <p className="text-xs text-muted">At least 8 characters. Password reset email is not configured in this demo.</p>
            {error ? (
              <p role="alert" className="rounded-2xl bg-rose-soft px-3 py-2 text-sm text-rose">
                {error}
              </p>
            ) : null}
            <button className="btn btn-primary w-full" type="submit" disabled={busy}>
              {busy ? "Please wait…" : mode === "register" ? "Create account" : "Login"}
            </button>
          </form>
          <div className="my-5 text-center text-xs uppercase tracking-wide text-muted">or</div>
          <div className="space-y-2">
            {GROK_PROVIDERS.map((provider) => (
              <button
                key={provider.providerId}
                type="button"
                className="btn btn-outline w-full"
                onClick={() => {
                  void signIn(provider.providerId, { callbackURL: "/dashboard" }).catch((err) => toast.error(errorText(err)));
                }}
              >
                Continue with {provider.label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
