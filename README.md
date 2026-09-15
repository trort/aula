# Kids Learning Companion（识字 & 数学）

面向 4–6 岁幼小衔接儿童的线下教学"数字伴侣"：轻量、纯前端、离线可用的识字/数学记忆检验器。

仓库导览（改代码前先看这份）：[AGENTS.md](AGENTS.md)

设计文档：[docs/design.md](docs/design.md)

加字 / 加干扰项 / 加句子的规则：[docs/content-rules.md](docs/content-rules.md)（改完跑 `npm run check:content`）

字表：[wordbank/](wordbank/)（《四五快读》第一册 + 一年级上册，见 [wordbank/README.md](wordbank/README.md)）

## MVP 现状（v0.2）

首页分为两个小岛：

- **识字岛**：四种玩法（听音选字 / 找茬 / 传送带连句 / 迷雾寻字），干扰项为形近字、且不与目标字同音
  - 课程顺序：先《四五快读》第一册（5 个包）→ 一年级上册（15 个包）→ 家长补充（2 个包），共 22 个包、每包 16–28 字；当前包练稳后自动混入下一包，无需手动选字
  - 一个字可能同时出现在两本书的字表里（如 大/小/人），进度按"字"共享，不会重复学
- **数学岛**：纯规则约束即时出题（无静态题库），难度 L1–L6 可多选
  - 认知梯度 L1–L6：约两周才放出下一个概念（最快一周），开头加法 / 进位加法按 90% / 10% 一起出；
    节奏参数独立于识字，见 [AGENTS.md](AGENTS.md) §4.1
  - L1 加法入门（和 ≤ 10）· L2 进位加法（凑十）· L3 减法入门
  - L4 退位减法（破十）· L5 挖空求未知数 · L6 两位数加减
- 数字键盘填空作答（`src/MathQuizScreen.tsx`），答对自动进入下一题、答错先亮正确答案
- 单轮 5 / 10 / 15 题可配；答错即时展示正确答案，错项进入"待复习"
- 识字推进速度：开头前 30 个字一口气放出，之后每天约 2–3 个新字，其余题量用于复习
- 数据：localStorage 纯本地存储（逐字/逐难度对错、连续答对、常错干扰项、最近练习），支持 JSON 导出 / 导入（旧版数据自动兼容迁移）
- 家长数据页：建议复习字与难度、逐项记录、备份迁移，以及**手动改进度**
  （✓ 已掌握 / ↺ 没掌握 / ⟲⤺ 回退：把某字、某字表或某难度档及其后所有档清回"没练过"，用于把跑太快的进度拉回来）
- PWA：manifest + Service Worker，可离线打开
- 语音：识字全部 315 字都有预生成的"晓晓"神经语音 mp3（`public/audio/`，新增字用 `bash scripts/gen-audio.sh` 批量补），数学用另一套晓晓片段；缺文件才回退系统 TTS

尚未包含：找茬模式、完整 SRS 调度、延迟权重、多孩子档案。

## 本地运行

```bash
npm install
npm run dev        # 开发
npm run build      # 类型检查 + 产物构建到 dist/
npm run preview    # 本地预览构建产物
```

## 部署到 GitHub Pages

仓库内已带 [GitHub Actions 工作流](.github/workflows/deploy.yml)，推送到 `main` 后会自动构建并发布到 Pages。

需要在 GitHub 仓库设置里把 Pages 的 Source 选为 **GitHub Actions**。
