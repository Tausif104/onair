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
  X,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Player } from "@/components/app/player";
import { ChannelGrid } from "@/components/app/channel-grid";
import { ChannelBrowser } from "@/components/app/channel-browser";
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

// Extra Bangladeshi channels to surface in the World Cup tab (matched by name from
// the loaded source — no stream URLs are hardcoded; Gazi/GTV is licensed, PLAN §2).
const EXTRA_WC_RE = /\b(somoy|gazi\s?tv|gtv|btv|bangladesh\s?television)\b/i;

function isSportsChannel(c: Channel): boolean {
  return (
    SPORTS_RE.test(c.name) ||
    EXTRA_WC_RE.test(c.name) ||
    (c.group ? SPORTS_RE.test(c.group) : false)
  );
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
  const [query, setQuery] = useState("");
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
      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
          <button
            onClick={() => setView("home")}
            className="flex items-center gap-2"
            aria-label="Streamly home"
          >
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground shadow-lg shadow-primary/40">
              <Tv className="h-5 w-5" />
            </span>
            <span className="font-display text-2xl leading-none tracking-[0.12em] text-primary">
              STREAMLY
            </span>
          </button>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {NAV.map(({ view: v, label, icon: Icon }) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  view === v
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>

          <div className="relative ml-auto min-w-0 flex-1 sm:w-60 sm:flex-none md:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value && view !== "home") setView("home");
              }}
              placeholder="Search channels…"
              inputMode="search"
              aria-label="Search channels"
              className="h-10 rounded-full border-white/10 bg-white/5 pl-10"
            />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-5 sm:px-6 md:pb-10">
        {nowPlaying && view === "home" && (
          <div className="relative mb-6 overflow-hidden rounded-2xl shadow-2xl shadow-black/40 ring-1 ring-white/10 animate-rise">
            <button
              onClick={() => setNowPlaying(null)}
              aria-label="Close player"
              className="absolute left-2 top-2 z-20 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
            >
              <X className="h-4 w-4" />
            </button>
            <Player
              src={nowPlaying.streamUrl}
              title={nowPlaying.name}
              poster={nowPlaying.logo}
            />
          </div>
        )}

        {view === "home" && (
          <section>
            {loadError ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-20 text-center">
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
              <ChannelBrowser
                channels={channels}
                loading={loadingChannels}
                favorites={favSet}
                nowPlaying={nowPlaying?.streamUrl ?? null}
                query={query}
                onPlay={play}
                onToggleFavorite={onToggleFavorite}
              />
            )}
          </section>
        )}

        {view === "worldcup" && (
          <section className="space-y-5">
            <div className="flex items-center gap-2.5">
              <Trophy className="h-7 w-7 text-primary" />
              <h1 className="font-display text-3xl tracking-wide sm:text-4xl">
                World Cup &amp; Sports
              </h1>
            </div>

            {/* Official rights-holder guidance — premium events should be watched
                through licensed sources, not restreams (PLAN §2). */}
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card p-5 text-sm">
              <p className="text-base font-semibold">Watch the World Cup officially</p>
              <p className="mt-1 max-w-2xl text-muted-foreground">
                The FIFA World Cup is licensed. For a reliable, legal stream use the
                official rights holder for your region.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href="https://www.plus.fifa.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground shadow-md shadow-primary/30 transition hover:brightness-110"
                >
                  FIFA+ <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <a
                  href="https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 font-medium hover:bg-white/10"
                >
                  Official site <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
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
          <section className="space-y-5">
            <div className="flex items-center gap-2.5">
              <Heart className="h-7 w-7 text-primary" />
              <h1 className="font-display text-3xl tracking-wide sm:text-4xl">Favorites</h1>
            </div>
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
            <div className="flex items-center gap-2.5">
              <Settings className="h-7 w-7 text-primary" />
              <h1 className="font-display text-3xl tracking-wide sm:text-4xl">Settings</h1>
            </div>

            <div className="rounded-xl border border-white/10 bg-card/60 p-4">
              <p className="text-sm font-medium">Signed in as</p>
              <p className="text-sm text-muted-foreground">
                {user.name ? `${user.name} · ` : ""}
                {user.email}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-card/60">
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
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {NAV.map(({ view: v, label, icon: Icon }) => {
            const active = view === v;
            return (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "relative flex min-h-[3.75rem] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {active && (
                  <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary shadow-[0_0_12px] shadow-primary" />
                )}
                <Icon className={cn("h-5 w-5", active && "fill-primary/15")} />
                {label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
