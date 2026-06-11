"use client";

import { useMemo, useState } from "react";
import { Tv } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ChannelCard } from "@/components/app/channel-card";
import { ChannelRail } from "@/components/app/channel-rail";
import { Hero } from "@/components/app/hero";
import type { Channel } from "@/lib/m3u";

const ALL = "All";
const MAX_RAILS = 16;
const RAIL_SIZE = 18;
const GRID_CAP = 300;

export function ChannelBrowser({
  channels,
  loading,
  favorites,
  nowPlaying,
  query,
  onPlay,
  onToggleFavorite,
}: {
  channels: Channel[];
  loading?: boolean;
  favorites: Set<string>;
  nowPlaying: string | null;
  query: string;
  onPlay: (c: Channel) => void;
  onToggleFavorite: (c: Channel) => void;
}) {
  const [group, setGroup] = useState(ALL);

  // groups sorted by channel count (busiest countries first)
  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of channels) {
      if (!c.group) continue;
      counts.set(c.group, (counts.get(c.group) ?? 0) + 1);
    }
    const sorted = [...counts.entries()]
      .filter(([g]) => !/^undefined$/i.test(g))
      .sort((a, b) => b[1] - a[1])
      .map(([g]) => g);
    return [ALL, ...sorted];
  }, [channels]);

  const byGroup = useMemo(() => {
    const map = new Map<string, Channel[]>();
    for (const c of channels) {
      const g = c.group ?? "Other";
      const arr = map.get(g);
      if (arr) arr.push(c);
      else map.set(g, [c]);
    }
    // channels with logos first so rails look good
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.logo ? 0 : 1) - (b.logo ? 0 : 1));
    }
    return map;
  }, [channels]);

  const featured = useMemo(
    () =>
      // prefer Somoy TV when the source carries it, else first logo'd channel
      channels.find((c) => /somoy/i.test(c.name)) ??
      channels.find((c) => c.logo && c.group && !/^undefined$/i.test(c.group)) ??
      channels.find((c) => c.logo) ??
      channels[0] ??
      null,
    [channels],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q && group === ALL) return null; // rails mode
    return channels.filter((c) => {
      if (group !== ALL && c.group !== group) return false;
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [channels, query, group]);

  const railGroups = useMemo(
    () => groups.filter((g) => g !== ALL).slice(0, MAX_RAILS),
    [groups],
  );

  return (
    <div className="space-y-6">
      {/* category chips (search lives in the header) */}
      <div>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {groups.slice(0, 60).map((g) => (
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
      </div>

      {loading ? (
        <div className="space-y-8">
          <Skeleton className="h-56 w-full rounded-2xl" />
          {Array.from({ length: 3 }).map((_, r) => (
            <div key={r} className="space-y-2">
              <Skeleton className="h-7 w-40" />
              <div className="flex gap-3 overflow-hidden">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[4/3] w-[150px] shrink-0 rounded-xl sm:w-[190px]" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : filtered ? (
        // ---- search / single-country grid ----
        <GridResults
          channels={filtered}
          favorites={favorites}
          nowPlaying={nowPlaying}
          onPlay={onPlay}
          onToggleFavorite={onToggleFavorite}
        />
      ) : (
        // ---- default: hero + rails ----
        <div className="space-y-8">
          {featured && (
            <Hero
              channel={featured}
              isFavorite={favorites.has(featured.streamUrl)}
              onPlay={() => onPlay(featured)}
              onToggleFavorite={() => onToggleFavorite(featured)}
            />
          )}
          {railGroups.map((g) => (
            <ChannelRail
              key={g}
              title={g}
              total={byGroup.get(g)?.length}
              channels={(byGroup.get(g) ?? []).slice(0, RAIL_SIZE)}
              favorites={favorites}
              nowPlaying={nowPlaying}
              onPlay={onPlay}
              onToggleFavorite={onToggleFavorite}
              onSeeAll={() => {
                setGroup(g);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GridResults({
  channels,
  favorites,
  nowPlaying,
  onPlay,
  onToggleFavorite,
}: {
  channels: Channel[];
  favorites: Set<string>;
  nowPlaying: string | null;
  onPlay: (c: Channel) => void;
  onToggleFavorite: (c: Channel) => void;
}) {
  const visible = channels.slice(0, GRID_CAP);
  const hidden = channels.length - visible.length;

  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-center text-muted-foreground">
        <Tv className="h-10 w-10" />
        <p className="text-sm">No channels match.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="px-1 text-xs text-muted-foreground">
        {channels.length} channel{channels.length === 1 ? "" : "s"}
        {hidden > 0 && ` · showing first ${GRID_CAP}, search to narrow`}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {visible.map((c, i) => (
          <ChannelCard
            key={`${c.streamUrl}-${i}`}
            channel={c}
            isFavorite={favorites.has(c.streamUrl)}
            isPlaying={nowPlaying === c.streamUrl}
            onPlay={() => onPlay(c)}
            onToggleFavorite={() => onToggleFavorite(c)}
          />
        ))}
      </div>
    </div>
  );
}
