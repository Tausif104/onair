"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight, ChevronRight as Arrow } from "lucide-react";
import { ChannelCard } from "@/components/app/channel-card";
import type { Channel } from "@/lib/m3u";

export function ChannelRail({
  title,
  channels,
  favorites,
  nowPlaying,
  onPlay,
  onToggleFavorite,
  onSeeAll,
  total,
}: {
  title: string;
  channels: Channel[];
  favorites: Set<string>;
  nowPlaying: string | null;
  onPlay: (c: Channel) => void;
  onToggleFavorite: (c: Channel) => void;
  onSeeAll?: () => void;
  total?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: "smooth" });
  };

  if (channels.length === 0) return null;

  return (
    <section className="group/rail relative">
      <div className="mb-2 flex items-end justify-between px-1">
        <h2 className="font-display text-xl tracking-wide sm:text-2xl">
          {title}
          {total ? (
            <span className="ml-2 align-middle font-sans text-xs font-normal tracking-normal text-muted-foreground">
              {total}
            </span>
          ) : null}
        </h2>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            See all <Arrow className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* desktop scroll arrows */}
      <button
        aria-label="Scroll left"
        onClick={() => scrollBy(-1)}
        className="absolute left-0 top-[3.2rem] z-20 hidden h-[calc(100%-3.5rem)] w-10 place-items-center rounded-l-xl bg-gradient-to-r from-background to-transparent opacity-0 transition-opacity group-hover/rail:opacity-100 md:grid"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        aria-label="Scroll right"
        onClick={() => scrollBy(1)}
        className="absolute right-0 top-[3.2rem] z-20 hidden h-[calc(100%-3.5rem)] w-10 place-items-center rounded-r-xl bg-gradient-to-l from-background to-transparent opacity-0 transition-opacity group-hover/rail:opacity-100 md:grid"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      <div
        ref={trackRef}
        className="no-scrollbar flex gap-3 overflow-x-auto scroll-px-1 px-1 pb-2 [scroll-snap-type:x_mandatory]"
      >
        {channels.map((c, i) => (
          <div
            key={`${c.streamUrl}-${i}`}
            className="w-[150px] shrink-0 [scroll-snap-align:start] sm:w-[190px] lg:w-[210px]"
          >
            <ChannelCard
              channel={c}
              isFavorite={favorites.has(c.streamUrl)}
              isPlaying={nowPlaying === c.streamUrl}
              onPlay={() => onPlay(c)}
              onToggleFavorite={() => onToggleFavorite(c)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
