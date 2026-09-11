import type { CuratedChar } from "../data/curated";
import { pickDecoysFor } from "./decoys";
import type { Question } from "./types";

function shuffle<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 生成一轮题目：
 * - 到期/刚错过的字优先（各自内部随机）；
 * - 其余字随机补足；
 * - 字与字之间的顺序每次随机，相邻题不重复同一个字；
 * - 每题干扰项与选项位置也随机；
 * - 干扰项不与目标字同音（听音题里同音字会变成"两个都像对的"）。
 */
export function buildQuestions(
  entries: CuratedChar[],
  size: number,
  priority: Set<string>
): Question[] {
  const pool = entries.filter((e) => e.decoys.length >= 2);
  if (pool.length === 0) return [];

  const preferred = [
    ...shuffle(pool.filter((e) => priority.has(e.ch))),
    ...shuffle(pool.filter((e) => !priority.has(e.ch))),
  ];

  const order: CuratedChar[] = [];
  let cursor = 0;
  let guard = 0;
  while (order.length < size && guard < size * pool.length * 3 + 500) {
    guard += 1;
    const candidate = preferred[cursor % preferred.length];
    cursor += 1;
    if (order.length > 0 && order[order.length - 1] === candidate) continue;
    order.push(candidate);
    // 一整轮用完后重新洗牌，避免循环顺序可预测
    if (cursor % preferred.length === 0) {
      preferred.splice(0, preferred.length, ...shuffle(preferred));
    }
  }

  const questions: Question[] = [];
  let prevTargetPos = -1;
  for (const source of order.slice(0, size)) {
    const decoys = pickDecoysFor(source, 2);
    const optionChars = shuffle([source.ch, ...decoys]);
    let targetPos = optionChars.indexOf(source.ch);
    if (targetPos === prevTargetPos && pool.length > 2) {
      const swapped = shuffle(optionChars);
      if (swapped.indexOf(source.ch) !== prevTargetPos) {
        optionChars.splice(0, optionChars.length, ...swapped);
        targetPos = optionChars.indexOf(source.ch);
      }
    }
    questions.push({
      target: source.ch,
      decoys,
      options: optionChars.map((ch) => ({ ch, isTarget: ch === source.ch })),
    });
    prevTargetPos = targetPos;
  }
  return questions;
}
