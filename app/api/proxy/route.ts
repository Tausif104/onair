import { NextRequest } from "next/server";

// Generic CORS fetch relay for user-supplied M3U playlists + HLS manifests/segments.
// NOT a restreaming service or curated catalog (PLAN §2). It only forwards what the
// user asked for, with an SSRF guard against internal targets.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BLOCKED_HOST = /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|::1|\[::1\])/i;
// 172.16.0.0 – 172.31.255.255
const BLOCKED_172 = /^172\.(1[6-9]|2\d|3[0-1])\./;

function isBlocked(url: URL): boolean {
  if (url.protocol !== "http:" && url.protocol !== "https:") return true;
  const host = url.hostname;
  if (BLOCKED_HOST.test(host) || BLOCKED_172.test(host)) return true;
  return false;
}

function proxied(target: string, base: URL): string {
  try {
    const abs = new URL(target, base).toString();
    return `/api/proxy?url=${encodeURIComponent(abs)}`;
  } catch {
    return target;
  }
}

// Rewrite manifest URLs (segments, variant playlists, keys) to route back through us.
function rewriteManifest(body: string, upstream: URL): string {
  return body
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#")) {
        // rewrite URI="..." inside tags (EXT-X-KEY, EXT-X-MEDIA, EXT-X-MAP)
        return line.replace(/URI="([^"]+)"/g, (_m, uri) => `URI="${proxied(uri, upstream)}"`);
      }
      return proxied(trimmed, upstream);
    })
    .join("\n");
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) return new Response("Missing url", { status: 400 });

  let upstream: URL;
  try {
    upstream = new URL(raw);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }
  if (isBlocked(upstream)) return new Response("Blocked target", { status: 403 });

  let res: Response;
  try {
    res = await fetch(upstream, {
      headers: {
        // some hosts reject requests without a UA / referer
        "User-Agent": "Mozilla/5.0 (compatible; IPTV-Web-Player)",
        Accept: "*/*",
      },
      redirect: "follow",
      cache: "no-store",
    });
  } catch {
    return new Response("Upstream fetch failed", { status: 502 });
  }

  if (!res.ok) {
    return new Response(`Upstream error ${res.status}`, { status: res.status });
  }

  const contentType = res.headers.get("content-type") ?? "";
  const looksLikeManifest =
    /mpegurl|x-mpegurl/i.test(contentType) ||
    /\.m3u8?(\?|$)/i.test(upstream.pathname);

  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
  };

  if (looksLikeManifest) {
    const text = await res.text();
    const rewritten = rewriteManifest(text, upstream);
    return new Response(rewritten, {
      headers: {
        ...cors,
        "Content-Type": "application/vnd.apple.mpegurl",
      },
    });
  }

  // Binary passthrough (segments, keys, logos, raw playlists).
  return new Response(res.body, {
    headers: {
      ...cors,
      "Content-Type": contentType || "application/octet-stream",
    },
  });
}
