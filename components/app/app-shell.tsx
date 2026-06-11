"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { toast } from "sonner";
import {
  Home,
  Heart,
  ListVideo,
  Settings,
  Tv,
  LogOut,
  History,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Player } from "@/components/app/player";
import { ChannelGrid } from "@/components/app/channel-grid";
import { PlaylistManager } from "@/components/app/playlist-manager";
import type { Channel } from "@/lib/m3u";
import type { PlaylistRecord } from "@/app/actions/playlist";
import { fetchPlaylistChannels, removePlaylist } from "@/app/actions/playlist";
import { toggleFavorite, recordWatch, clearHistory } from "@/app/actions/library";
import { logout } from "@/app/actions/auth";

type View = "home" | "favorites" | "playlists" | "settings";

const NAV: { view: View; label: string; icon: typeof Home }[] = [
  { view: "home", label: "Home", icon: Home },
  { view: "favorites", label: "Favorites", icon: Heart },
  { view: "playlists", label: "Playlists", icon: ListVideo },
  { view: "settings", label: "Settings", icon: Settings },
];

export function AppShell({
  user,
  initialPlaylists,
  initialFavorites,
  initialHistory,
}: {
  user: { email: string; name: string | null };
  initialPlaylists: PlaylistRecord[];
  initialFavorites: Channel[];
  initialHistory: Channel[];
}) {
  const [view, setView] = useState<View>("home");
  const [playlists, setPlaylists] = useState<PlaylistRecord[]>(initialPlaylists);
  const [activeId, setActiveId] = useState<string | null>(
    initialPlaylists[0]?.id ?? null,
  );
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<Channel | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [favorites, setFavorites] = useState<Channel[]>(initialFavorites);
  const [favSet, setFavSet] = useState<Set<string>>(
    () => new Set(initialFavorites.map((f) => f.streamUrl)),
  );
  const [history, setHistory] = useState<Channel[]>(initialHistory);
  const [, startTransition] = useTransition();

  const loadPlaylist = useCallback(async (id: string) => {
    setActiveId(id);
    setLoadingChannels(true);
    setChannels([]);
    const res = await fetchPlaylistChannels(id);
    if (res.error) {
      toast.error(res.error);
      setChannels([]);
    } else {
      setChannels(res.channels ?? []);
    }
    setLoadingChannels(false);
  }, []);

  // Auto-load the first playlist on mount.
  useEffect(() => {
    if (activeId) loadPlaylist(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const play = useCallback((c: Channel) => {
    setNowPlaying(c);
    setView("home");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    setHistory((prev) => [
      c,
      ...prev.filter((h) => h.streamUrl !== c.streamUrl),
    ].slice(0, 50));
    startTransition(() => {
      recordWatch({ name: c.name, streamUrl: c.streamUrl, logo: c.logo });
    });
  }, []);

  const onToggleFavorite = useCallback(
    (c: Channel) => {
      const wasFav = favSet.has(c.streamUrl);
      // optimistic
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

  const onAddPlaylist = useCallback(
    (p: PlaylistRecord) => {
      setPlaylists((prev) => [...prev, p]);
      setSheetOpen(false);
      loadPlaylist(p.id);
      setView("home");
    },
    [loadPlaylist],
  );

  const onRemovePlaylist = useCallback(
    (id: string) => {
      setPlaylists((prev) => prev.filter((p) => p.id !== id));
      if (activeId === id) {
        setActiveId(null);
        setChannels([]);
      }
      startTransition(() => {
        removePlaylist(id);
      });
      toast.success("Playlist removed");
    },
    [activeId],
  );

  const manager = (
    <PlaylistManager
      playlists={playlists}
      activeId={activeId}
      onAdded={onAddPlaylist}
      onRemove={onRemovePlaylist}
      onSelect={(id) => {
        loadPlaylist(id);
        setSheetOpen(false);
        setView("home");
      }}
    />
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

          {/* Desktop nav */}
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
            {/* Sources sheet (quick add/switch) */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger render={<Button variant="ghost" size="sm" />}>
                <ListVideo className="h-4 w-4" />
                <span className="hidden sm:inline">Sources</span>
              </SheetTrigger>
              <SheetContent side="right" className="w-full max-w-md">
                <SheetHeader>
                  <SheetTitle>Playlists</SheetTitle>
                  <SheetDescription>
                    Add your own M3U sources. We never host or bundle streams.
                  </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100dvh-7rem)] px-4 pb-6">
                  {manager}
                </ScrollArea>
              </SheetContent>
            </Sheet>
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
            {playlists.length === 0 ? (
              <EmptyState
                title="Add a playlist to start"
                body="This app is the player — you bring the content. Paste your own M3U URL."
                action={
                  <Button onClick={() => setSheetOpen(true)}>
                    <ListVideo className="h-4 w-4" /> Add playlist
                  </Button>
                }
              />
            ) : (
              <ChannelGrid
                channels={channels}
                loading={loadingChannels}
                favorites={favSet}
                nowPlaying={nowPlaying?.streamUrl ?? null}
                onPlay={play}
                onToggleFavorite={onToggleFavorite}
                emptyLabel="This playlist has no channels."
              />
            )}
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

        {view === "playlists" && (
          <section className="max-w-xl space-y-4">
            <h1 className="text-lg font-semibold">Playlists</h1>
            {manager}
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

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <Tv className="h-12 w-12 text-muted-foreground" />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="mx-auto max-w-xs text-sm text-muted-foreground">{body}</p>
      </div>
      {action}
    </div>
  );
}
