// 数学出题校验：每一档跑 500 轮，确认
//   1) 填空题只有一个空，把答案填进去以后算式真的是对的
//   2) 比大小题两边不相等、bigger 指向真的大的那一边、label 能算回 value
//   3) 两大类（填空 / 比大小）每档都会出现，顺便打印实际配比
//   4) 数字量级没有跑出这一档的范围（L1 ≤ 10、L6 才有两位数…）
//
// 需要先打包再跑（源码用的是无扩展名的相对导入，Node 直接跑不了）：
//   npm run verify:math
import {
  MATH_LEVELS,
  cnNum,
  fillAnswer,
  genMathQuestion,
  speakFilled,
  type MathQuestion,
} from "../src/lib/mathgen";

const ROUNDS = 500;
const problems: string[] = [];
const formCount = new Map<string, number>();
const kindCount = new Map<string, number>();

/** 一道题里出现过的所有数字（含结果、比大小的两边） */
function numbersIn(q: MathQuestion): number[] {
  const nums = [...q.text.matchAll(/\d+/g)].map((m) => Number(m[0]));
  if (q.form === "compare") nums.push(q.left.value, q.right.value);
  else nums.push(q.a, q.b, q.answer);
  return nums;
}

/** 每档的数字上限（孩子看到的数不该超过它） */
const LEVEL_MAX: Record<string, number> = {
  L1: 10,
  L2: 18,
  L3: 10,
  L4: 18,
  L5: 18,
  L6: 99,
};

for (const def of MATH_LEVELS) {
  for (let i = 0; i < ROUNDS; i++) {
    const q = genMathQuestion(def.id);
    const formKey = `${q.level} ${q.form === "fill" ? "填空" : "比大小"}`;
    formCount.set(formKey, (formCount.get(formKey) ?? 0) + 1);
    const kindKey = `${q.level} ${q.kind}`;
    kindCount.set(kindKey, (kindCount.get(kindKey) ?? 0) + 1);

    if (q.form === "fill") {
      const holes = (q.text.match(/\?/g) ?? []).length;
      if (holes !== 1) problems.push(`${def.id} 填空题空位数 ${holes}：${q.text}`);
      const filled = q.text.replace("?", String(q.answer));
      const m = filled.match(/^(\d+)\s*([+-])\s*(\d+)\s*=\s*(\d+)$/);
      if (!m) {
        problems.push(`${def.id} 填空题式子看不懂：${filled}`);
      } else {
        const x = Number(m[1]);
        const y = Number(m[3]);
        const z = Number(m[4]);
        const ok = m[2] === "+" ? x + y === z : x - y === z;
        if (!ok) problems.push(`${def.id} 填空算式不成立：${filled}`);
        if (z < 0) problems.push(`${def.id} 填空出现负数：${filled}`);
      }
    } else {
      if (q.left.value === q.right.value) {
        problems.push(`${def.id} 比大小两边相等：${q.text}`);
      }
      const big = q.bigger === "left" ? q.left : q.right;
      const small = q.bigger === "left" ? q.right : q.left;
      if (big.value <= small.value) {
        problems.push(`${def.id} bigger 指错了：${q.text}`);
      }
      if (!q.text.includes("谁大")) problems.push(`${def.id} 比大小题没有"谁大"：${q.text}`);
      for (const side of [q.left, q.right]) {
        const m = side.label.match(/^(\d+)\s*([+-])\s*(\d+)$/);
        const value = m
          ? m[2] === "+"
            ? Number(m[1]) + Number(m[3])
            : Number(m[1]) - Number(m[3])
          : Number(side.label);
        if (value !== side.value) {
          problems.push(`${def.id} 比大小 label 与 value 不符：${side.label} ≠ ${side.value}`);
        }
      }
      const tail = q.speakTokens.slice(-2).join(",");
      if (tail !== "who,big") {
        problems.push(`${def.id} 比大小朗读片段结尾不对：${q.speakTokens.join(",")}`);
      }
    }

    const max = LEVEL_MAX[q.level];
    for (const n of numbersIn(q)) {
      if (!Number.isFinite(n) || n < 0 || n > max) {
        problems.push(`${def.id} 数字超出范围（>${max}）：${q.text}`);
        break;
      }
    }

    // 错题列表 / 完整朗读也要说得通
    const missed = fillAnswer(q);
    if (q.form === "compare") {
      const big = q.bigger === "left" ? q.left : q.right;
      const small = q.bigger === "left" ? q.right : q.left;
      if (missed !== `${big.label} > ${small.label}`) {
        problems.push(`${def.id} 比大小错题文案不对：${missed}`);
      }
    } else if ((missed.match(/\?/g) ?? []).length > 0) {
      problems.push(`${def.id} 填空题错题文案还留着空：${missed}`);
    }
    const spoken = speakFilled(q);
    if (q.form === "fill" && !spoken.includes(cnNum(q.answer))) {
      problems.push(`${def.id} 完整朗读没读出答案：${spoken}`);
    }
    if (q.form === "compare" && !spoken.includes("大")) {
      problems.push(`${def.id} 比大小朗读没说出哪边大：${spoken}`);
    }
  }
}

// L6 是两位数档：至少得真出现两位数，否则白叫"两位数"
const l6 = Array.from({ length: 200 }, () => genMathQuestion("L6"));
if (!l6.some((q) => numbersIn(q).some((n) => n >= 10))) {
  problems.push("L6 里一次两位数都没出现");
}

console.log("每档题型配比（填空 / 比大小，以及具体问法）：");
for (const def of MATH_LEVELS) {
  const fill = formCount.get(`${def.id} 填空`) ?? 0;
  const compare = formCount.get(`${def.id} 比大小`) ?? 0;
  const total = fill + compare;
  const detail = [...kindCount.entries()]
    .filter(([k]) => k.startsWith(`${def.id} `))
    .sort()
    .map(([k, v]) => `${k.split(" ")[1]} ${Math.round((v / total) * 100)}%`)
    .join(" · ");
  console.log(
    `  ${def.id} ${def.label}：填空 ${Math.round((fill / total) * 100)}% / ` +
      `比大小 ${Math.round((compare / total) * 100)}% —— ${detail}`
  );
}

if (problems.length > 0) {
  console.error(`\n✗ 发现 ${problems.length} 个问题：`);
  for (const p of problems.slice(0, 20)) console.error(`  - ${p}`);
  process.exit(1);
}
console.log("\n✓ 数学出题校验通过（填空算式成立、比大小不相等且大小对、数字在档位范围内）");
