// 数学域：纯规则约束生成器（无静态题库）
//
// 每一档难度都有一张"题型配比表"（FORM_MIX）：填空为主，穿插
//   1) 换个位置挖空："3 + ? = 7" / "? + 4 = 7"（L5 整档都是这种）
//   2) 比大小：数字比大小（3 和 4 谁大）、算式比大小（3 + 4 和 2 + 5 谁大）
// 同一档里不会一直是同一种问法。以后加乘法/除法，照 FORM_MIX 追加策略即可。

import type { MathSpeechToken } from "./audio";

export type MathLevel = "L1" | "L2" | "L3" | "L4" | "L5" | "L6";

export interface MathLevelDef {
  id: MathLevel;
  label: string;
  desc: string;
}

export const MATH_LEVELS: MathLevelDef[] = [
  { id: "L1", label: "加法入门", desc: "和 ≤ 10，含挖空与比大小" },
  { id: "L2", label: "进位加法", desc: "和 11–18（凑十）" },
  { id: "L3", label: "减法入门", desc: "个位 - 个位" },
  { id: "L4", label: "退位减法", desc: "破十（如 13-5）" },
  { id: "L5", label: "小侦探", desc: "挖空求未知数" },
  { id: "L6", label: "两位数", desc: "两位数加减" },
];

/** 填空题：算式里挖一个空，孩子用数字键盘填 */
export type MathFillKind =
  | "add"
  | "sub"
  | "missingAdd"
  | "missingSub"
  | "addBig"
  | "subBig";

/** 比大小题：点一下大的那一边（数字或算式），不用键盘 */
export type MathCompareKind = "compareNum" | "compareExpr";

export type MathKind = MathFillKind | MathCompareKind;

export type MathSide = "left" | "right";

/** 比大小的一边：label 给孩子看（"3" 或 "3 + 4"），value 用来判对错 */
export interface MathOperand {
  label: string;
  value: number;
}

export interface FillQuestion {
  form: "fill";
  level: MathLevel;
  kind: MathFillKind;
  a: number;
  b: number;
  answer: number;
  text: string; // 展示用，如 "3 + ? = 7"
  speakText: string; // TTS 兜底用的中文，如 "三加几等于七"
  speakTokens: MathSpeechToken[]; // 晓晓本地片段顺序
}

export interface CompareQuestion {
  form: "compare";
  level: MathLevel;
  kind: MathCompareKind;
  left: MathOperand;
  right: MathOperand;
  bigger: MathSide;
  text: string; // 展示用，如 "3 + 4 和 2 + 5 谁大？"
  speakText: string;
  speakTokens: MathSpeechToken[];
}

export type MathQuestion = FillQuestion | CompareQuestion;

type NumPair = [number, number];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const CN_DIGITS = "零一二三四五六七八九";

export function cnNum(n: number): string {
  if (n < 0 || n > 99) return String(n);
  if (n < 10) return CN_DIGITS[n];
  if (n === 10) return "十";
  if (n < 20) return `十${CN_DIGITS[n % 10]}`;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones === 0 ? `${CN_DIGITS[tens]}十` : `${CN_DIGITS[tens]}十${CN_DIGITS[ones]}`;
}

// ---------- 操作数：每一档的取值范围 ----------

function addPair(level: MathLevel): NumPair {
  switch (level) {
    case "L1":
    case "L3":
    case "L4":
    case "L5": {
      const a = randInt(1, 9);
      return [a, randInt(1, 10 - a)]; // 和 ≤ 10
    }
    case "L2": {
      const a = randInt(2, 9);
      return [a, randInt(11 - a, 9)]; // 进位：和 11–18
    }
    case "L6": {
      const tens = randInt(1, 8);
      const unit = randInt(0, 8);
      return [tens * 10 + unit, randInt(1, 9 - unit)]; // 两位数 + 一位数（不进位）
    }
  }
}

function subPair(level: MathLevel): NumPair {
  switch (level) {
    case "L1":
    case "L2":
    case "L5": {
      const a = randInt(3, 10);
      return [a, randInt(1, a - 1)];
    }
    case "L3": {
      const a = randInt(2, 9);
      return [a, randInt(1, a - 1)];
    }
    case "L4": {
      const a = randInt(10, 18);
      const unit = a % 10;
      return [a, unit === 0 ? randInt(1, 9) : randInt(unit + 1, 9)]; // 退位
    }
    case "L6": {
      const tens = randInt(1, 9);
      const unit = randInt(tens === 1 ? 1 : 0, 9);
      return [tens * 10 + unit, unit === 0 ? 1 : randInt(1, unit)]; // 不退位
    }
  }
}

/** 比大小时"数"的量级跟着难度走 */
function numberRange(level: MathLevel): NumPair {
  switch (level) {
    case "L1":
    case "L3":
      return [1, 10];
    case "L2":
    case "L4":
    case "L5":
      return [1, 18];
    case "L6":
      return [11, 99];
  }
}

// ---------- 填空题 ----------

function simpleTokens(
  kind: "add" | "sub" | "addBig" | "subBig",
  a: number,
  b: number
): MathSpeechToken[] {
  return kind === "sub" || kind === "subBig"
    ? [a, "sub", b, "eq", "ask"]
    : [a, "add", b, "eq", "ask"];
}

function genAdd(level: MathLevel, kind: "add" | "addBig"): FillQuestion {
  const [a, b] = addPair(level);
  return {
    form: "fill",
    level,
    kind,
    a,
    b,
    answer: a + b,
    text: `${a} + ${b} = ?`,
    speakText: `${cnNum(a)}加${cnNum(b)}等于几`,
    speakTokens: simpleTokens(kind, a, b),
  };
}

function genSub(level: MathLevel, kind: "sub" | "subBig"): FillQuestion {
  const [a, b] = subPair(level);
  return {
    form: "fill",
    level,
    kind,
    a,
    b,
    answer: a - b,
    text: `${a} - ${b} = ?`,
    speakText: `${cnNum(a)}减${cnNum(b)}等于几`,
    speakTokens: simpleTokens(kind, a, b),
  };
}

/** 加法挖空：空位随机在左边（几加4等于7）或右边（3加几等于7） */
function genMissingAdd(level: MathLevel): FillQuestion {
  const [a, b] = addPair(level);
  const sum = a + b;
  const blankFirst = Math.random() < 0.5;
  return {
    form: "fill",
    level,
    kind: "missingAdd",
    a,
    b,
    answer: blankFirst ? a : b,
    text: blankFirst ? `? + ${b} = ${sum}` : `${a} + ? = ${sum}`,
    speakText: blankFirst
      ? `几加${cnNum(b)}等于${cnNum(sum)}`
      : `${cnNum(a)}加几等于${cnNum(sum)}`,
    speakTokens: blankFirst
      ? ["ask", "add", b, "eq", sum]
      : [a, "add", "ask", "eq", sum],
  };
}

/** 减法挖空：空位随机在减数（12 - ? = 5）或被减数（? - 7 = 5） */
function genMissingSub(level: MathLevel): FillQuestion {
  const [a, b] = subPair(level);
  const diff = a - b;
  const blankFirst = Math.random() < 0.5;
  return {
    form: "fill",
    level,
    kind: "missingSub",
    a,
    b,
    answer: blankFirst ? a : b,
    text: blankFirst ? `? - ${b} = ${diff}` : `${a} - ? = ${diff}`,
    speakText: blankFirst
      ? `几减${cnNum(b)}等于${cnNum(diff)}`
      : `${cnNum(a)}减几等于${cnNum(diff)}`,
    speakTokens: blankFirst
      ? ["ask", "sub", b, "eq", diff]
      : [a, "sub", "ask", "eq", diff],
  };
}

// ---------- 比大小 ----------

/** 把 "3 + 4" 这样的 label 拆成朗读片段；纯数字就直接读数字 */
function compareTokens(left: MathOperand, right: MathOperand): MathSpeechToken[] {
  const tokens: MathSpeechToken[] = [];
  const push = (side: MathOperand) => {
    const m = side.label.match(/^(\d+)\s*([+-])\s*(\d+)$/);
    if (!m) {
      tokens.push(Number(side.label));
      return;
    }
    tokens.push(Number(m[1]), m[2] === "+" ? "add" : "sub", Number(m[3]));
  };
  push(left);
  tokens.push("and");
  push(right);
  tokens.push("who", "big");
  return tokens;
}

function sayOperand(side: MathOperand): string {
  const m = side.label.match(/^(\d+)\s*([+-])\s*(\d+)$/);
  if (!m) return cnNum(Number(side.label));
  return `${cnNum(Number(m[1]))}${m[2] === "+" ? "加" : "减"}${cnNum(Number(m[3]))}`;
}

function makeCompare(
  level: MathLevel,
  kind: MathCompareKind,
  left: MathOperand,
  right: MathOperand
): CompareQuestion {
  return {
    form: "compare",
    level,
    kind,
    left,
    right,
    bigger: left.value > right.value ? "left" : "right",
    text: `${left.label} 和 ${right.label} 谁大？`,
    speakText: `${sayOperand(left)}和${sayOperand(right)}谁大`,
    speakTokens: compareTokens(left, right),
  };
}

function genCompareNum(level: MathLevel): CompareQuestion {
  const [lo, hi] = numberRange(level);
  const x = randInt(lo, hi);
  let y = randInt(lo, hi);
  let guard = 0;
  while (y === x && guard++ < 60) y = randInt(lo, hi);
  if (y === x) y = x === hi ? lo : x + 1; // 兜底：绝不出现"一样大"
  return makeCompare(
    level,
    "compareNum",
    { label: String(x), value: x },
    { label: String(y), value: y }
  );
}

/** 算式比大小：减法档比减法，其余比加法，两边结果保证不相等 */
function genCompareExpr(level: MathLevel): CompareQuestion {
  const minus = level === "L3" || level === "L4";
  const op = minus ? "-" : "+";
  const side = (): MathOperand => {
    const [x, y] = minus ? subPair(level) : addPair(level);
    return { label: `${x} ${op} ${y}`, value: minus ? x - y : x + y };
  };
  for (let i = 0; i < 200; i++) {
    const left = side();
    const right = side();
    if (left.value !== right.value) return makeCompare(level, "compareExpr", left, right);
  }
  return genCompareNum(level); // 理论上到不了这里
}

// ---------- 题型配比 + 入口 ----------
// 就两大类：
//   A. 填空（fill）  —— 算式挖一个空，孩子用数字键盘填；问法可以是
//                       普通填空（3 + 4 = ?）或挖空（? + 4 = 7 / 3 + ? = 7）
//   B. 比大小（compare）—— 点一下大的那一边；可以是数字（3 和 4）或算式（3 + 4 和 2 + 5）
// 下面每一档给出两大类的配比，再给每一类内部的问法权重。
interface LevelMix {
  fill: number;
  compare: number;
  fillMix: Array<[MathFillKind, number]>;
  compareMix: Array<[MathCompareKind, number]>;
}

const LEVEL_MIX: Record<MathLevel, LevelMix> = {
  L1: {
    fill: 7,
    compare: 3,
    fillMix: [["add", 4], ["missingAdd", 3]],
    compareMix: [["compareNum", 1]],
  },
  L2: {
    fill: 7,
    compare: 3,
    fillMix: [["add", 5], ["missingAdd", 3]],
    compareMix: [["compareExpr", 3], ["compareNum", 1]],
  },
  L3: {
    fill: 7,
    compare: 3,
    fillMix: [["sub", 5], ["missingSub", 3]],
    compareMix: [["compareExpr", 1]],
  },
  L4: {
    fill: 7,
    compare: 3,
    fillMix: [["sub", 5], ["missingSub", 3]],
    compareMix: [["compareExpr", 1]],
  },
  L5: {
    fill: 8,
    compare: 2,
    fillMix: [["missingAdd", 4], ["missingSub", 4]],
    compareMix: [["compareExpr", 1]],
  },
  L6: {
    fill: 7,
    compare: 3,
    fillMix: [["addBig", 3], ["subBig", 3], ["missingAdd", 1], ["missingSub", 1]],
    compareMix: [["compareExpr", 2], ["compareNum", 1]],
  },
};

function pickWeighted<T>(mix: Array<[T, number]>): T {
  const total = mix.reduce((sum, [, weight]) => sum + weight, 0);
  let r = Math.random() * total;
  for (const [item, weight] of mix) {
    r -= weight;
    if (r < 0) return item;
  }
  return mix[mix.length - 1][0];
}

/** 先按"填空 : 比大小"抽大类，再抽这类里的具体问法 */
function pickKind(level: MathLevel): MathKind {
  const mix = LEVEL_MIX[level];
  const category = pickWeighted<"fill" | "compare">([
    ["fill", mix.fill],
    ["compare", mix.compare],
  ]);
  return category === "fill"
    ? pickWeighted(mix.fillMix)
    : pickWeighted(mix.compareMix);
}

export function genMathQuestion(level: MathLevel): MathQuestion {
  switch (pickKind(level)) {
    case "add":
      return genAdd(level, "add");
    case "sub":
      return genSub(level, "sub");
    case "addBig":
      return genAdd(level, "addBig");
    case "subBig":
      return genSub(level, "subBig");
    case "missingAdd":
      return genMissingAdd(level);
    case "missingSub":
      return genMissingSub(level);
    case "compareNum":
      return genCompareNum(level);
    case "compareExpr":
      return genCompareExpr(level);
  }
}

/** 错题列表 / 正确答案展示用：填空题补上答案，比大小题写出大小关系 */
export function fillAnswer(q: MathQuestion): string {
  if (q.form === "compare") {
    const big = q.bigger === "left" ? q.left : q.right;
    const small = q.bigger === "left" ? q.right : q.left;
    return `${big.label} > ${small.label}`;
  }
  return q.text.replace("?", String(q.answer));
}

/** 连答案一起读出来（填空 / 比大小都能用） */
export function speakFilled(q: MathQuestion): string {
  if (q.form === "compare") {
    const big = q.bigger === "left" ? q.left : q.right;
    return `${q.speakText}，${sayOperand(big)}大`;
  }
  if (q.kind === "missingAdd") {
    const sum = q.a + q.b;
    return q.text.startsWith("?")
      ? `几加${cnNum(q.b)}等于${cnNum(sum)}，答案是${cnNum(q.answer)}`
      : `${cnNum(q.a)}加几等于${cnNum(sum)}，答案是${cnNum(q.answer)}`;
  }
  if (q.kind === "missingSub") {
    const diff = q.a - q.b;
    return q.text.startsWith("?")
      ? `几减${cnNum(q.b)}等于${cnNum(diff)}，答案是${cnNum(q.answer)}`
      : `${cnNum(q.a)}减几等于${cnNum(diff)}，答案是${cnNum(q.answer)}`;
  }
  return `${q.speakText.replace("等于几", "")}等于${cnNum(q.answer)}`;
}

export function buildMathQuestions(levels: MathLevel[], size: number): MathQuestion[] {
  const active = shuffle(levels);
  if (active.length === 0) return [];
  const qs: MathQuestion[] = [];
  let i = 0;
  let guard = 0;
  while (qs.length < size && guard < size * 8 + 200) {
    guard += 1;
    const level = active[i % active.length];
    const q = genMathQuestion(level);
    if (qs.length > 0 && qs[qs.length - 1].text === q.text) continue;
    qs.push(q);
    i += 1;
  }
  return qs.slice(0, size);
}
