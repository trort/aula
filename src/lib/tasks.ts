import { FEED_BY_CHAR } from "../data/feed";
import type { CuratedChar } from "../data/curated";

export type Task =
  | {
      kind: "audio";
      target: string;
      options: Array<{ ch: string; isTarget: boolean }>;
    }
  | {
      kind: "imposter";
      target: string;
      odd: string;
      options: string[]; // 3 个 target + 1 个 odd
    }
  | {
      kind: "feed";
      target: string;
      emoji: string;
      say: string;
      options: Array<{ ch: string; isTarget: boolean }>;
    };

function shuffle<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickDecoys(entry: CuratedChar, count: number): string[] {
  return shuffle(entry.decoys).slice(0, count);
}

export function buildLiteracyTasks(chars: CuratedChar[], size: number): Task[] {
  const tasks: Task[] = [];
  chars.forEach((entry, i) => {
    if (tasks.length >= size) return;
    const mode = i % 3;
    if (mode === 1) {
      const odd = pickDecoys(entry, 1)[0];
      if (odd) {
        tasks.push({
          kind: "imposter",
          target: entry.ch,
          odd,
          options: shuffle([entry.ch, entry.ch, entry.ch, odd]),
        });
        return;
      }
    }
    if (mode === 2) {
      const feed = FEED_BY_CHAR.get(entry.ch);
      if (feed) {
        const decoys = pickDecoys(entry, 2);
        tasks.push({
          kind: "feed",
          target: entry.ch,
          emoji: feed.emoji,
          say: feed.say,
          options: shuffle([
            { ch: entry.ch, isTarget: true },
            ...decoys.map((ch) => ({ ch, isTarget: false })),
          ]),
        });
        return;
      }
      // 没有喂食配对时，退化为找茬，保证玩法仍然丰富
      const odd = pickDecoys(entry, 1)[0];
      if (odd) {
        tasks.push({
          kind: "imposter",
          target: entry.ch,
          odd,
          options: shuffle([entry.ch, entry.ch, entry.ch, odd]),
        });
        return;
      }
    }
    // audio（默认模式）
    const decoys = pickDecoys(entry, 2);
    tasks.push({
      kind: "audio",
      target: entry.ch,
      options: shuffle([
        { ch: entry.ch, isTarget: true },
        ...decoys.map((ch) => ({ ch, isTarget: false })),
      ]),
    });
  });
  return tasks.slice(0, size);
}
