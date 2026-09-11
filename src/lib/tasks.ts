import type { CuratedChar } from "../data/curated";
import { readingsFor } from "../data/readings";
import { pickDecoysFor } from "./decoys";

export type LiteracyMode = "audio" | "imposter" | "feed" | "scratch";

export type Task =
  | {
      kind: "audio";
      target: string;
      sense?: { id: string; carrier: string };
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
    }
  | {
      kind: "scratch";
      target: string;
      sense?: { id: string; carrier: string };
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

// 找茬模式不放音，只比字形：同音的干扰字（如 站/占、坐/座）照旧是好陷阱，不套用同音过滤
function pickVisualDecoys(entry: CuratedChar, count: number): string[] {
  return shuffle(entry.decoys).slice(0, count);
}

function pickReading(
  ch: string
): { id: string; carrier: string; py: string } | undefined {
  const list = readingsFor(ch);
  if (list.length === 0) return undefined;
  return list[Math.floor(Math.random() * list.length)];
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
      const odd = pickVisualDecoys(entry, 1)[0];
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
      // 这一支不会朗读"承载词"（题目只报字音），所以按字条默认读音过滤
      const decoys = pickDecoysFor(entry, 3);
      tasks.push({
        kind: "feed",
        target: entry.ch,
        animal: ZOO[Math.floor(Math.random() * ZOO.length)],
        options: shuffle([
          { ch: entry.ch, isTarget: true },
          ...decoys.map((ch) => ({ ch, isTarget: false })),
        ]),
      });
      return;
    }
    if (mode === "scratch") {
      const sense = pickReading(entry.ch);
      const decoys = pickDecoysFor(entry, 3, { py: sense?.py });
      tasks.push({
        kind: "scratch",
        target: entry.ch,
        sense,
        options: shuffle([
          { ch: entry.ch, isTarget: true },
          ...decoys.map((ch) => ({ ch, isTarget: false })),
        ]),
      });
      return;
    }
    // audio
    const sense = pickReading(entry.ch);
    tasks.push({
      kind: "audio",
      target: entry.ch,
      sense,
      options: shuffle([
        { ch: entry.ch, isTarget: true },
        ...pickDecoysFor(entry, 2, { py: sense?.py }).map((ch) => ({
          ch,
          isTarget: false,
        })),
      ]),
    });
  });
  return tasks.slice(0, size);
}
