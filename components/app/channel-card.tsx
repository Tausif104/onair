"use client";

import { Heart, Play, Tv } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Channel } from "@/lib/m3u";

export function ChannelCard({
  channel,
  isFavorite,
  isPlaying,
  onPlay,
  onToggleFavorite,
}: {
  channel: Channel;
  isFavorite: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-white/5 bg-card/80 backdrop-blur-sm",
        "transition-colors duration-300 ease-out",
        "hover:border-primary/40",
        isPlaying && "border-primary/70 ring-2 ring-primary/60",
      )}
    >
      <button
        onClick={onPlay}
        className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-gradient-to-br from-white/[0.04] to-black/30"
        aria-label={`Play ${channel.name}`}
      >
        {channel.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={channel.logo}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-contain p-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <Tv className="h-8 w-8 text-muted-foreground/60" />
        )}

        {/* play overlay */}
        <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 ring-4 ring-primary/20">
            <Play className="h-5 w-5 fill-current" />
          </span>
        </span>

        {isPlaying && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            Live
          </span>
        )}
      </button>

      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight" title={channel.name}>
            {channel.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {channel.group || " "}
          </p>
        </div>
        <button
          aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
          onClick={onToggleFavorite}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/10"
        >
          <Heart
            className={cn(
              "h-5 w-5 transition-all",
              isFavorite
                ? "scale-110 fill-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          />
        </button>
      </div>
    </div>
  );
}
