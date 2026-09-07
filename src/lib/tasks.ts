import type { CuratedChar } from "../data/curated";

export type LiteracyMode = "audio" | "imposter" | "feed";

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
      options: string[]; // N-1 个 target + 1 个 odd
    }
  | {
      kind: "feed";
      target: string;
      animal: string;
      options: Array<{ ch: string; isTarget: boolean }>;
    };

const ZOO = ["🐻", "🐰", "🐼", "🦊", "🐵", "🐯", "🦁", "🐨"];

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

/** 一整局只玩一种玩法；字符由自动进阶引擎选出 */
export function buildSessionTasks(
  mode: LiteracyMode,
  chars: CuratedChar[],
  size: number,
  imposterGrid: 6 | 9 = 9
): Task[] {
  const tasks: Task[] = [];
  chars.forEach((entry) => {
    if (tasks.length >= size) return;
    if (mode === "imposter") {
      const odd = pickDecoys(entry, 1)[0];
      if (!odd) return;
      tasks.push({
        kind: "imposter",
        target: entry.ch,
        odd,
        options: shuffle([
          ...Array.from({ length: imposterGrid - 1 }, () => entry.ch),
          odd,
        ]),
      });
      return;
    }
    if (mode === "feed") {
      tasks.push({
        kind: "feed",
        target: entry.ch,
        animal: ZOO[Math.floor(Math.random() * ZOO.length)],
        options: shuffle([
          { ch: entry.ch, isTarget: true },
          ...pickDecoys(entry, 2).map((ch) => ({ ch, isTarget: false })),
        ]),
      });
      return;
    }
    // audio
    tasks.push({
      kind: "audio",
      target: entry.ch,
      options: shuffle([
        { ch: entry.ch, isTarget: true },
        ...pickDecoys(entry, 2).map((ch) => ({ ch, isTarget: false })),
      ]),
    });
  });
  return tasks.slice(0, size);
}

