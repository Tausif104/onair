import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app/app-shell";
import type { Channel } from "@/lib/m3u";

export default async function HomePage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const [user, favorites, history] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, name: true },
    }),
    prisma.favorite.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    }),
    prisma.watchHistory.findMany({
      where: { userId },
      orderBy: { lastWatched: "desc" },
      take: 50,
    }),
  ]);

  const favChannels: Channel[] = favorites.map((f) => ({
    name: f.name,
    logo: f.logo,
    group: f.group,
    streamUrl: f.streamUrl,
    tvgId: null,
  }));
  const historyChannels: Channel[] = history.map((h) => ({
    name: h.name,
    logo: h.logo,
    group: null,
    streamUrl: h.streamUrl,
    tvgId: null,
  }));

  return (
    <AppShell
      user={user}
      initialFavorites={favChannels}
      initialHistory={historyChannels}
    />
  );
}
