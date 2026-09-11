import { CURATED, type CuratedChar } from "../data/curated";
import { PINYIN, sameSound } from "../data/pinyin";
import { firstGroupIndexOf, groupIndexById } from "../data/wordbank";

/**
 * 干扰字的优先级档位（数字越小越优先）：
 * 0 同单元（同期）· 1 已学过的单元 · 2 更晚、还没学到的单元 · 3 只当过干扰字的字（字库里没有）
 *
 * 一个字可能同时出现在《四五快读》和课本的字表里（例如 大/小/人），
 * 一律按它**最早出现**的那一档算，避免同一本书里的字被当成"以后才学"。
 */
type Tier = 0 | 1 | 2 | 3;

function groupIndexFor(entry: CuratedChar): number {
  const i = firstGroupIndexOf(entry.ch);
  return i >= 0 ? i : groupIndexById(entry.pack);
}

function tierOf(groupIdx: number, ch: string): Tier {
  const other = firstGroupIndexOf(ch);
  if (other < 0) return 3;
  if (other === groupIdx) return 0;
  return other < groupIdx ? 1 : 2;
}

function shuffle<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface DecoyPickOptions {
  /** 题目实际朗读的读音（多音字用读音条目的拼音，如 乐·音乐 → yuè）；缺省用字条目的默认读音 */
  py?: string;
  /** 是否排除"听起来一样"的干扰字。听音类玩法必须保持默认 true */
  avoidSameSound?: boolean;
}

/** 没有读音记录的字，在听音题里一律不放（无法判断是否同音 = 不安全） */
function soundsClash(ch: string, py: string): boolean {
  const decoyPy = PINYIN[ch];
  return !decoyPy || sameSound(decoyPy, py);
}

/**
 * 按"同期优先"分层：同一层内部仍然随机。
 * 手工写的干扰项都是形近字（这是本项目的核心设计），所以只在层内做取舍，
 * 不会为了"同期"而换上形状不相干的字。
 */
function byTier(entry: CuratedChar, chars: string[]): string[][] {
  const tiers: string[][] = [[], [], [], []];
  const groupIdx = groupIndexFor(entry);
  for (const ch of chars) {
    if (ch === entry.ch) continue;
    tiers[tierOf(groupIdx, ch)].push(ch);
  }
  return tiers.map((list) => shuffle(list));
}

/** 补位池：课程内的字（同单元 → 已学 → 未学）+ 只当过干扰字的字 */
function fallbackTiers(entry: CuratedChar): string[][] {
  const inCourse: string[] = [];
  for (const e of CURATED) {
    if (e.ch === entry.ch) continue;
    inCourse.push(e.ch);
  }
  const tiers = byTier(entry, inCourse);
  const inCourseSet = new Set(inCourse);
  const outsiders: string[] = [];
  for (const e of CURATED) {
    for (const d of e.decoys) {
      if (d !== entry.ch && !inCourseSet.has(d) && !outsiders.includes(d)) outsiders.push(d);
    }
  }
  tiers[3].push(...shuffle(outsiders));
  return tiers;
}

/**
 * 取干扰字：先用手工写的形近干扰，不够时从"同期/已学过的字"里补。
 *
 * 听音类玩法（听音选字 / 迷雾寻字 / 连句喂食）必须保持 avoidSameSound：
 * 否则选项里会同时出现两个"读起来一样"的字，孩子选哪个都像是对的。
 * 纯视觉玩法（找茬）可以直接用 entry.decoys，不受这条限制。
 */
export function pickDecoysFor(
  entry: CuratedChar,
  count: number,
  options: DecoyPickOptions = {}
): string[] {
  const py = options.py ?? entry.py;
  const avoidSameSound = options.avoidSameSound !== false;
  const usable = (ch: string) =>
    ch !== entry.ch && !(avoidSameSound && soundsClash(ch, py));

  const picked: string[] = [];
  const take = (list: string[]) => {
    for (const ch of list) {
      if (picked.length >= count) return;
      if (!picked.includes(ch) && usable(ch)) picked.push(ch);
    }
  };

  // 手工干扰项：形近字内部按"同单元 → 已学 → 未学 → 课外"排优先级
  for (const tier of byTier(entry, entry.decoys)) take(tier);
  for (const tier of fallbackTiers(entry)) {
    if (picked.length >= count) break;
    take(tier);
  }
  return picked;
}
