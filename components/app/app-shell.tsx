"use client";

import { useEffect, useMemo, useState, useTransition, useCallback } from "react";
import { toast } from "sonner";
import {
  Home,
  Heart,
  Settings,
  Tv,
  LogOut,
  History,
  Trash2,
  RotateCw,
  Trophy,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Player } from "@/components/app/player";
import { ChannelGrid } from "@/components/app/channel-grid";
import type { Channel } from "@/lib/m3u";
import { fetchDefaultChannels } from "@/app/actions/playlist";
import { toggleFavorite, recordWatch, clearHistory } from "@/app/actions/library";
import { logout } from "@/app/actions/auth";

type View = "home" | "worldcup" | "favorites" | "settings";

const NAV: { view: View; label: string; icon: typeof Home }[] = [
  { view: "home", label: "Home", icon: Home },
  { view: "worldcup", label: "World Cup", icon: Trophy },
  { view: "favorites", label: "Favorites", icon: Heart },
  { view: "settings", label: "Settings", icon: Settings },
];

// Heuristic: surface sports channels already present in the user's source.
// We do NOT host, curate, or hardcode any World Cup stream (PLAN §2) — this only
// filters the channels the source already provides by name/group.
const SPORTS_RE =
  /\b(sports?|football|soccer|fifa|world\s?cup|bein|supersport|ssc|sky\s?sports|espn|fox\s?sports|star\s?sports|t\s?sports|ten\s?sports|dazn|optus\s?sport|tnt\s?sports|astro\s?supersport|elta|premier\s?sports|setanta|match!?)\b/i;

function isSportsChannel(c: Channel): boolean {
  return SPORTS_RE.test(c.name) || (c.group ? SPORTS_RE.test(c.group) : false);
}

export function AppShell({
  user,
  initialFavorites,
  initialHistory,
}: {
  user: { email: string; name: string | null };
  initialFavorites: Channel[];
  initialHistory: Channel[];
}) {
  const [view, setView] = useState<View>("home");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nowPlaying, setNowPlaying] = useState<Channel | null>(null);

  const [favorites, setFavorites] = useState<Channel[]>(initialFavorites);
  const [favSet, setFavSet] = useState<Set<string>>(
    () => new Set(initialFavorites.map((f) => f.streamUrl)),
  );
  const [history, setHistory] = useState<Channel[]>(initialHistory);
  const [, startTransition] = useTransition();

  const sportsChannels = useMemo(() => channels.filter(isSportsChannel), [channels]);

  const loadChannels = useCallback(async () => {
    setLoadingChannels(true);
    setLoadError(null);
    const res = await fetchDefaultChannels();
    if (res.error) {
      setLoadError(res.error);
      setChannels([]);
    } else {
      setChannels(res.channels ?? []);
    }
    setLoadingChannels(false);
  }, []);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const play = useCallback((c: Channel) => {
    setNowPlaying(c);
    setView("home");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    setHistory((prev) =>
      [c, ...prev.filter((h) => h.streamUrl !== c.streamUrl)].slice(0, 50),
    );
    startTransition(() => {
      recordWatch({ name: c.name, streamUrl: c.streamUrl, logo: c.logo });
    });
  }, []);

  const onToggleFavorite = useCallback(
    (c: Channel) => {
      const wasFav = favSet.has(c.streamUrl);
      setFavSet((prev) => {
        const next = new Set(prev);
        if (wasFav) next.delete(c.streamUrl);
        else next.add(c.streamUrl);
        return next;
      });
      setFavorites((prev) =>
        wasFav ? prev.filter((f) => f.streamUrl !== c.streamUrl) : [c, ...prev],
      );
      startTransition(async () => {
        const res = await toggleFavorite({
          name: c.name,
          streamUrl: c.streamUrl,
          logo: c.logo,
          group: c.group,
        });
        if (res.error) toast.error(res.error);
      });
    },
    [favSet],
  );

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4">
          <div className="flex items-center gap-2 font-semibold">
            <Tv className="h-5 w-5 text-primary" />
            <span>Streamly</span>
          </div>

          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {NAV.map(({ view: v, label, icon: Icon }) => (
              <Button
                key={v}
                variant={view === v ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView(v)}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-4 md:pb-8">
        {nowPlaying && view === "home" && (
          <div className="mb-4">
            <Player
              src={nowPlaying.streamUrl}
              title={nowPlaying.name}
              poster={nowPlaying.logo}
            />
          </div>
        )}

        {view === "home" && (
          <section className="space-y-4">
            {loadError ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
                <Tv className="h-12 w-12 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="font-medium">Couldn’t load channels</p>
                  <p className="text-sm text-muted-foreground">{loadError}</p>
                </div>
                <Button onClick={loadChannels}>
                  <RotateCw className="h-4 w-4" /> Retry
                </Button>
              </div>
            ) : (
              <ChannelGrid
                channels={channels}
                loading={loadingChannels}
                favorites={favSet}
                nowPlaying={nowPlaying?.streamUrl ?? null}
                onPlay={play}
                onToggleFavorite={onToggleFavorite}
                emptyLabel="No channels available."
              />
            )}
          </section>
        )}

        {view === "worldcup" && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">World Cup &amp; Sports</h1>
            </div>

            {/* Official rights-holder guidance — premium events should be watched
                through licensed sources, not restreams (PLAN §2). */}
            <div className="space-y-2 rounded-xl border bg-muted/40 p-4 text-sm">
              <p className="font-medium">Watch the World Cup officially</p>
              <p className="text-muted-foreground">
                The FIFA World Cup is licensed. For a reliable, legal stream use the
                official rights holder for your region.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href="https://www.plus.fifa.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 font-medium hover:bg-accent"
                >
                  FIFA+ <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <a
                  href="https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 font-medium hover:bg-accent"
                >
                  Official site <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <p className="pt-1 text-xs text-muted-foreground">
                Below are sports channels detected in your loaded source. Availability
                and legality depend on that source — we don’t host or curate streams.
              </p>
            </div>

            <ChannelGrid
              channels={sportsChannels}
              loading={loadingChannels}
              favorites={favSet}
              nowPlaying={nowPlaying?.streamUrl ?? null}
              onPlay={play}
              onToggleFavorite={onToggleFavorite}
              emptyLabel="No sports channels found in your source."
            />
          </section>
        )}

        {view === "favorites" && (
          <section className="space-y-4">
            <h1 className="text-lg font-semibold">Favorites</h1>
            <ChannelGrid
              channels={favorites}
              favorites={favSet}
              nowPlaying={nowPlaying?.streamUrl ?? null}
              onPlay={play}
              onToggleFavorite={onToggleFavorite}
              emptyLabel="No favorites yet. Tap the heart on a channel."
            />
          </section>
        )}

        {view === "settings" && (
          <section className="max-w-xl space-y-6">
            <h1 className="text-lg font-semibold">Settings</h1>

            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Signed in as</p>
              <p className="text-sm text-muted-foreground">
                {user.name ? `${user.name} · ` : ""}
                {user.email}
              </p>
            </div>

            <div className="rounded-lg border">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Watch history</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={history.length === 0}
                  onClick={() => {
                    setHistory([]);
                    startTransition(() => clearHistory());
                    toast.success("History cleared");
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Clear
                </Button>
              </div>
              {history.length > 0 && (
                <ul className="divide-y border-t">
                  {history.slice(0, 10).map((h) => (
                    <li key={h.streamUrl}>
                      <button
                        onClick={() => play(h)}
                        className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent"
                      >
                        <Tv className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm">{h.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form action={logout}>
              <Button type="submit" variant="outline" className="w-full">
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </form>
          </section>
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {NAV.map(({ view: v, label, icon: Icon }) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 text-xs",
                view === v ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", view === v && "fill-primary/10")} />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
