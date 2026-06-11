"use client";

import { useMemo, useState } from "react";
import { Search, Tv } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ChannelCard } from "@/components/app/channel-card";
import type { Channel } from "@/lib/m3u";

const ALL = "All";

export function ChannelGrid({
  channels,
  loading,
  favorites,
  nowPlaying,
  onPlay,
  onToggleFavorite,
  emptyLabel = "No channels.",
}: {
  channels: Channel[];
  loading?: boolean;
  favorites: Set<string>;
  nowPlaying: string | null;
  onPlay: (c: Channel) => void;
  onToggleFavorite: (c: Channel) => void;
  emptyLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState(ALL);

  const groups = useMemo(() => {
    const set = new Set<string>();
    for (const c of channels) if (c.group) set.add(c.group);
    return [ALL, ...Array.from(set).sort()];
  }, [channels]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return channels.filter((c) => {
      if (group !== ALL && c.group !== group) return false;
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [channels, query, group]);

  // Cap rendered cards so huge playlists (10k+) don't tank the DOM.
  const MAX_VISIBLE = 300;
  const visible = filtered.slice(0, MAX_VISIBLE);
  const hidden = filtered.length - visible.length;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search channels…"
          className="h-11 rounded-full border-white/10 bg-white/5 pl-11 text-base"
          inputMode="search"
        />
      </div>

      {groups.length > 1 && (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {groups.map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
                group === g
                  ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30"
                  : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/25 hover:text-foreground",
              )}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
          <Tv className="h-10 w-10" />
          <p className="text-sm">{query || group !== ALL ? "No matches." : emptyLabel}</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {filtered.length} channel{filtered.length === 1 ? "" : "s"}
            {hidden > 0 && ` · showing first ${MAX_VISIBLE}, search or pick a category to narrow`}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {visible.map((c, i) => (
              <ChannelCard
                key={`${c.streamUrl}-${c.name}-${i}`}
                channel={c}
                isFavorite={favorites.has(c.streamUrl)}
                isPlaying={nowPlaying === c.streamUrl}
                onPlay={() => onPlay(c)}
                onToggleFavorite={() => onToggleFavorite(c)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
