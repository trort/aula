import type { CuratedChar } from "../data/curated";
import { dueMs, type CharStat } from "./storage";

export interface CharPack {
  id: string;
  title: string;
  chars: CuratedChar[];
}

export function mastered(stat: CharStat | undefined): boolean {
  return (
    !!stat &&
    stat.right >= 2 &&
    stat.right > stat.wrong &&
    stat.lastOk &&
    stat.seenAt > 0
  );
}

export function packMasteryRatio(pack: CharPack, stats: Record<string, CharStat>): number {
  if (pack.chars.length === 0) return 1;
  const done = pack.chars.filter((c) => mastered(stats[c.ch])).length;
  return done / pack.chars.length;
}

// 第一个"还没学满"的字包 = 当前课；之前的包都已达到解锁线
export function currentPackIndex(
  packs: CharPack[],
  stats: Record<string, CharStat>,
  threshold = 0.7
): number {
  const idx = packs.findIndex((p) => packMasteryRatio(p, stats) < threshold);
  return idx === -1 ? packs.length - 1 : idx;
}

export function unlockedPacks(
  packs: CharPack[],
  stats: Record<string, CharStat>,
  threshold = 0.7
): CharPack[] {
  return packs.slice(0, currentPackIndex(packs, stats, threshold) + 1);
}

function shuffle<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 自动选"下一课"的字：
 * 1. 到期/刚错的字优先；
 * 2. 还没掌握的字按"简单→难"顺序；
 * 3. 已掌握的字用来复习补足。
 */
export function pickLessonChars(
  packs: CharPack[],
  stats: Record<string, CharStat>,
  size: number
): CuratedChar[] {
  const active = unlockedPacks(packs, stats);
  const pool = active.flatMap((p) => p.chars);

  const due = shuffle(pool.filter((c) => {
    const stat = stats[c.ch];
    return !!stat && dueMs(stat) <= 0;
  }));
  const unmasteredByPack: CuratedChar[] = [];
  for (const pack of active) {
    unmasteredByPack.push(
      ...shuffle(pack.chars.filter((c) => !mastered(stats[c.ch]) && !due.includes(c)))
    );
  }
  const masteredReview = shuffle(pool.filter((c) => !due.includes(c) && !unmasteredByPack.includes(c)));

  const order = [...due, ...unmasteredByPack, ...masteredReview];
  if (order.length <= size) return order;
  return order.slice(0, size);
}

