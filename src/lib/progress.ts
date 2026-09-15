import type { CuratedChar } from "../data/curated";
import { readingsFor } from "../data/readings";
import { DAY_MS, PACE, type LiteracyPace } from "./pace";
import { dueMs, type CharStat } from "./storage";
import type { Domain } from "./types";

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

/** 一个字对应的统计键：多音字按读音条目拆开（兴 → 兴:高兴 / 兴:兴奋） */
export function statKeysFor(ch: string): string[] {
  const readings = readingsFor(ch);
  return readings.length === 0 ? [ch] : readings.map((r) => r.id);
}

const keysFor = statKeysFor;

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

/**
 * 掌握分 0..1：净答对（对 - 错）除以该域的 `net` 视为满掌握。
 * 识字与数学的 `net` 不同（见 src/lib/pace.ts），不要用同一把尺子量。
 */
export function scoreOf(
  stat: CharStat | undefined,
  domain: Domain = "literacy"
): number {
  if (!stat) return 0;
  return clamp01((stat.right - stat.wrong) / PACE[domain].net);
}

/** 这一档（数学）或这个字（识字）是否已经练稳 */
export function isSolid(
  stat: CharStat | undefined,
  domain: Domain = "literacy"
): boolean {
  return scoreOf(stat, domain) >= 1;
}

export function packProgress(pack: CharPack, stats: Record<string, CharStat>): number {
  if (pack.chars.length === 0) return 1;
  const sum = pack.chars.reduce((acc, c) => acc + charScore(c.ch, stats), 0);
  return sum / pack.chars.length;
}

// 渐进阈值来自 PaceParams：上一档练到 blendStart 才开始少量混入下一档，
// blendFull 之后基本放量。数学不用这条（它按天数走），别再写死常量。
function blendFactor(
  prevScore: number,
  pace: LiteracyPace = PACE.literacy
): number {
  return clamp01((prevScore - pace.blendStart) / (pace.blendFull - pace.blendStart));
}

/** 这一档从第一次练习到现在过了多少天（没练过 = 0） */
export function levelAgeDays(
  stat: CharStat | undefined,
  now: number = Date.now()
): number {
  if (!stat || !stat.startedAt) return 0;
  return Math.max(0, (now - stat.startedAt) / DAY_MS);
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
 * - 新字有配额：开头前 30 个字不限速，之后每 12 题最多 1 个新字（每天 2–3 个）；
 * - 其余按权重抽：越生的字权重越高，上一档越熟练、下一字表混入越多；
 * - 已掌握的字保留少量复习权重。
 */
export function pickLessonChars(
  packs: CharPack[],
  stats: Record<string, CharStat>,
  size: number
): CuratedChar[] {
  const pace = PACE.literacy;
  const packScores = packs.map((p) => packProgress(p, stats));
  const due: CuratedChar[] = [];
  const fresh: Array<{ item: CuratedChar; weight: number }> = [];
  const known: Array<{ item: CuratedChar; weight: number }> = [];
  // 同一个字可能同时出现在两本书的字表里，一轮里只出一次
  const seen = new Set<string>();
  // 已经有记录的字数：用来判断"开头放开的那 30 个字"有没有放完
  let introduced = 0;

  packs.forEach((pack, pi) => {
    const prevScore = pi === 0 ? 1 : packScores[pi - 1];
    const learn = pi === 0 ? 1 : blendFactor(prevScore);
    const opened = pi === 0 || prevScore > pace.blendStart;
    for (const ch of pack.chars) {
      if (seen.has(ch.ch)) continue;
      seen.add(ch.ch);
      const anyStat = keysFor(ch.ch).some((k) => stats[k]);
      if (anyStat) introduced += 1;
      if (charDue(ch.ch, stats)) {
        due.push(ch);
        continue;
      }
      const s = charScore(ch.ch, stats);
      if (!anyStat) {
        // 还没开启的档位不出现；刚开启时先少量混入，再逐步放量
        if (opened) fresh.push({ item: ch, weight: Math.max(0.05, learn) });
      } else if (s >= 0.95) {
        known.push({ item: ch, weight: pace.reviewWeight }); // 已掌握：复习权重
      } else {
        known.push({ item: ch, weight: pace.reviewWeight + learn * (1 - s) });
      }
    }
  });

  const dueTake = Math.min(due.length, Math.max(1, Math.floor(size * 0.4)));
  const picked = shuffle(due).slice(0, dueTake);
  let need = size - picked.length;

  // 新字配额：开头前 bootstrapChars 个字不限速，之后每 newEvery 题最多 1 个新字
  const newCap =
    introduced >= pace.bootstrapChars
      ? Math.max(1, Math.round(size / pace.newEvery))
      : fresh.length;
  const pickedFresh = weightedPick(fresh, Math.min(newCap, need));
  need -= pickedFresh.length;
  const pickedKnown = weightedPick(known, need);
  need -= pickedKnown.length;
  picked.push(...pickedFresh, ...pickedKnown);

  if (need > 0) {
    // 练过的字还不够多（比如刚起步一两天）：用剩下的新字补满，
    // 宁可多认几个字，也不要空着题目不给。
    const taken = new Set(picked.map((c) => c.ch));
    const rest = [...fresh, ...known].filter((x) => !taken.has(x.item.ch));
    picked.push(...weightedPick(rest, need));
  }
  return picked.slice(0, size);
}

/**
 * 数学难度规划：靠"时间 + 掌握"两个闸门控制新概念的放出节奏（参数见 src/lib/pace.ts）。
 * - 放出的档：0 是起手档；开头 warmupLevels 档一起放出（L1 加法 + L2 进位加法）；
 *   之后要等上一档练满 minDays 天 **且** 掌握到 blendStart 才放出（"哪怕全对也要一周"）；
 * - 当前主练档（第一个放出但还没练稳的档）占大头；
 * - 已放出、还没当上主力的下一档：从 sprinkle/warmupShare 慢慢涨到 maxShare；
 * - 已练稳的老概念只留 reviewWeight 复习；没放出的档一律不出题。
 */
export interface MathPlan {
  scores: number[];
  ages: number[];
  released: boolean[];
  /** 当前主练档的下标（首页/家长页显示"当前重点"也用它） */
  current: number;
}

export function planMath<T extends string>(
  levelIds: T[],
  stats: Record<string, CharStat>,
  now: number = Date.now()
): MathPlan {
  const pace = PACE.math;
  const scores = levelIds.map((id) => scoreOf(stats[id], "math"));
  const ages = levelIds.map((id) => levelAgeDays(stats[id], now));
  const released: boolean[] = [];
  for (let i = 0; i < levelIds.length; i++) {
    if (i === 0) {
      released.push(true);
    } else if (i < pace.warmupLevels) {
      // 开场豁免：前两档（加法 + 进位加法）一起放出，后面那档固定占一小部分
      released.push(released[i - 1]);
    } else {
      released.push(
        released[i - 1] && ages[i - 1] >= pace.minDays && scores[i - 1] >= pace.blendStart
      );
    }
  }
  const unsolid = released.findIndex((r, i) => r && scores[i] < 1);
  const current = unsolid === -1 ? released.filter(Boolean).length - 1 : unsolid;
  return { scores, ages, released, current };
}

export function pickMathLevels<T extends string>(
  levelIds: T[],
  stats: Record<string, CharStat>,
  count: number,
  now: number = Date.now()
): T[] {
  const pace = PACE.math;
  const { scores, ages, released, current } = planMath(levelIds, stats, now);

  const weightAt = (i: number): number => {
    if (!released[i]) return 0;
    if (i === current) return 1; // 当前概念：主练
    if (scores[i] >= 1) return pace.reviewWeight; // 已练稳的老概念：少量复习
    // 已放出、还没成为主力的下一档：按上一档练了多久 + 掌握多少慢慢涨
    const prevMastery = clamp01(
      (scores[i - 1] - pace.blendStart) / (pace.blendFull - pace.blendStart)
    );
    const timeRamp = clamp01((ages[i - 1] - pace.minDays) / pace.rampDays);
    const floor = i < pace.warmupLevels ? pace.warmupShare : pace.sprinkle;
    return Math.max(floor, pace.maxShare * timeRamp * prevMastery);
  };

  const out: T[] = [];
  for (let q = 0; q < count; q++) {
    const weighted = levelIds
      .map((id, i) => ({ id, weight: weightAt(i) }))
      .filter((x) => x.weight > 0);
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
