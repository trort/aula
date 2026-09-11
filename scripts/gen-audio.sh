#!/usr/bin/env bash
# 给字库里"还没有字音"的字生成晓晓神经语音（需要联网 + edge-tts：pip install edge-tts）
#
#   bash scripts/gen-audio.sh
#
# 注意：单字音频按默认读音朗读，多音字（长/得/为/着/数/更…）只取常用音；
# 要按词义精确发音，需要先做"读音级条目"（见 docs/phase-log 待办 1）。
set -u
cd "$(dirname "$0")/.."

voice="zh-CN-XiaoxiaoNeural"
rate="-5%"

chars=$(node -e '
const fs = require("fs");
const src = fs.readFileSync("src/data/curated.ts", "utf8");
const chars = [...src.matchAll(/ch: "([\u4e00-\u9fff])"/g)].map((m) => m[1]);
const have = new Set(
  fs.readdirSync("public/audio").filter((f) => f.endsWith(".mp3")).map((f) => f.replace(".mp3", ""))
);
console.log(chars.filter((c) => !have.has(c)).join("\n"));
')

count=0
failed=""
while read -r ch; do
  [ -z "$ch" ] && continue
  ok=0
  for _ in 1 2 3; do
    if edge-tts --voice "$voice" --rate="$rate" --text "$ch" \
      --write-media "public/audio/$ch.mp3" >/dev/null 2>&1; then
      ok=1
      break
    fi
    sleep 2
  done
  count=$((count + 1))
  [ "$ok" -eq 0 ] && failed="$failed$ch "
  [ $((count % 20)) -eq 0 ] && echo "已生成 $count 个…"
done <<< "$chars"

echo "完成：本次生成 $count 个；失败：${failed:-无}"
