"use server";

import { getUserId } from "@/lib/auth";
import { parseM3U, type Channel } from "@/lib/m3u";
import { DEFAULT_PLAYLIST_URL } from "@/lib/config";

/**
 * Fetch + parse the default channel source on the server (no browser CORS).
 * We never persist the parsed channel list — only user-owned favorites/history.
 */
export async function fetchDefaultChannels(): Promise<{
  channels?: Channel[];
  error?: string;
}> {
  const userId = await getUserId();
  if (!userId) return { error: "Not signed in" };

  try {
    const res = await fetch(DEFAULT_PLAYLIST_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; IPTV-Web-Player)" },
      // the list is >2MB so Next's data cache can't hold it; fetch fresh (~1s).
      cache: "no-store",
    });
    if (!res.ok) return { error: `Failed to load channels (${res.status})` };
    const text = await res.text();
    const channels = parseM3U(text);
    if (channels.length === 0) return { error: "No channels found" };
    return { channels };
  } catch {
    return { error: "Could not load channels" };
  }
}
