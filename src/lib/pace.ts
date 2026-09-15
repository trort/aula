import type { Domain } from "./types";

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 自动进阶的节奏参数（语文 / 数学各一套，语义不同，别互相抄）。
 *
 * 目标（家长 2026-09-14 定）：按"每天各练 30 题"算
 *
 * - 识字：**每天 2–3 个新字**
 *   - 开头前 `bootstrapChars`(30) 个字不限速，一口气放出来（不然最开头没东西可学）；
 *   - 之后每 `newEvery`(12) 题最多引入 1 个新字 → 5/10/15 题一局 = 每局 1 个；
 *     30 题/天 = 2–3 局 = 2–3 个新字；
 *   - 其余题量全部用于复习已认识的字（含抗遗忘到期项）。
 *
 * - 数学：**约两周一个新概念，最快也要一周**
 *   - 一档"练稳" = 净答对 `net`(200) ≈ 每天 30 题练 10 天左右；
 *   - 开头 `warmupLevels`(2) 档一起放出：L1 加法 + L2 进位加法，
 *     后一档固定占 `warmupShare`（1/9 权重 ≈ 10% 题量，即 90% / 10%）；
 *   - 之后：上一档练满 `minDays`(7) 天 **且** 掌握到 `blendStart`(50%) 才放出下一档
 *     （"哪怕全对也要至少一周"的硬闸门），再花 `rampDays`(7) 天涨到 `maxShare`；
 *   - 当前主练的那一档占大头，已练稳的老概念只留 `reviewWeight` 复习。
 *
 * 为什么两边不能用同一套：识字有 300+ 字、22 个字表，推进单位是"字"；
 * 数学一共 6 档，一档就是整块能力（如"进位加法"），用识字参数会在第三轮就出减法
 * （实测见 docs/phase-log-2026-09-07.md 的 v0.37）。想调快/调慢只改这个文件。
 */
interface BasePace {
  /** "练稳"（掌握分 = 1）需要的净答对（right - wrong）题数 */
  net: number;
}

export interface LiteracyPace extends BasePace {
  /** 上一字表掌握分到多少，才把下一字表的新字混进来 */
  blendStart: number;
  /** 上一字表掌握分到多少，下一字表放量 */
  blendFull: number;
  /** 已练稳的字保留的复习权重 */
  reviewWeight: number;
  /** 每多少题最多引入 1 个新字（"每天几个新字"就调它） */
  newEvery: number;
  /** 课程开头先放开多少个字，不限新字配额 */
  bootstrapChars: number;
}

export interface MathPace extends BasePace {
  /** 上一档掌握分到多少，才放出下一档（300 × 0.5 = 净答对 150 ≈ 一周） */
  blendStart: number;
  /** 上一档掌握分到多少，下一档的权重放满 */
  blendFull: number;
  /** 已练稳的档保留的复习权重 */
  reviewWeight: number;
  /** 一档至少练满多少天，下一档才可能放出（"最快一周"的硬闸门） */
  minDays: number;
  /** 从 minDays 起再过多少天，下一档涨到 maxShare（7 → 14 天） */
  rampDays: number;
  /** 下一档最多占多少（相对当前档的 1.0）；其余题量留给当前档和复习 */
  maxShare: number;
  /** 刚放出时下一档的权重（"偶尔撞见一道"） */
  sprinkle: number;
  /** 开头就一起放出的档数（L1 加法 + L2 进位加法） */
  warmupLevels: number;
  /** 开场豁免档的固定权重：1/9 ≈ 10% 题量 */
  warmupShare: number;
}

export const PACE: { literacy: LiteracyPace; math: MathPace } = {
  literacy: {
    net: 3,
    blendStart: 0.5,
    blendFull: 0.9,
    reviewWeight: 0.25,
    newEvery: 12,
    bootstrapChars: 30,
  },
  math: {
    // 200 次净答对 ≈ 每天 30 题练 10 天；配合下面"掌握到一半就放出下一档"，
    // 实际表现为大约每两周出现一个新概念（实测：第 1 天 L1+L2、第 16 天 L3、第 29 天 L4）。
    net: 200,
    blendStart: 0.5,
    blendFull: 1,
    reviewWeight: 0.25,
    minDays: 7,
    rampDays: 7,
    maxShare: 0.5,
    sprinkle: 0.03,
    warmupLevels: 2,
    warmupShare: 1 / 9,
  },
};

/** 两个域都有的字段，`scoreOf` 之类的通用函数只用得到它 */
export type Pace = BasePace;

export const PACE_OF: Record<Domain, Pace> = PACE;
