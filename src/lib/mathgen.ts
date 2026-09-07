// 数学域：纯规则约束生成器（无静态题库）
// 难度梯度按设计文档 L1–L6，扩展乘法/除法时只需追加策略。

export type MathLevel = "L1" | "L2" | "L3" | "L4" | "L5" | "L6";

export interface MathLevelDef {
  id: MathLevel;
  label: string;
  desc: string;
}

export const MATH_LEVELS: MathLevelDef[] = [
  { id: "L1", label: "加法入门", desc: "和 ≤ 10" },
  { id: "L2", label: "进位加法", desc: "和 11–18（凑十）" },
  { id: "L3", label: "减法入门", desc: "个位 - 个位" },
  { id: "L4", label: "退位减法", desc: "破十（如 13-5）" },
  { id: "L5", label: "小侦探", desc: "挖空求未知数" },
  { id: "L6", label: "两位数", desc: "两位数加减" },
];

export type MathKind =
  | "add"
  | "sub"
  | "missingAdd"
  | "missingSub"
  | "addBig"
  | "subBig";

export type MathSpeechToken = number | "add" | "sub" | "eq" | "ask";

export interface MathQuestion {
  level: MathLevel;
  kind: MathKind;
  a: number;
  b: number;
  answer: number;
  text: string; // 展示用，如 "3 + 2 = ?"
  speakText: string; // TTS 用中文，如 "三加二等于几"
  speakTokens: MathSpeechToken[]; // 晓晓本地片段顺序
}

function buildSpeakTokens(
  kind: MathKind,
  a: number,
  b: number,
  answer: number
): MathSpeechToken[] {
  switch (kind) {
    case "add":
    case "addBig":
      return [a, "add", b, "eq", "ask"];
    case "sub":
    case "subBig":
      return [a, "sub", b, "eq", "ask"];
    case "missingAdd":
      return ["ask", "add", b, "eq", answer + b];
    case "missingSub":
      return [a, "sub", "ask", "eq", a - answer];
  }
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

function makeQuestion(
  level: MathLevel,
  kind: MathKind,
  a: number,
  b: number,
  answer: number,
  text: string,
  speakText: string
): MathQuestion {
  return {
    level,
    kind,
    a,
    b,
    answer,
    text,
    speakText,
    speakTokens: buildSpeakTokens(kind, a, b, answer),
  };
}

export function genMathQuestion(level: MathLevel): MathQuestion {
  switch (level) {
    case "L1": {
      const a = randInt(1, 9);
      const b = randInt(1, 10 - a);
      const answer = a + b;
      return makeQuestion(
        level,
        "add",
        a,
        b,
        answer,
        `${a} + ${b} = ?`,
        `${cnNum(a)}加${cnNum(b)}等于几`
      );
    }
    case "L2": {
      const a = randInt(2, 9);
      const b = randInt(11 - a, 9);
      const answer = a + b;
      return makeQuestion(
        level,
        "add",
        a,
        b,
        answer,
        `${a} + ${b} = ?`,
        `${cnNum(a)}加${cnNum(b)}等于几`
      );
    }
    case "L3": {
      const a = randInt(2, 9);
      const b = randInt(1, a - 1);
      const answer = a - b;
      return makeQuestion(
        level,
        "sub",
        a,
        b,
        answer,
        `${a} - ${b} = ?`,
        `${cnNum(a)}减${cnNum(b)}等于几`
      );
    }
    case "L4": {
      const a = randInt(10, 18);
      const unit = a % 10;
      const b = unit === 0 ? randInt(1, 9) : randInt(unit + 1, 9);
      const answer = a - b;
      return makeQuestion(
        level,
        "sub",
        a,
        b,
        answer,
        `${a} - ${b} = ?`,
        `${cnNum(a)}减${cnNum(b)}等于几`
      );
    }
    case "L5": {
      if (Math.random() < 0.5) {
        const c = randInt(3, 10);
        const b = randInt(1, c - 2);
        const answer = c - b;
        return makeQuestion(
          level,
          "missingAdd",
          answer,
          b,
          answer,
          `? + ${b} = ${c}`,
          `几加${cnNum(b)}等于${cnNum(c)}`
        );
      }
      const a = randInt(3, 10);
      const c = randInt(1, a - 1);
      const answer = a - c;
      return makeQuestion(
        level,
        "missingSub",
        a,
        answer,
        answer,
        `${a} - ? = ${c}`,
        `${cnNum(a)}减几等于${cnNum(c)}`
      );
    }
    case "L6": {
      if (Math.random() < 0.5) {
        const tens = randInt(1, 8);
        const unit = randInt(0, 8);
        const a = tens * 10 + unit;
        const b = randInt(1, 9 - unit);
        const answer = a + b;
        return makeQuestion(
          level,
          "addBig",
          a,
          b,
          answer,
          `${a} + ${b} = ?`,
          `${cnNum(a)}加${cnNum(b)}等于几`
        );
      }
      const tens = randInt(1, 9);
      const unit = randInt(tens === 1 ? 1 : 0, 9);
      const a = tens * 10 + unit;
      const b = randInt(1, unit);
      const answer = a - b;
      return makeQuestion(
        level,
        "subBig",
        a,
        b,
        answer,
        `${a} - ${b} = ?`,
        `${cnNum(a)}减${cnNum(b)}等于几`
      );
    }
  }
}

export function fillAnswer(q: MathQuestion): string {
  return q.text.replace("?", String(q.answer));
}

export function speakFilled(q: MathQuestion): string {
  if (q.kind === "missingAdd") return `几加${cnNum(q.b)}等于${cnNum(q.answer + q.b)}，答案是${cnNum(q.answer)}`;
  if (q.kind === "missingSub") return `${cnNum(q.a)}减几等于${cnNum(q.a - q.answer)}，答案是${cnNum(q.answer)}`;
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
