import type { CuratedChar } from "../data/curated";
import { readingsFor } from "../data/readings";
import { dueMs, type CharStat } from "./storage";

export interface CharPack {
  id: string;
  title: string;
  chars: CuratedChar[];
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
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

function keysFor(ch: string): string[] {
  const readings = readingsFor(ch);
  return readings.length === 0 ? [ch] : readings.map((r) => r.id);
}

// 一个字的所有读音条目都掌握，才算这个字掌握
export function charMastered(
  ch: string,
  stats: Record<string, CharStat>
): boolean {
  const keys = keysFor(ch);
  return keys.every((k) => mastered(stats[k]));
}

export function charScore(
  ch: string,
  stats: Record<string, CharStat>
): number {
  const keys = keysFor(ch);
  if (keys.length === 0) return 0;
  return Math.min(...keys.map((k) => scoreOf(stats[k])));
}

function charDue(ch: string, stats: Record<string, CharStat>): boolean {
  return keysFor(ch).some((k) => {
    const stat = stats[k];
    return !!stat && dueMs(stat) <= 0;
  });
}

// 连续掌握度 0..1：净答对 3 次视为满掌握
export function scoreOf(stat: CharStat | undefined): number {
  if (!stat) return 0;
  return clamp01((stat.right - stat.wrong) / 3);
}

export function packProgress(pack: CharPack, stats: Record<string, CharStat>): number {
  if (pack.chars.length === 0) return 1;
  const sum = pack.chars.reduce((acc, c) => acc + charScore(c.ch, stats), 0);
  return sum / pack.chars.length;
}

// 渐进阈值：上一档掌握约 50% 才开始少量混入下一档，90% 后基本放量
const BLEND_START = 0.5;
const BLEND_FULL = 0.9;

function blendFactor(prevScore: number): number {
  return clamp01((prevScore - BLEND_START) / (BLEND_FULL - BLEND_START));
}

// 当前"重点"档：第一个还没练稳（<85%）的档，全稳了就指向最后一档
export function focusIndex(
  scores: number[],
  threshold = 0.85
): number {
  const idx = scores.findIndex((s) => s < threshold);
  return idx === -1 ? Math.max(0, scores.length - 1) : idx;
}

function weightedPick<T>(items: Array<{ item: T; weight: number }>, size: number): T[] {
  const pool = items.map((x) => ({ ...x }));
  const out: T[] = [];
  let guard = 0;
  while (out.length < size && pool.length > 0 && guard < size * 100 + 500) {
    guard += 1;
    const total = pool.reduce((acc, x) => acc + Math.max(0, x.weight), 0);
    if (total <= 0) break;
    let r = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < pool.length; i++) {
      r -= Math.max(0, pool[i].weight);
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    out.push(pool[idx].item);
    pool.splice(idx, 1);
  }
  return out;
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
 * 识字选字：渐进混合 + 复习。
 * - 到期/刚错的字先占一部分（抗遗忘）；
 * - 其余按权重抽：越简单的未掌握字权重越高，上一档越熟练、下一档混入越多；
 * - 已掌握的字保留少量复习权重。
 */
export function pickLessonChars(
  packs: CharPack[],
  stats: Record<string, CharStat>,
  size: number
): CuratedChar[] {
  const packScores = packs.map((p) => packProgress(p, stats));
  const all: Array<{ item: CuratedChar; weight: number }> = [];
  const due: CuratedChar[] = [];

  packs.forEach((pack, pi) => {
    const prevScore = pi === 0 ? 1 : packScores[pi - 1];
    const learn = pi === 0 ? 1 : blendFactor(prevScore);
    const opened = pi === 0 || prevScore > BLEND_START;
    for (const ch of pack.chars) {
      if (charDue(ch.ch, stats)) {
        due.push(ch);
        continue;
      }
      const s = charScore(ch.ch, stats);
      const anyStat = keysFor(ch.ch).some((k) => stats[k]);
      let weight: number;
      if (!anyStat) {
        // 还没开启的档位不出现；刚开启时先少量混入，再逐步放量
        weight = opened ? Math.max(0.05, learn) : 0;
      } else if (s >= 0.95) {
        weight = 0.25; // 已掌握：复习权重
      } else {
        weight = 0.25 + learn * (1 - s);
      }
      if (weight > 0) all.push({ item: ch, weight });
    }
  });

  const dueTake = Math.min(due.length, Math.max(1, Math.floor(size * 0.4)));
  const pickedDue = shuffle(due).slice(0, dueTake);
  const need = Math.max(0, size - pickedDue.length);
  const pickedLearn = weightedPick(all, need);
  const result = [...pickedDue, ...pickedLearn];
  return result.length <= size ? result : result.slice(0, size);
}

/**
 * 数学难度抽样：与识字同一套渐进混合规则。
 * 每道题按权重抽一个难度，权重由"上一档掌握度"和"本档自身掌握度"共同决定。
 */
export function pickMathLevels<T extends string>(
  levelIds: T[],
  stats: Record<string, CharStat>,
  count: number
): T[] {
  const levelScores = levelIds.map((id) => scoreOf(stats[id]));
  const out: T[] = [];
  for (let q = 0; q < count; q++) {
    const weighted = levelIds.map((id, i) => {
      const prevScore = i === 0 ? 1 : levelScores[i - 1];
      const learn = i === 0 ? 1 : blendFactor(prevScore);
      const stat = stats[id];
      const opened = i === 0 || prevScore > BLEND_START;
      if (!stat) {
        return { id, weight: opened ? Math.max(0.05, learn) : 0 };
      }
      const s = levelScores[i];
      const weight = s >= 0.95 ? 0.25 : 0.25 + learn * (1 - s); // 已练稳：复习权重
      return { id, weight };
    }).filter((x) => x.weight > 0);
    if (weighted.length === 0) break;
    const total = weighted.reduce((a, x) => a + x.weight, 0);
    let r = Math.random() * total;
    let chosen = weighted.length - 1;
    for (let i = 0; i < weighted.length; i++) {
      r -= weighted[i].weight;
      if (r <= 0) {
        chosen = i;
        break;
      }
    }
    out.push(weighted[chosen].id);
  }
  return out;
}
