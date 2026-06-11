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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search channels…"
          className="pl-9"
          inputMode="search"
        />
      </div>

      {groups.length > 1 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {groups.map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors",
                group === g
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:bg-accent",
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((c) => (
            <ChannelCard
              key={c.streamUrl + c.name}
              channel={c}
              isFavorite={favorites.has(c.streamUrl)}
              isPlaying={nowPlaying === c.streamUrl}
              onPlay={() => onPlay(c)}
              onToggleFavorite={() => onToggleFavorite(c)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
