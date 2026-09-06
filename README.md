# Kids Learning Companion（识字 & 数学）

面向 4–6 岁幼小衔接儿童的线下教学"数字伴侣"：轻量、纯前端、离线可用的识字/数学记忆检验器。

设计文档：[docs/design.md](docs/design.md)

一年级上册基础字表：[wordbank/grade1-shang-recognition.md](wordbank/grade1-shang-recognition.md)（另有 [JSON 数据](wordbank/grade1-shang-recognition.json)）

## MVP 现状（v0.2）

首页分为两个小岛：

- **识字岛**：听音辨字（浏览器 TTS 朗读，三选一，干扰项为形近字）
  - 字包：一年级上册第一单元 6 组（天地人 / 金木水火土 / 口耳目 / 日月水火 / 对韵歌 / 语文园地一）
- **数学岛**：纯规则约束即时出题（无静态题库），难度 L1–L6 可多选
  - L1 加法入门（和 ≤ 10）· L2 进位加法（凑十）· L3 减法入门
  - L4 退位减法（破十）· L5 挖空求未知数 · L6 两位数加减
  - 每题四选一，干扰项按"常见错误"结构化生成（漏进位、错算成加法、±1/±10、数字颠倒等）
- 单轮 5 / 10 / 15 题可配；答错即时展示正确答案，错项进入"待复习"
- 数据：localStorage 纯本地存储（逐字/逐难度对错、连续答对、常错干扰项、最近练习），支持 JSON 导出 / 导入（旧版数据自动兼容迁移）
- 家长数据页：建议复习字与难度、逐项记录、备份迁移
- PWA：manifest + Service Worker，可离线打开
- 语音：识字第一单元 40 字使用预生成的"晓晓"神经语音 mp3（`public/audio/`），未覆盖字与数学题回退系统 TTS（iPad 建议安装"婷婷（增强）"中文语音效果更好）

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
