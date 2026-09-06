# Kids Learning Companion（识字 & 数学）

面向 4–6 岁幼小衔接儿童的线下教学"数字伴侣"：轻量、纯前端、离线可用的识字/数学记忆检验器。

设计文档：[docs/design.md](docs/design.md)

一年级上册基础字表：[wordbank/grade1-shang-recognition.md](wordbank/grade1-shang-recognition.md)（另有 [JSON 数据](wordbank/grade1-shang-recognition.json)）

## MVP 现状（v0.1）

- 识字模式：听音辨字（浏览器 TTS 朗读，三选一，干扰项为形近字）
- 字包：一年级上册第一单元 6 组（天地人 / 金木水火土 / 口耳目 / 日月水火 / 对韵歌 / 语文园地一）
- 单轮 5 / 10 / 15 题可配；答错即时展示正确答案，错字进入"待复习"
- 数据：localStorage 纯本地存储（逐字对错、连续答对、常错干扰字、最近练习），支持 JSON 导出 / 导入
- 家长数据页：建议复习字、逐字记录、备份迁移
- PWA：manifest + Service Worker，可离线打开

尚未包含：数学域、找茬模式、完整 SRS 调度、延迟权重、多孩子档案。

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
