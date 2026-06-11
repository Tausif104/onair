"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { ListVideo, Trash2, Plus, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  addPlaylist,
  type PlaylistState,
  type PlaylistRecord,
} from "@/app/actions/playlist";

export function PlaylistManager({
  playlists,
  activeId,
  onAdded,
  onRemove,
  onSelect,
}: {
  playlists: PlaylistRecord[];
  activeId: string | null;
  onAdded: (p: PlaylistRecord) => void;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const [state, formAction, pending] = useActionState<PlaylistState, FormData>(
    addPlaylist,
    undefined,
  );

  useEffect(() => {
    if (state?.ok && state.playlist) {
      toast.success("Playlist added");
      onAdded(state.playlist);
    } else if (state?.error) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="pl-name">Name</Label>
          <Input id="pl-name" name="name" placeholder="My playlist" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pl-url">M3U URL</Label>
          <Input
            id="pl-url"
            name="url"
            type="url"
            inputMode="url"
            placeholder="https://example.com/playlist.m3u"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add playlist
        </Button>
      </form>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Your playlists</p>
        {playlists.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center text-muted-foreground">
            <ListVideo className="h-8 w-8" />
            <p className="text-sm">No playlists yet. Add one above.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {playlists.map((p) => (
              <li
                key={p.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-2",
                  activeId === p.id && "border-primary bg-accent/50",
                )}
              >
                <button
                  onClick={() => onSelect(p.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  {activeId === p.id ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <ListVideo className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {p.url}
                    </span>
                  </span>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label="Remove playlist"
                  onClick={() => onRemove(p.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
