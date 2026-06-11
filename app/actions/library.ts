"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

const channelSchema = z.object({
  name: z.string().trim().min(1).max(200),
  streamUrl: z.string().trim().url(),
  logo: z.string().trim().url().nullable().optional(),
  group: z.string().trim().max(200).nullable().optional(),
});

export async function toggleFavorite(input: {
  name: string;
  streamUrl: string;
  logo?: string | null;
  group?: string | null;
}): Promise<{ favorited: boolean; error?: string }> {
  const userId = await getUserId();
  if (!userId) return { favorited: false, error: "Not signed in" };

  const parsed = channelSchema.safeParse(input);
  if (!parsed.success) return { favorited: false, error: "Invalid channel" };
  const { name, streamUrl, logo, group } = parsed.data;

  const existing = await prisma.favorite.findUnique({
    where: { userId_streamUrl: { userId, streamUrl } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    revalidatePath("/");
    return { favorited: false };
  }

  await prisma.favorite.create({
    data: { userId, name, streamUrl, logo: logo ?? null, group: group ?? null },
  });
  revalidatePath("/");
  return { favorited: true };
}

export async function recordWatch(input: {
  name: string;
  streamUrl: string;
  logo?: string | null;
}): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  const parsed = channelSchema.omit({ group: true }).safeParse(input);
  if (!parsed.success) return;
  const { name, streamUrl, logo } = parsed.data;

  await prisma.watchHistory.upsert({
    where: { userId_streamUrl: { userId, streamUrl } },
    create: { userId, name, streamUrl, logo: logo ?? null },
    update: { name, logo: logo ?? null, lastWatched: new Date() },
  });
  revalidatePath("/");
}

export async function clearHistory(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  await prisma.watchHistory.deleteMany({ where: { userId } });
  revalidatePath("/");
}
