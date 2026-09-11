#!/usr/bin/env node
// 内容规则守卫 —— 规则说明见 docs/content-rules.md
//
// 最重要的一条：听音类玩法（听音选字 / 迷雾寻字 / 连句喂食）的选项里
// 不能再出现与目标字"听起来一样"的字（不计声调），否则孩子听到一个音
// 会看到两个都像对的字。新增字库/干扰字/句子后跑 `npm run check:content`
// （`npm run build` 里已经带上了）。

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");
const HANZI = "\\u4e00-\\u9fff";

const errors = [];
const warnings = [];
const infos = [];

// ---------- 解析 src/data/curated.ts ----------
const curatedSrc = read("src/data/curated.ts");
const entries = [];
for (const line of curatedSrc.split("\n")) {
  const m = line.match(
    new RegExp(
      `ch:\\s*"([${HANZI}])"\\s*,\\s*py:\\s*"([^"]+)"\\s*,\\s*pack:\\s*"([^"]+)"\\s*,\\s*decoys:\\s*\\[([^\\]]*)\\]`
    )
  );
  if (!m) continue;
  entries.push({
    ch: m[1],
    py: m[2],
    pack: m[3],
    decoys: [...m[4].matchAll(new RegExp(`"([${HANZI}])"`, "g"))].map((x) => x[1]),
  });
}

// ---------- 解析字表（四五快读 + 一年级上册，顺序即课程顺序）----------
const bankFiles = ["wordbank/swkd-first.json", "wordbank/grade1-shang-recognition.json"];
const groups = bankFiles.flatMap((f) => JSON.parse(read(f)).groups);

// ---------- 解析 src/data/pinyin.ts ----------
const pinyinSrc = read("src/data/pinyin.ts");
const PINYIN = {};
for (const m of pinyinSrc.matchAll(new RegExp(`"([${HANZI}])":\\s*"([^"]+)"`, "g"))) {
  PINYIN[m[1]] = m[2];
}

// ---------- 解析 src/data/sentences.ts ----------
const sentencesSrc = read("src/data/sentences.ts");
const unitsBlock = sentencesSrc.match(/SENTENCE_UNITS[^=]*=\s*\[([\s\S]*?)\];/);
const units = unitsBlock
  ? [...unitsBlock[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
  : [];

// ---------- 与 src/data/pinyin.ts 保持一致的"去声调"比较 ----------
const TONE_MAP = {
  ā: "a", á: "a", ǎ: "a", à: "a",
  ē: "e", é: "e", ě: "e", è: "e",
  ī: "i", í: "i", ǐ: "i", ì: "i",
  ō: "o", ó: "o", ǒ: "o", ò: "o",
  ū: "u", ú: "u", ǔ: "u", ù: "u",
  ǖ: "v", ǘ: "v", ǚ: "v", ǜ: "v", ü: "v",
  ń: "n", ň: "n", ǹ: "n", ḿ: "m",
};
const syl = (py) =>
  [...py.toLowerCase()].map((c) => TONE_MAP[c] ?? c).join("").replace(/\s+/g, "");
const sameSound = (a, b) => syl(a ?? "") === syl(b ?? "");

// ---------- 0. 解析结果健全性 ----------
if (entries.length === 0) {
  errors.push("没能从 src/data/curated.ts 解析出字条（格式变了？每条应写成 ch/py/pack/decoys 同一行）");
}
if (Object.keys(PINYIN).length === 0) {
  errors.push("没能从 src/data/pinyin.ts 解析出读音表（格式变了？每行应写成 \"字\": \"pīn\",）");
}
if (units.length === 0) {
  errors.push("没能从 src/data/sentences.ts 解析出句子短语库");
}
if (errors.length > 0) {
  for (const e of errors) console.error(`✗ ${e}`);
  process.exit(1);
}

const entryOf = new Map(entries.map((e) => [e.ch, e]));
const groupIndexById = new Map(groups.map((g, i) => [g.id, i]));
const firstIndex = new Map();
groups.forEach((g, i) => {
  for (const ch of g.chars) if (!firstIndex.has(ch)) firstIndex.set(ch, i);
});
/** 该字条所在的档位：优先"最早出现在哪本书的表里"，退回到 pack 字段 */
const groupIdxOf = (entry) => {
  const i = firstIndex.get(entry.ch);
  if (i !== undefined) return i;
  return groupIndexById.get(entry.pack) ?? groups.length;
};

// ---------- 0b. 字表与字条必须对得上 ----------
for (const g of groups) {
  for (const ch of new Set([...g.chars])) {
    if (!entryOf.has(ch)) {
      errors.push(`字表「${g.title}」里的「${ch}」还没有字条（src/data/curated.ts）`);
    }
  }
}
for (const e of entries) {
  if (!groupIndexById.has(e.pack)) {
    errors.push(`「${e.ch}」的 pack「${e.pack}」不在任何字表里`);
  }
}
if (errors.length > 0) {
  for (const e of errors) console.error(`✗ ${e}`);
  process.exit(1);
}

// ---------- 1. 读音表覆盖度 ----------
const needPinyin = new Set();
for (const e of entries) {
  needPinyin.add(e.ch);
  for (const d of e.decoys) needPinyin.add(d);
}
const missingPinyin = [...needPinyin].filter((ch) => !PINYIN[ch]);
if (missingPinyin.length > 0) {
  errors.push(
    `这些字在 src/data/pinyin.ts 里没有读音（听音题无法判断是否同音）：${missingPinyin.join(" ")}`
  );
}
const unusedPinyin = Object.keys(PINYIN).filter((ch) => !needPinyin.has(ch));
if (unusedPinyin.length > 0) {
  infos.push(`读音表里暂时没被用到的字：${unusedPinyin.join(" ")}`);
}

// ---------- 2. 字条自身的毛病 ----------
for (const e of entries) {
  if (e.decoys.includes(e.ch)) errors.push(`「${e.ch}」的干扰项里混进了它自己`);
  if (new Set(e.decoys).size !== e.decoys.length) {
    warnings.push(`「${e.ch}」的干扰项有重复`);
  }
  if (e.decoys.length < 2) {
    errors.push(`「${e.ch}」只有 ${e.decoys.length} 个干扰项，出不了三选一`);
  }
}

// ---------- 3. 手工干扰项里的同音字（听音类会自动跳过，找茬仍可用） ----------
const sameSoundPairs = [];
for (const e of entries) {
  for (const d of e.decoys) {
    if (PINYIN[d] && PINYIN[e.ch] && sameSound(PINYIN[d], PINYIN[e.ch])) {
      sameSoundPairs.push(`${e.ch}(${PINYIN[e.ch]}) ↔ ${d}(${PINYIN[d]})`);
    }
  }
}
if (sameSoundPairs.length > 0) {
  infos.push(
    `手工干扰项里与目标字同音的有 ${sameSoundPairs.length} 组（听音类出题时会自动跳过，只留给找茬）：${sameSoundPairs.join("；")}`
  );
}

// ---------- 4. 句子短语库 ----------
for (const unit of units) {
  for (const ch of unit) {
    if (!entryOf.has(ch)) {
      errors.push(`短语「${unit}」里的「${ch}」不在字库（src/data/curated.ts）里`);
      continue;
    }
    if (!PINYIN[ch]) errors.push(`短语「${unit}」里的「${ch}」没有读音`);
  }
  const seen = new Map();
  for (const ch of new Set([...unit])) {
    const key = syl(PINYIN[ch] ?? "");
    if (seen.has(key)) {
      errors.push(
        `短语「${unit}」里有同音字：${seen.get(key)}(${PINYIN[seen.get(key)]}) ↔ ${ch}(${PINYIN[ch]})`
      );
    } else {
      seen.set(key, ch);
    }
  }
}

// ---------- 5. 连句喂食：整个气球池里不能有目标字的同音字 ----------
// 与 src/FeedSentence.tsx 的气球补充逻辑一致：同一轮里气球只增不减，
// 每个新目标按 [目标, 后面的字, 安全干扰字] 最多补 4 个。
function safeDecoyPool(entry) {
  const packIdx = groupIdxOf(entry);
  const tiers = [[], [], [], []];
  for (const e of entries) {
    if (e.ch === entry.ch) continue;
    const idx = groupIdxOf(e);
    if (idx === packIdx) tiers[0].push(e.ch);
    else if (idx < packIdx) tiers[1].push(e.ch);
    else tiers[2].push(e.ch);
  }
  const inCourse = new Set(tiers.flat());
  for (const e of entries) {
    for (const d of e.decoys) {
      if (d !== entry.ch && !inCourse.has(d) && !tiers[3].includes(d)) tiers[3].push(d);
    }
  }
  const out = [];
  for (const ch of [entry.decoys, ...tiers].flat()) {
    if (ch === entry.ch || out.includes(ch)) continue;
    const py = PINYIN[ch];
    if (!py) continue; // 没读音的字不放，和 App 里的处理一致
    if (sameSound(py, PINYIN[entry.ch])) continue;
    out.push(ch);
  }
  return out;
}

for (const unit of units) {
  const chars = [...unit];
  let pool = [];
  chars.forEach((target, pos) => {
    if (!pool.includes(target)) {
      const seen = new Set(pool);
      const cands = [];
      for (const ch of [target, ...chars.slice(pos + 1), ...safeDecoyPool(entryOf.get(target))]) {
        if (!seen.has(ch) && !cands.includes(ch)) cands.push(ch);
        if (cands.length >= 4) break;
      }
      pool = [...pool, ...cands];
    }
    const clash = pool.filter(
      (ch) => ch !== target && sameSound(PINYIN[ch], PINYIN[target])
    );
    if (clash.length > 0) {
      errors.push(
        `短语「${unit}」第 ${pos + 1} 个字「${target}」时，气球池里还有同音气球：${clash.join(" ")}`
      );
    }
  });
}

// ---------- 6. 听音三选一 / 迷雾四选一 是否有足够的安全干扰字 ----------
for (const e of entries) {
  const safe = safeDecoyPool(e).length;
  if (safe < 3) {
    warnings.push(`「${e.ch}」可用的安全干扰字只有 ${safe} 个，迷雾寻字会少一个选项`);
  }
}

// ---------- 报告 ----------
console.log(
  `字条 ${entries.length} 条 · 读音 ${Object.keys(PINYIN).length} 个 · 短语 ${units.length} 条`
);
for (const i of infos) console.log(`ℹ ${i}`);
for (const w of warnings) console.log(`⚠ ${w}`);
if (errors.length > 0) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error(`\n内容规则检查未通过：${errors.length} 个问题`);
  process.exit(1);
}
console.log("✓ 内容规则检查通过（听音类选项无同音字、短语无同音字、读音表完整）");
