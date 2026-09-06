import type { Domain } from "./types";

const STORAGE_KEY = "kids-learning-companion-v1";

export interface CharStat {
  right: number;
  wrong: number;
  streak: number;
  seenAt: number;
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
  sessions: SessionSummary[];
}

export const emptyState = (): AppState => ({
  v: 1,
  chars: {},
  math: {},
  sessions: [],
});

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
      chars: parsed.chars ?? {},
      math: parsed.math ?? {},
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
  const stat = state.chars[ch] ?? {
    right: 0,
    wrong: 0,
    streak: 0,
    seenAt: 0,
    lastOk: false,
    confusion: {},
  };
  stat.seenAt = Date.now();
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
  const stat = state.math[level] ?? {
    right: 0,
    wrong: 0,
    streak: 0,
    seenAt: 0,
    lastOk: false,
    confusion: {},
  };
  stat.seenAt = Date.now();
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
    chars: parsed.chars ?? {},
    math: parsed.math ?? {},
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
