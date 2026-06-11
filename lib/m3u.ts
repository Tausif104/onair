export type Channel = {
  name: string;
  logo: string | null;
  group: string | null;
  streamUrl: string;
  tvgId: string | null;
};

const ATTR_RE = /([\w-]+)="([^"]*)"/g;

function parseAttrs(line: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(line)) !== null) attrs[m[1].toLowerCase()] = m[2];
  return attrs;
}

/**
 * Parse an M3U / M3U8 playlist into a channel list.
 * Tolerates malformed #EXTINF lines (missing attrs, no comma name, blank lines).
 */
export function parseM3U(text: string): Channel[] {
  const lines = text.split(/\r?\n/);
  const channels: Channel[] = [];
  let pending: Omit<Channel, "streamUrl"> | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("#EXTINF")) {
      const attrs = parseAttrs(line);
      const commaIdx = line.indexOf(",");
      const displayName = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : "";
      pending = {
        name: displayName || attrs["tvg-name"] || "Unnamed channel",
        logo: attrs["tvg-logo"] || null,
        group: attrs["group-title"] || null,
        tvgId: attrs["tvg-id"] || null,
      };
    } else if (line.startsWith("#")) {
      // other directives (#EXTVLCOPT, #EXTM3U, #EXTGRP) — ignore for now
      if (line.startsWith("#EXTGRP:") && pending) {
        pending.group = pending.group || line.slice(8).trim() || null;
      }
    } else {
      // a URL line. Only emit if we have a preceding #EXTINF, else synthesize a name.
      const streamUrl = line;
      if (pending) {
        channels.push({ ...pending, streamUrl });
        pending = null;
      } else {
        channels.push({
          name: streamUrl.split("/").pop() || "Unnamed channel",
          logo: null,
          group: null,
          tvgId: null,
          streamUrl,
        });
      }
    }
  }
  return channels;
}
