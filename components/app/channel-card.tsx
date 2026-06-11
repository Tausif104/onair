"use client";

import { Heart, Play, Tv } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
        "group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-colors",
        isPlaying && "ring-2 ring-primary",
      )}
    >
      <button
        onClick={onPlay}
        className="relative flex aspect-video w-full items-center justify-center bg-muted"
        aria-label={`Play ${channel.name}`}
      >
        {channel.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={channel.logo}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-contain p-3"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <Tv className="h-8 w-8 text-muted-foreground" />
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
          <Play className="h-8 w-8 fill-white text-white" />
        </span>
      </button>

      <div className="flex items-center gap-2 p-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={channel.name}>
            {channel.name}
          </p>
          {/* always rendered so every card footer is the same height */}
          <p className="truncate text-xs text-muted-foreground">
            {channel.group || " "}
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 shrink-0"
          aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
          onClick={onToggleFavorite}
        >
          <Heart
            className={cn(
              "h-5 w-5",
              isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground",
            )}
          />
        </Button>
      </div>
    </div>
  );
}
