// 数学出题校验：每一档、每一种题型各跑 500 轮，确认
//   填空（fill）
//     1) 只有一个空，把答案填进去以后算式真的是对的，不出现负数
//     2) 普通填空和"换个位置挖空"都会出现
//   选择题（compare，比大小）
//     3) relation（小于/等于/大于）和两边的值对得上，三种答案都会出现（含"一样大"）
//     4) label 能算回 value（"3 + 4" → 7），朗读片段结尾是"…谁大"
//   另外：一局只出一种题型，数字不超出该档范围，L6 真的会出现两位数
//
// 需要先打包再跑（源码用的是无扩展名的相对导入，Node 直接跑不了）：
//   npm run verify:math
import {
  MATH_LEVELS,
  buildMathQuestions,
  cnNum,
  fillAnswer,
  genMathQuestion,
  relationLabel,
  speakFilled,
  type MathQuestion,
  type MathRelation,
  type MathType,
} from "../src/lib/mathgen";

const ROUNDS = 500;
const problems: string[] = [];
const kindCount = new Map<string, number>();
const relationCount = new Map<string, number>();
const blankCount = new Map<string, number>();

/** 一道题里出现过的所有数字（含结果、比大小的两边） */
function numbersIn(q: MathQuestion): number[] {
  const nums = [...q.text.matchAll(/\d+/g)].map((m) => Number(m[0]));
  if (q.form === "compare") nums.push(q.left.value, q.right.value);
  else nums.push(q.a, q.b, q.answer);
  return nums;
}

const trueRelation = (left: number, right: number): MathRelation =>
  left === right ? "eq" : left < right ? "lt" : "gt";

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
  for (const type of ["fill", "compare"] as MathType[]) {
    for (let i = 0; i < ROUNDS; i++) {
      const q = genMathQuestion(def.id, type);
      if (q.form !== type) {
        problems.push(`${def.id} 选了 ${type} 却出了 ${q.form}`);
        continue;
      }
      kindCount.set(
        `${def.id} ${q.kind}`,
        (kindCount.get(`${def.id} ${q.kind}`) ?? 0) + 1
      );

      if (q.form === "fill") {
        const holes = (q.text.match(/\?/g) ?? []).length;
        if (holes !== 1) problems.push(`${def.id} 填空题空位数 ${holes}：${q.text}`);
        if (q.kind === "missingAdd" || q.kind === "missingSub") {
          const where = q.text.startsWith("?") ? "first" : "last";
          blankCount.set(
            `${def.id} ${q.kind} ${where}`,
            (blankCount.get(`${def.id} ${q.kind} ${where}`) ?? 0) + 1
          );
        }
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
        if (q.relation !== trueRelation(q.left.value, q.right.value)) {
          problems.push(
            `${def.id} 比大小答案错了：${q.left.label} ? ${q.right.label} → ${q.relation}`
          );
        }
        relationCount.set(
          `${def.id} ${q.relation}`,
          (relationCount.get(`${def.id} ${q.relation}`) ?? 0) + 1
        );
        for (const side of [q.left, q.right]) {
          const m = side.label.match(/^(\d+)\s*([+-])\s*(\d+)$/);
          const value = m
            ? m[2] === "+"
              ? Number(m[1]) + Number(m[3])
              : Number(m[1]) - Number(m[3])
            : Number(side.label);
          if (value !== side.value) {
            problems.push(`${def.id} label 与 value 不符：${side.label} ≠ ${side.value}`);
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
      const answerWord = q.form === "compare" ? relationLabel(q.relation) : "";
      if (q.form === "compare") {
        if (!missed.includes(answerWord)) {
          problems.push(`${def.id} 比大小错题文案没写清大小关系：${missed}`);
        }
      } else if ((missed.match(/\?/g) ?? []).length > 0) {
        problems.push(`${def.id} 填空题错题文案还留着空：${missed}`);
      }
      const spoken = speakFilled(q);
      if (q.form === "fill" && !spoken.includes(cnNum(q.answer))) {
        problems.push(`${def.id} 完整朗读没读出答案：${spoken}`);
      }
      if (q.form === "compare" && !spoken.includes(answerWord)) {
        problems.push(`${def.id} 比大小朗读没说出答案：${spoken}`);
      }
    }
  }
}

// 每档三种比大小答案都要出现过（否则"等于"永远不是正确答案）
for (const def of MATH_LEVELS) {
  for (const rel of ["lt", "eq", "gt"] as MathRelation[]) {
    if ((relationCount.get(`${def.id} ${rel}`) ?? 0) === 0) {
      problems.push(`${def.id} 比大小从没出现过「${relationLabel(rel)}」`);
    }
  }
}

// 挖空题两个位置都要出现：空在减数/加数前面（几加4等于7）和在后面（3加几等于7）
for (const def of MATH_LEVELS) {
  for (const kind of ["missingAdd", "missingSub"] as const) {
    const total = (kindCount.get(`${def.id} ${kind}`) ?? 0);
    if (total === 0) continue;
    for (const where of ["first", "last"]) {
      if ((blankCount.get(`${def.id} ${kind} ${where}`) ?? 0) === 0) {
        problems.push(`${def.id} 的 ${kind} 从没出现过"空在${where === "first" ? "前" : "后"}"的问法`);
      }
    }
  }
}

// 一局只出一种题型：buildMathQuestions 出来的必须全是选中的那一类
for (const type of ["fill", "compare"] as MathType[]) {
  const qs = buildMathQuestions(["L1"], 15, type);
  if (qs.some((q) => q.form !== type)) {
    problems.push(`buildMathQuestions("${type}") 混进了别的题型`);
  }
}

// L6 是两位数档：至少得真出现两位数，否则白叫"两位数"
const l6 = Array.from({ length: 200 }, () => genMathQuestion("L6", "fill"));
if (!l6.some((q) => numbersIn(q).some((n) => n >= 10))) {
  problems.push("L6 里一次两位数都没出现");
}

const label = (rel: MathRelation) => relationLabel(rel);
console.log("每档问法配比（每种题型各 500 轮）：");
for (const def of MATH_LEVELS) {
  const parts = [...kindCount.entries()]
    .filter(([k]) => k.startsWith(`${def.id} `))
    .sort()
    .map(([k, v]) => `${k.split(" ")[1]} ${Math.round((v / ROUNDS) * 100)}%`)
    .join(" · ");
  const relations = (["lt", "eq", "gt"] as MathRelation[])
    .map(
      (r) =>
        `${label(r)} ${Math.round(((relationCount.get(`${def.id} ${r}`) ?? 0) / ROUNDS) * 100)}%`
    )
    .join(" · ");
  console.log(`  ${def.id} ${def.label}：${parts}`);
  console.log(`    选择题答案分布：${relations}`);
}

if (problems.length > 0) {
  console.error(`\n✗ 发现 ${problems.length} 个问题：`);
  for (const p of problems.slice(0, 20)) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(
  "\n✓ 数学出题校验通过（填空题算式成立、选择题大小关系正确、三种答案都有、题型不混、数字在档位范围内）"
);
