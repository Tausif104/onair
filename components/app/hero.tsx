"use client";

import { Play, Heart, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Channel } from "@/lib/m3u";

export function Hero({
  channel,
  isFavorite,
  onPlay,
  onToggleFavorite,
}: {
  channel: Channel;
  isFavorite: boolean;
  onPlay: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div className="relative mb-8 overflow-hidden rounded-2xl border border-white/5 animate-rise">
      {/* blurred backdrop from the channel logo */}
      <div className="absolute inset-0 -z-10">
        {channel.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={channel.logo}
            alt=""
            className="h-full w-full scale-125 object-cover opacity-30 blur-2xl saturate-150"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-transparent to-transparent" />
      </div>

      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-10">
        {/* logo plate */}
        <div className="grid aspect-video w-full max-w-xs shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-black/40 p-6 shadow-2xl shadow-black/50">
          {channel.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={channel.logo}
              alt={channel.name}
              className="max-h-full max-w-full object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
            />
          ) : (
            <Radio className="h-12 w-12 text-primary" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/30">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Featured
          </div>
          <h1 className="font-display text-4xl leading-none tracking-wide sm:text-6xl">
            {channel.name}
          </h1>
          {channel.group && (
            <p className="mt-2 text-sm text-muted-foreground">{channel.group}</p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={onPlay} className="gap-2 px-6 font-semibold">
              <Play className="h-5 w-5 fill-current" /> Play now
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={onToggleFavorite}
              className="gap-2 bg-white/10 hover:bg-white/20"
            >
              <Heart
                className={cn(
                  "h-5 w-5",
                  isFavorite && "fill-primary text-primary",
                )}
              />
              {isFavorite ? "In favorites" : "Favorite"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
