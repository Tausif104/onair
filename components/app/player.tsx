"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { Maximize, PictureInPicture2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function proxify(url: string) {
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

type Level = { index: number; height: number };

export function Player({
  src,
  title,
  poster,
}: {
  src: string;
  title?: string;
  poster?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1); // -1 = auto

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setLoading(true);
    setError(null);
    setLevels([]);
    setCurrentLevel(-1);

    const source = proxify(src);
    let hls: Hls | null = null;

    const onCanPlay = () => setLoading(false);
    video.addEventListener("loadeddata", onCanPlay);

    // Safari (and iOS) play HLS natively — prefer it, skip hls.js.
    const nativeHls = video.canPlayType("application/vnd.apple.mpegurl");

    if (nativeHls) {
      video.src = source;
      video.play().catch(() => {});
    } else if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
      });
      hlsRef.current = hls;
      hls.loadSource(source);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        setLoading(false);
        setLevels(
          data.levels
            .map((l, i) => ({ index: i, height: l.height || 0 }))
            .filter((l) => l.height > 0),
        );
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
        setCurrentLevel(hls!.autoLevelEnabled ? -1 : data.level);
      });

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hls!.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls!.recoverMediaError();
            break;
          default:
            hls!.destroy();
            setError("This stream could not be played.");
            setLoading(false);
        }
      });
    } else {
      setError("Your browser does not support HLS playback.");
      setLoading(false);
    }

    return () => {
      video.removeEventListener("loadeddata", onCanPlay);
      if (hls) hls.destroy();
      hlsRef.current = null;
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

  const selectLevel = useCallback((index: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = index; // -1 → auto
    setCurrentLevel(index);
  }, []);

  const goFullscreen = useCallback(() => {
    const el = wrapRef.current;
    const video = videoRef.current as
      | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
      | null;

    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }
    if (el?.requestFullscreen) {
      el.requestFullscreen();
    } else if (video?.webkitEnterFullscreen) {
      // iOS Safari: Fullscreen API isn't supported on a <div>, only the <video>.
      video.webkitEnterFullscreen();
    } else if (video?.requestFullscreen) {
      video.requestFullscreen();
    }
  }, []);

  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (document.pictureInPictureEnabled) await video.requestPictureInPicture();
    } catch {
      // PiP unsupported / blocked — ignore
    }
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative w-full overflow-hidden rounded-xl bg-black aspect-video"
    >
      <video
        ref={videoRef}
        className="h-full w-full bg-black"
        controls
        playsInline
        poster={poster ?? undefined}
      />

      {loading && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 p-4 text-center text-white">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Top control bar */}
      <div className="absolute right-2 top-2 flex items-center gap-1">
        {levels.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 bg-black/60 text-white hover:bg-black/80"
                />
              }
            >
              {currentLevel === -1
                ? "Auto"
                : `${levels.find((l) => l.index === currentLevel)?.height ?? ""}p`}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => selectLevel(-1)}>
                Auto
              </DropdownMenuItem>
              {levels
                .slice()
                .sort((a, b) => b.height - a.height)
                .map((l) => (
                  <DropdownMenuItem key={l.index} onClick={() => selectLevel(l.index)}>
                    {l.height}p
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button
          size="icon"
          variant="secondary"
          aria-label="Picture in picture"
          className="h-8 w-8 bg-black/60 text-white hover:bg-black/80"
          onClick={togglePip}
        >
          <PictureInPicture2 className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          aria-label="Fullscreen"
          className="h-8 w-8 bg-black/60 text-white hover:bg-black/80"
          onClick={goFullscreen}
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      {title && (
        <div className="pointer-events-none absolute bottom-12 left-3 right-3 truncate text-sm font-medium text-white drop-shadow">
          {title}
        </div>
      )}
    </div>
  );
}
