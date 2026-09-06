import type { CuratedChar } from "../data/curated";
import type { Question } from "./types";

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

export function buildQuestions(
  entries: CuratedChar[],
  size: number,
  priority: Set<string>
): Question[] {
  const pool = entries.filter((e) => e.decoys.length >= 2);
  const sorted = [
    ...pool.filter((e) => priority.has(e.ch)),
    ...pool.filter((e) => !priority.has(e.ch)),
  ];
  const questions: Question[] = [];
  let prevTarget = "";
  let prevTargetPos = -1;

  // 需要时循环多轮，直到攒够题目；全部用完也允许重复（题量很小）
  let guard = 0;
  while (questions.length < size && guard < size * pool.length * 2 + 200) {
    guard += 1;
    const source = sorted.length > 0 ? sorted[questions.length % sorted.length] : pool[questions.length % pool.length];
    if (!source) break;
    if (source.ch === prevTarget && pool.length > 1) continue;

    const decoys = pickDecoys(source, 2);
    const optionChars = shuffle([source.ch, ...decoys]);
    let targetPos = optionChars.indexOf(source.ch);
    // 避免目标字连续两次落在同一位置（位置记忆）
    if (targetPos === prevTargetPos && pool.length > 2) {
      const swapped = shuffle(optionChars);
      const newPos = swapped.indexOf(source.ch);
      if (newPos !== prevTargetPos) {
        optionChars.splice(0, optionChars.length, ...swapped);
        targetPos = newPos;
      }
    }
    questions.push({
      target: source.ch,
      decoys,
      options: optionChars.map((ch) => ({ ch, isTarget: ch === source.ch })),
    });
    prevTarget = source.ch;
    prevTargetPos = targetPos;
  }
  return questions.slice(0, size);
}

