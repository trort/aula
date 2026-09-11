// 出题结果校验：4 种玩法 × 每个字 × 120 轮，确认不会出现与目标同音的干扰项、
// 不会出现重复选项、每题只有一个正解。
//
// 需要先打包再跑（源码用的是无扩展名的相对导入，Node 直接跑不了）：
//   npm run verify:decoys
import { CURATED } from "../src/data/curated";
import { PINYIN, sameSound, syllableOf } from "../src/data/pinyin";
import { READINGS } from "../src/data/readings";
import { buildSessionTasks, type LiteracyMode } from "../src/lib/tasks";

const problems: string[] = [];
const modeSizes: Record<string, Set<number>> = {};

for (const mode of ["audio", "feed", "scratch", "imposter"] as LiteracyMode[]) {
  modeSizes[mode] = new Set<number>();
  for (let round = 0; round < 120; round++) {
    for (const entry of CURATED) {
      const tasks = buildSessionTasks(mode, [entry], 1);
      for (const task of tasks) {
        if (task.kind === "imposter") continue;
        modeSizes[mode].add(task.options.length);
        const sensePy = task.sense
          ? READINGS.find((r) => r.id === task.sense?.id)?.py
          : undefined;
        const targetPy = sensePy ?? PINYIN[task.target];
        const chars = task.options.map((o) => o.ch);
        if (new Set(chars).size !== chars.length) {
          problems.push(`${mode} ${task.target}: 选项重复 ${chars.join("")}`);
        }
        const targetCount = task.options.filter((o) => o.isTarget).length;
        if (targetCount !== 1) {
          problems.push(`${mode} ${task.target}: 正确选项有 ${targetCount} 个`);
        }
        for (const opt of task.options) {
          if (opt.isTarget) continue;
          const py = PINYIN[opt.ch];
          if (!py) problems.push(`${mode} ${task.target}: 干扰项 ${opt.ch} 没有读音`);
          else if (sameSound(py, targetPy)) {
            problems.push(
              `${mode} ${task.target}(${targetPy}): 干扰项 ${opt.ch}(${py}) 与目标同音`
            );
          }
        }
      }
    }
  }
}

// 句子短语库：同一短语里不能有两个不同的字同音
const units = [
  "太阳月亮", "山水花鸟", "天上白云", "日月山水", "大小多少", "不多不少",
  "快乐高兴", "一上一下", "七上八下", "一五一十", "三三两两", "大手小手",
  "又白又大", "又白又亮", "看了又看", "来了又走", "小鸟飞上天", "月亮天上亮",
  "天上白云飞", "快乐又高兴", "小牛吃草", "小鸟吃虫", "山羊吃草", "风雨来了",
  "大风来了", "看小鸟飞", "爸爸爱妈妈", "妈妈看我笑", "马牛羊来了", "一人一口水",
  "小马小牛小羊", "你笑我笑他笑",
];
for (const unit of units) {
  const bySyl = new Map<string, string>();
  for (const ch of new Set([...unit])) {
    const key = syllableOf(PINYIN[ch] ?? "");
    if (bySyl.has(key)) problems.push(`短语 ${unit}: ${bySyl.get(key)} 与 ${ch} 同音`);
    else bySyl.set(key, ch);
  }
}

console.log("每种玩法的选项个数：");
for (const [mode, sizes] of Object.entries(modeSizes)) {
  console.log(`  ${mode}: ${[...sizes].sort().join("/")}`);
}
if (problems.length === 0) {
  console.log(
    `✓ 4 种玩法 × ${CURATED.length} 字 × 120 轮：没有同音干扰项、没有重复选项、每题唯一正解`
  );
} else {
  console.error(`✗ ${problems.length} 个问题：`);
  for (const p of [...new Set(problems)].slice(0, 40)) console.error(`  ${p}`);
  process.exit(1);
}
