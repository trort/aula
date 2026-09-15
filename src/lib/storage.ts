import type { Domain } from "./types";
import { READINGS } from "../data/readings";
import { DAY_MS, PACE } from "./pace";

const STORAGE_KEY = "kids-learning-companion-v1";

export interface CharStat {
  right: number;
  wrong: number;
  streak: number;
  seenAt: number;
  /** 第一次练这一项的时间（数学的"一档至少练满 N 天"闸门用它；旧数据迁移时补 seenAt） */
  startedAt?: number;
  lastOk: boolean;
  confusion: Record<string, number>; // 错选的干扰字 -> 次数
}

export interface SessionSummary {
  at: number;
  domain: Domain;
  total: number;
  correct: number;
  missed: string[];
}

export interface AppState {
  v: 1;
  chars: Record<string, CharStat>;
  math: Record<string, CharStat>; // key = 难度级别 L1..L6
  rewards: RewardState;
  sessions: SessionSummary[];
}

export interface RewardState {
  stars: number; // 星星罐累计
  stickers: string[]; // 已获得的贴纸（emoji）
  perfect: number; // 全对次数
}

export const emptyState = (): AppState => ({
  v: 1,
  chars: {},
  math: {},
  rewards: { stars: 0, stickers: [], perfect: 0 },
  sessions: [],
});

function migrateReadingStats(chars: Record<string, CharStat>): Record<string, CharStat> {
  const out = { ...chars };
  for (const reading of READINGS) {
    if (out[reading.ch] && !out[reading.id]) {
      out[reading.id] = out[reading.ch];
      delete out[reading.ch];
    }
  }
  return out;
}

/**
 * 旧数据没有 startedAt（2026-09-14 加的），补成"最后一次练习时间"：
 * 宁可把已经练了很久的档也算成刚开始（进度只会更慢，不会更超前）。
 */
function migrateStartedAt(
  stats: Record<string, CharStat> | undefined
): Record<string, CharStat> {
  const out: Record<string, CharStat> = {};
  for (const [key, stat] of Object.entries(stats ?? {})) {
    out[key] = { ...stat, startedAt: stat.startedAt ?? stat.seenAt ?? Date.now() };
  }
  return out;
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<AppState> & {
      sessions?: Array<Partial<SessionSummary>>;
    };
    if (!parsed || parsed.v !== 1 || typeof parsed.chars !== "object") return emptyState();
    return {
      v: 1,
      chars: migrateStartedAt(migrateReadingStats(parsed.chars ?? {})),
      math: migrateStartedAt(parsed.math),
      rewards: {
        stars: parsed.rewards?.stars ?? 0,
        stickers: parsed.rewards?.stickers ?? [],
        perfect: parsed.rewards?.perfect ?? 0,
      },
      sessions: Array.isArray(parsed.sessions)
        ? parsed.sessions.map((s) => ({
            at: s.at ?? 0,
            domain: (s.domain === "math" ? "math" : "literacy") as Domain,
            total: s.total ?? 0,
            correct: s.correct ?? 0,
            missed: s.missed ?? [],
          }))
        : [],
    };
  } catch {
    return emptyState();
  }
}

export function persist(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储满/隐私模式等场景下静默失败，不阻断答题
  }
}

export function recordAnswer(
  state: AppState,
  ch: string,
  ok: boolean,
  decoy?: string
): void {
  const now = Date.now();
  const stat = state.chars[ch] ?? {
    right: 0,
    wrong: 0,
    streak: 0,
    seenAt: now,
    startedAt: now,
    lastOk: false,
    confusion: {},
  };
  stat.seenAt = now;
  stat.startedAt = stat.startedAt ?? now;
  stat.lastOk = ok;
  if (ok) {
    stat.right += 1;
    stat.streak += 1;
  } else {
    stat.wrong += 1;
    stat.streak = 0;
    if (decoy) stat.confusion[decoy] = (stat.confusion[decoy] ?? 0) + 1;
  }
  state.chars[ch] = stat;
}

export function recordMathAnswer(state: AppState, level: string, ok: boolean): void {
  const now = Date.now();
  const stat = state.math[level] ?? {
    right: 0,
    wrong: 0,
    streak: 0,
    seenAt: now,
    startedAt: now,
    lastOk: false,
    confusion: {},
  };
  stat.seenAt = now;
  stat.startedAt = stat.startedAt ?? now;
  stat.lastOk = ok;
  if (ok) {
    stat.right += 1;
    stat.streak += 1;
  } else {
    stat.wrong += 1;
    stat.streak = 0;
  }
  state.math[level] = stat;
}

export function addSession(state: AppState, summary: SessionSummary): void {
  state.sessions.unshift(summary);
  state.sessions = state.sessions.slice(0, 200);
}

/**
 * 家长手动标记用：已掌握 = 直接给到"练稳"的状态（4 天后再复习一次）；
 * 没掌握 = 记为刚错，立即进入"建议今天复习"并优先出现在下一轮。
 *
 * `net` 是该业务域的"练稳"标准（识字 3、数学 300，见 src/lib/pace.ts），
 * 标 ✓ 时必须一次给够，否则会出现"标了已掌握，进度却还是没到"的矛盾状态。
 * `startedAt` 配合数学的"一档至少练满 N 天"时间闸门（见 setMathMastery）。
 */
function masteryStat(
  prev: CharStat | undefined,
  mastered: boolean,
  net: number,
  startedAt: number
): CharStat {
  const now = Date.now();
  if (mastered) {
    return {
      right: net,
      wrong: 0,
      streak: 3,
      seenAt: now,
      startedAt,
      lastOk: true,
      confusion: {},
    };
  }
  return {
    right: 0,
    wrong: 1,
    streak: 0,
    seenAt: now,
    startedAt,
    lastOk: false,
    confusion: prev?.confusion ?? {},
  };
}

export function setCharMastery(state: AppState, key: string, mastered: boolean): void {
  state.chars[key] = masteryStat(
    state.chars[key],
    mastered,
    PACE.literacy.net,
    Date.now()
  );
}

export function setMathMastery(state: AppState, level: string, mastered: boolean): void {
  const now = Date.now();
  // 标 ✓ = 家长认定这一档已经会了：把"开始练习时间"往前推 minDays，
  // 免得家长的手动判断被"一档至少练满 7 天"的闸门卡住（⤺ 回退会把时间清回今天）。
  const startedAt = mastered ? now - PACE.math.minDays * DAY_MS : now;
  state.math[level] = masteryStat(state.math[level], mastered, PACE.math.net, startedAt);
}

/**
 * 家长手动回退：把指定统计键（字 / 多音字读音条目）清回"没练过"。
 * 清空后这个字/读音不再算已掌握，也不再进入"建议复习"，按自动进阶重新排。
 */
export function resetCharStats(state: AppState, keys: string[]): void {
  for (const key of keys) delete state.chars[key];
}

/**
 * 家长手动回退：把指定难度档清回"没练过"。
 * 进度超前的场景传"该在的那一档 + 它后面所有档"，
 * 清掉之后：该档从头练，后面的档要靠这一档练稳才会重新混入。
 */
export function resetMathStats(state: AppState, levels: string[]): void {
  for (const level of levels) delete state.math[level];
}

// 简单的抗遗忘间隔：刚错过的字立即到期；答对后按连续正确次数拉长间隔
export function dueMs(stat: CharStat | undefined): number {
  if (!stat || !stat.seenAt) return 0;
  if (!stat.lastOk) return 0;
  const day = 24 * 60 * 60 * 1000;
  const intervals = [day, day, 2 * day, 4 * day, 7 * day, 14 * day];
  const idx = Math.min(stat.streak, intervals.length - 1);
  return stat.seenAt + intervals[idx] - Date.now();
}

export function exportState(state: AppState): void {
  const blob = new Blob([JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `识字岛-学习数据-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importState(file: File): Promise<AppState> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Partial<AppState> & {
    sessions?: Array<Partial<SessionSummary>>;
  };
  if (!parsed || parsed.v !== 1 || typeof parsed.chars !== "object") {
    throw new Error("文件格式不对：不是识字岛导出的 v1 数据");
  }
  return {
    v: 1,
    chars: migrateStartedAt(migrateReadingStats(parsed.chars ?? {})),
    math: migrateStartedAt(parsed.math),
    rewards: {
      stars: parsed.rewards?.stars ?? 0,
      stickers: parsed.rewards?.stickers ?? [],
      perfect: parsed.rewards?.perfect ?? 0,
    },
    sessions: Array.isArray(parsed.sessions)
      ? parsed.sessions.map((s) => ({
          at: s.at ?? 0,
          domain: (s.domain === "math" ? "math" : "literacy") as Domain,
          total: s.total ?? 0,
          correct: s.correct ?? 0,
          missed: s.missed ?? [],
        }))
      : [],
  };
}
