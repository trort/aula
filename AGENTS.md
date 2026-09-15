# AGENTS.md · 仓库导览（给未来的 agent / 接手的人）

> 读完这一份就能动手改这个仓库，**不需要再把整个 repo 读一遍**。
> 只改内容（加字、加干扰项、加句子）→ [docs/content-rules.md](docs/content-rules.md)；
> 原始设计意图 → [docs/design.md](docs/design.md)；历史阶段快照与待办 → [docs/phase-log-2026-09-07.md](docs/phase-log-2026-09-07.md)。

## 1. 这是什么

面向 4–6 岁幼小衔接孩子的**纯前端 PWA**（Vite + React 19 + TypeScript + localStorage，无后端、无账号、断网可用）。
产品定位不是网课，而是**记忆检验器**：家长线下用教材/绘本教，App 负责出题 → 记录对错 → 自动决定下一次练什么。

| 域 | 内容驱动方式 | 内容量 | 玩法 |
| --- | --- | --- | --- |
| 识字岛 | 静态字库（315 字 · 22 个字表）+ 逐字掌握记录 | 大 | 听音选字 · 找茬 · 传送带喂食 · 迷雾寻字 · 连句 |
| 数学岛 | 纯规则即时生成（**无题库**），难度 L1–L6 | 小（6 档概念） | 数字键盘填空 |

- 线上：https://trort.github.io/aula/ ；仓库 `trort/aula`，本地根目录 = 仓库根目录。
- `push main` 自动部署 GitHub Pages（`.github/workflows/deploy.yml`）。

## 2. 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 本地开发 |
| `npm run build` | **提交前必跑**：内容规则检查 + `tsc --noEmit` + 构建到 `dist/` |
| `npm run typecheck` | 只做类型检查 |
| `npm run check:content` | 校验字库/读音/干扰项/短语（`build` 已内置） |
| `npm run verify:decoys` | 抽查干扰项生成是否符合内容规则 |
| `bash scripts/gen-audio.sh` | 给缺字音的字批量补晓晓 mp3（需联网 + `edge-tts`） |

## 3. 文件地图

### 3.1 外壳与页面

| 文件 | 职责 |
| --- | --- |
| `index.html` · `src/main.tsx` | HTML 壳、React 挂载、Service Worker 注册（`import.meta.env.DEV` 下不注册） |
| `src/App.tsx` | **唯一的页面路由**（`home` / `quiz` / `result` / `stats`）+ 首页、结果页、家长数据页 `StatsScreen`；持有全局 `AppState`，所有写入都从这里发起 |
| `src/ParentGate.tsx` | 家长数据页的门（一元一次方程，答错换题；防小朋友误点改进度） |
| `src/styles.css` | 全部样式（无框架、无 CSS-in-JS）。汉字一律用 `--kai` 楷体字族 |
| `public/sw.js` | 离线缓存（导航网络优先、静态资源缓存优先）；`CACHE_NAME` 与版本号同步 |
| `vite.config.ts` | `base: "./"`，为了 GitHub Pages 子路径 |

### 3.2 两个业务域的出题与作答

| 文件 | 职责 |
| --- | --- |
| `src/lib/tasks.ts` | 识字"玩法 → 题目"的构造：`buildSessionTasks(mode, chars, size)` 产出统一 `Task`（`audio` / `imposter` / `feed` / `scratch`），一个玩法出一整局 |
| `src/LiteracyRunner.tsx` | 识字作答界面：卡片（audio）、找茬（imposter）、传送带喂食（import `FeedBelt`）、迷雾寻字（import `ScratchCards`）；统一产出 `AnswerItem[]` |
| `src/FeedBelt.tsx` · `src/ScratchCards.tsx` | 上面两种玩法的具体实现 |
| `src/FeedSentence.tsx` | **连句**玩法（另一个独立的 `Screen`，从 `src/data/sentences.ts` 组句，逐字记录进度） |
| `src/lib/mathgen.ts` | 数学**唯一**的题目来源：`MATH_LEVELS`（L1–L6 定义）、`genMathQuestion(level)`、`buildMathQuestions(levels, size)`、`cnNum`、`fillAnswer` |
| `src/MathQuizScreen.tsx` | 数学作答界面：数字键盘、答对 700ms 自动下一题、答错先亮答案；产出 `MathAnswerItem[]` |
| `src/RewardFx.tsx` · `src/lib/sfx.ts` · `src/lib/rewards.ts` | 星星/贴纸/连击的奖励算法、音效与动画（`STICKERS`、`calcSessionReward`） |

### 3.3 进度引擎与数据（**改得最多的部分**）

| 文件 | 职责 |
| --- | --- |
| `src/lib/pace.ts` | **下一步该练多难，全看这里**：`PACE.literacy` / `PACE.math` 两套节奏参数（见 §4.1） |
| `src/lib/progress.ts` | 自动进阶引擎：掌握分 `scoreOf`、练稳判定 `isSolid`、`packProgress`、识字选字 `pickLessonChars`、数学进度规划 `planMath` + `pickMathLevels` |
| `src/lib/storage.ts` | `AppState` 定义、localStorage 读写与旧数据迁移、`recordAnswer` / `recordMathAnswer`，以及家长手动干预用的 `setCharMastery` / `setMathMastery` / `resetCharStats` / `resetMathStats`、`dueMs` 间隔 |
| `src/lib/types.ts` | `Screen` / `Domain` / `Question` / `AnswerItem` / `MathAnswerItem` / `SessionResult` 等跨模块契约 |
| `src/lib/audio.ts` | 语音：本地晓晓 mp3 优先，缺失才回退系统 TTS；`speak` / `speakMathTokens` |

### 3.4 内容数据（加内容必看 `docs/content-rules.md`）

| 文件 | 职责 |
| --- | --- |
| `wordbank/*.json` | 字出现在**哪本书的哪个课次**；数组顺序 = 课程顺序。`src/data/wordbank.ts` 按顺序拼成 `WORD_BANK_GROUPS`（22 包） |
| `src/data/curated.ts` | 每个字的读音、**形近干扰项**、所属包（`{ ch, py, pack, decoys }`） |
| `src/data/pinyin.ts` | 全字表（含只当干扰项出现的字）的读音，供同音过滤判断 |
| `src/data/readings.ts` | 多音字按**读音条目**拆分（`兴:高兴` / `兴:兴奋`）+ id ↔ 字形互转（`glyphOfId` / `labelForId`） |
| `src/data/sentences.ts` | 连句玩法用的真实短语（只允许用字库内的字） |
| `src/lib/decoys.ts` | 干扰项分层：同单元 → 已学 → 更晚 → 纯干扰字；听音类玩法**自动跳过同音字** |
| `public/audio/` | `{字}.mp3`（315 字全量）· `units/{短语}.mp3`（32）· `words/{词}.mp3`（多音字承载词）· `math/{0-99,加,减,等于,几}.mp3`（104 段） |

### 3.5 脚本

| 文件 | 职责 |
| --- | --- |
| `scripts/check-content.mjs` | 内容规则校验（同音字、短语、读音表完整性），`npm run build` 会先跑它 |
| `scripts/verify-decoys.ts` | 干扰项抽样核对 |
| `scripts/gen-audio.sh` | 扫描字库缺失的 `public/audio/*.mp3` 并批量生成 |

## 4. 核心机制（改之前先看懂）

### 4.1 自动进阶引擎：识字与数学用**不同**节奏参数

孩子不选字表/难度，只选 5/10/15 题；"练什么"由引擎决定。两个域的目标不同，
**参数不能互相抄**（全部集中在 `src/lib/pace.ts`，改节奏只改这一个文件）。

**识字（`pickLessonChars`）：目标是"每天 2–3 个新字"（按每天 30 题）**

1. **掌握分**：`scoreOf(stat, domain) = clamp01((right - wrong) / PACE[domain].net)`，
   识字 `net = 3`（一个字净答对 3 次算练稳）。
2. **新字配额**（决定"每天几个新字"）：
   - 开头 `bootstrapChars = 30` 个字之前不限速（不然最开头没东西可学）；
   - 之后每 `newEvery = 12` 题最多 1 个新字 → 5/10/15 题一局都是每局 1 个，
     30 题/天 = 2–3 局 = **2–3 个新字/天**；
   - 练过的字不够多时用新字补满一局（宁可多认几个字，也不空题）。
3. **其余题量全是复习**：到期/刚错的字先占最多 40%（`dueTake`），余下按权重抽
   （越生权重越高；上一字表越熟练，下一字表混入越多：`blendStart 0.5 → blendFull 0.9`）。
4. 实测（85% 正确率、30 题/天）：第 1–2 天一口气放出 32 个字，之后稳定 **2.89 个新字/天**，
   30 天认识 110 字（其中练稳 95 字）。

**数学（`planMath` + `pickMathLevels`）：目标是"约两周一个新概念，最快一周"**

5. 一档"练稳" = 净答对 `net = 200`（每天 30 题约 10 天）。
6. **放出闸门**（时间 + 掌握，两个都要满足）：
   - 开头 `warmupLevels = 2` 档一起放出：L1 加法 + L2 进位加法，L2 固定占
     `warmupShare`（1/9 权重 ≈ 10% 题量），即家长要的 **90% / 10%**；
   - 之后要等上一档**练满 `minDays`(7) 天**（"哪怕全对也要一周"的硬闸门）
     **且掌握分 ≥ `blendStart`(0.5)**，下一档才会偶尔冒头（`sprinkle` ≈ 每天 1 道）；
   - 再花 `rampDays`(7) 天把下一档的占比涨到 `maxShare`（≈ 33%），
     上一档练稳后下一档才成为主练档（占大头）。
7. **当前主练档** = `planMath().current`（第一个已放出但没练稳的档）；首页"当前重点"
   和家长数据页都用它，保证显示与出题口径一致。
8. 实测（85% 正确率、30 题/天）：L1+L2 第 1 天同时出现（90% / 10%）；
   减法 L3 第 17 天、退位减法 L4 第 30 天、小侦探 L5 第 44 天 →
   间隔 16 / 13 / 14 天，**约两周一个新概念**；全对时 L3 也要到第 12–13 天
   （每天 100 题的全对狂人也要第 8 天），即"最快也要一周"由 `minDays` 保证。

**调参速查**

| 想改的效果 | 改哪个参数 |
| --- | --- |
| 每天几个新字 | 识字 `newEvery`（越大越慢）、`bootstrapChars`（开头放开多少个字） |
| 一个字多久算练稳 | 识字 `net` |
| 数学多久出一个新概念 | `minDays`（硬下限）/ `blendStart`（放出时机，越小越早）/ `net` |
| 新概念放量后占多少题 | `maxShare`；刚放出时的占比 = `sprinkle` |
| 开头一起放出几档、后一档占多少 | `warmupLevels` / `warmupShare` |

### 4.2 家长手动干预：三种动作（✓ / ↺ / ⟲·⤺）

家长数据页（`StatsScreen`）里，字、字表、数学档位都能手动改：

| 动作 | 语义 | 实现 |
| --- | --- | --- |
| ✓ 已掌握 | 直接记成"练稳"（`right = PACE[domain].net`），只偶尔复习 | `setCharMastery` / `setMathMastery` |
| ↺ 没掌握 | 记为刚错 → 立刻"建议今天复习"，下一轮优先出 | 同上（`mastered = false`） |
| ⟲ / ⤺ **回退** | 清空练习记录，回到"没练过" | `resetCharStats` / `resetMathStats` |

**回退为什么要"清空本档及之后所有档"**：某一档是否开启，取决于**上一档**的掌握分（`prevScore > blendStart`）。
所以进度超前时（比如还没学进位加法就出了减法），只清掉难题那一档没用——上一档分高，它照样被放出来；
必须把"该在的那一档"自身也清零，它后面的档才会一起关掉。这也是家长唯一能把进度往回调的手段。

数学还有一处手动干预的细节：点 ✓ 时 `setMathMastery` 会把该档的 `startedAt` 往前推
`minDays`（7 天），这样家长"我判定他会了"能立刻生效，不会被"一档至少练满 7 天"的时间闸门卡住；
⤺ 回退会连记录带时间一起清掉，等于重新开始计时。

### 4.3 数据模型

- localStorage key：`kids-learning-companion-v1`，结构见 `src/lib/storage.ts` 的 `AppState`
  （`chars` / `math` / `rewards` / `sessions`；`v` 必须为 1）。
- 每条记录（`CharStat`）除了对/错/连对/最近练习，还有 `startedAt`（第一次练的时间，数学的时间闸门用）。
  2026-09-14 之前的数据没有这个字段，`loadState` / `importState` 会补成 `seenAt`（只会让进度更慢，不会更超前）。
- **进度按"字"共享**：一个字同时出现在《四五快读》和课本里也只学一次；
  多音字按**读音条目**记录（key = `兴:高兴`），`statKeysFor(ch)` 给出某个字要更新的所有 key。
- 抗遗忘：`dueMs(stat)` —— 刚错/没见过 = 0（立即到期）；答对后按连续次数拉长到 1/2/4/7/14 天。
- 家长可导出/导入 JSON（`exportState` / `importState`），换设备靠它迁移。**改动数据结构要同步处理旧数据迁移**（参考 `migrateReadingStats`）。

### 4.4 语音与内容约束

- 单字/整词优先 `public/audio/*.mp3`（晓晓神经语音），缺失才回退 Web TTS；数学是"数字/运算符片段拼接"（`speakTokens`）。
- **靠听音出题的玩法，选项里不能有与目标字同音的字**（不计声调）。`src/lib/decoys.ts` 会自动跳过，
  但手工数据（`curated.ts`）里允许保留同音形近字——它们只服务纯视觉的"找茬"。

## 5. 硬性规则

1. **改完必须 `npm run build` 通过**（内含 `check:content` + `tsc`）。内容类改动必须 `check:content` 绿。
2. **加字要三处同步**：`wordbank/*.json`（课程位置）+ `src/data/curated.ts`（读音/干扰项）+ `src/data/pinyin.ts`（读音表），
   再补 `public/audio/{字}.mp3`。细节见 `docs/content-rules.md`。
3. **不引入后端、云服务、运行时新依赖**：必须保证断网可用、构建体积小（设计文档 §2.3 零资产负担）。
4. **版本号三处同步**：`package.json` `version`、`public/sw.js` `CACHE_NAME`、`src/App.tsx` `APP_VERSION`（首页右下角显示）。
   改了要孩子端生效的代码就必须一起递增，否则 Service Worker 会继续发旧缓存。
5. 家长改动必须**立刻生效**：`setState` → `useEffect` → `persist`，不要另开写入路径绕过 `AppState`。
6. 学习节奏参数集中在 `src/lib/pace.ts`；不要把 `net` / `blendStart` 之类的魔数散回 `progress.ts`。

## 6. 常见任务 → 改哪里

| 想做的事 | 动哪里 |
| --- | --- |
| 数学/识字进度太快或太慢 | 只改 `src/lib/pace.ts`（先看 §4.1 的实测数据） |
| 家长页面加/改手动调整能力 | `src/App.tsx` 的 `StatsScreen` + `src/lib/storage.ts` 的 set/reset 函数 |
| 新增数学难度（如乘法 L7） | `src/lib/mathgen.ts`（`MATH_LEVELS` + `genMathQuestion` + `buildSpeakTokens`）+ 需要的语音片段 |
| 新增识字玩法 | `src/lib/tasks.ts` 的 `Task` 联合类型 + 对应 Runner 组件 + `src/App.tsx` 的 `quiz` 分支 + 首页 chip |
| 加字 / 加干扰项 / 加句子 | 见 `docs/content-rules.md`（三处同步 + 跑 `check:content`） |
| 改奖励（星星/贴纸/连击） | `src/lib/rewards.ts` + `src/RewardFx.tsx` + `ResultScreen` |
| 改离线/缓存行为 | `public/sw.js`（记得同时改 `CACHE_NAME`） |

## 7. 已知坑与未完成（照 `docs/phase-log-2026-09-07.md` 更新）

- **多音字"读音级条目"还没做完**：`readings.ts` 已有 4 条（兴/乐），但单字音频仍按默认读音；
  完整方案要做 key 迁移、逐读音音频与例句。
- 反应延迟（Latency）数据没接入 SRS；SRS 目前只是"错字到期 + 间隔拉长"。
- 迷雾寻字的手感参数（刮开阈值 55%、笔刷 36px）只在桌面验证过，真机待调。
- 传送带喂食"气球飞向小动物"还没有真正的飞行动画；数学整句朗读仍是片段拼接。
- 找茬进阶（3×3 → 更难）、多孩子档案未做。
