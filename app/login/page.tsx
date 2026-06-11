import { redirect } from "next/navigation";
import { Tv, Globe2, Heart, MonitorPlay } from "lucide-react";
import { getUserId } from "@/lib/auth";
import { AuthForm } from "@/components/app/auth-form";

const FEATURES = [
  { icon: Globe2, title: "12,000+ channels", body: "Live TV from every country, one tap away." },
  { icon: MonitorPlay, title: "Plays anywhere", body: "HLS streaming in the browser — phone or desktop." },
  { icon: Heart, title: "Yours, synced", body: "Favorites & history saved to your account." },
];

export default async function LoginPage() {
  const userId = await getUserId();
  if (userId) redirect("/");

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden p-4 sm:p-6">
      {/* atmosphere */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 top-1/4 h-[28rem] w-[28rem] rounded-full bg-primary/25 blur-[120px]" />
        <div className="absolute -right-24 -top-24 h-[24rem] w-[24rem] rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,var(--background)_100%)]" />
      </div>

      <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2">
        {/* brand showcase */}
        <div className="hidden flex-col gap-8 lg:flex animate-rise">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/40">
              <Tv className="h-7 w-7" />
            </span>
            <span className="font-display text-5xl tracking-[0.1em] text-primary">ONAIR</span>
          </div>

          <div>
            <h1 className="font-display text-6xl leading-[0.95] tracking-wide">
              Every channel.
              <br />
              <span className="text-primary">One screen.</span>
            </h1>
            <p className="mt-4 max-w-md text-lg text-muted-foreground">
              Bring your own playlists and stream live TV from around the world —
              fast, clean, and always with you.
            </p>
          </div>

          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* form */}
        <div className="flex justify-center lg:justify-end animate-rise">
          <AuthForm />
        </div>
      </div>
    </main>
  );
}
