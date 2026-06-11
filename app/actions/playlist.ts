"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import { parseM3U, type Channel } from "@/lib/m3u";

const addSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(80),
  url: z.string().trim().url("Enter a valid URL"),
});

export type PlaylistRecord = { id: string; name: string; url: string };
export type PlaylistState =
  | { error?: string; ok?: boolean; playlist?: PlaylistRecord }
  | undefined;

export async function addPlaylist(
  _prev: PlaylistState,
  formData: FormData,
): Promise<PlaylistState> {
  const userId = await getUserId();
  if (!userId) return { error: "Not signed in" };

  const parsed = addSchema.safeParse({
    name: formData.get("name"),
    url: formData.get("url"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const created = await prisma.playlist.create({ data: { ...parsed.data, userId } });
  revalidatePath("/");
  return {
    ok: true,
    playlist: { id: created.id, name: created.name, url: created.url },
  };
}

export async function removePlaylist(id: string) {
  const userId = await getUserId();
  if (!userId) return;
  // deleteMany scoped to userId = ownership check
  await prisma.playlist.deleteMany({ where: { id, userId } });
  revalidatePath("/");
}

/**
 * Server-side fetch + parse of a user's playlist URL (through the proxy logic, but
 * here we fetch directly on the server — no browser CORS to worry about).
 * Returns parsed channels; we never persist the full channel list (PLAN §5).
 */
export async function fetchPlaylistChannels(playlistId: string): Promise<{
  channels?: Channel[];
  error?: string;
}> {
  const userId = await getUserId();
  if (!userId) return { error: "Not signed in" };

  const playlist = await prisma.playlist.findFirst({
    where: { id: playlistId, userId },
  });
  if (!playlist) return { error: "Playlist not found" };

  try {
    const res = await fetch(playlist.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; IPTV-Web-Player)" },
      cache: "no-store",
    });
    if (!res.ok) return { error: `Failed to load playlist (${res.status})` };
    const text = await res.text();
    const channels = parseM3U(text);
    if (channels.length === 0) return { error: "No channels found in playlist" };
    return { channels };
  } catch {
    return { error: "Could not fetch playlist" };
  }
}
