// Default channel source loaded for everyone (override via env).
// iptv-org aggregates publicly available, free-to-air streams grouped by country.
// We don't host or bundle any streams — this is a pointer the app fetches at runtime.
export const DEFAULT_PLAYLIST_URL =
  process.env.DEFAULT_PLAYLIST_URL ??
  "https://iptv-org.github.io/iptv/index.country.m3u";
