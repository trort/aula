import swkdFirst from "../../wordbank/swkd-first.json";
import grade1 from "../../wordbank/grade1-shang-recognition.json";

export interface WordBankGroup {
  id: string;
  title: string;
  chars: string;
}

/**
 * 课程顺序 = 数组顺序：先《四五快读》（现在主要用的书），再一年级上册课本，最后是家长补充。
 * 一个字可以同时属于多本书的表（例如"大"既在四五快读第一册、又在课文里），
 * 出题时按"最早出现的那一档"算它的学习进度优先级（见 src/lib/decoys.ts）。
 */
export const WORD_BANK_GROUPS: WordBankGroup[] = [
  ...(swkdFirst as { groups: WordBankGroup[] }).groups,
  ...(grade1 as { groups: WordBankGroup[] }).groups,
];

const firstIndexOf = (() => {
  const map = new Map<string, number>();
  WORD_BANK_GROUPS.forEach((g, i) => {
    for (const ch of g.chars) if (!map.has(ch)) map.set(ch, i);
  });
  return map;
})();

/** 该字在课程里最早出现在第几档（用于干扰项"同期/已学优先"）；不在任何字表里返回 -1 */
export function firstGroupIndexOf(ch: string): number {
  return firstIndexOf.get(ch) ?? -1;
}

const groupIndexByIdMap = new Map(WORD_BANK_GROUPS.map((g, i) => [g.id, i]));

/** 字表分组 id → 顺序号；未知 id 视为排在最后 */
export function groupIndexById(id: string): number {
  const i = groupIndexByIdMap.get(id);
  return i === undefined ? WORD_BANK_GROUPS.length : i;
}

export function groupChars(group: WordBankGroup): string[] {
  return [...new Set([...group.chars])];
}
