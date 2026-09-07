let preferredVoice: SpeechSynthesisVoice | null = null;
let currentAudio: HTMLAudioElement | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (preferredVoice) return preferredVoice;
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const zh = voices.filter((v) => v.lang.startsWith("zh"));
  // 大陆普通话（zh-CN）优先，避免被排在列表前面的台湾/香港语音抢走
  const cn = zh.filter((v) => v.lang === "zh-CN");
  const otherZh = zh.filter((v) => v.lang !== "zh-CN");
  const orderedZh = [...cn, ...otherZh];
  const enhanced =
    orderedZh.find((v) => /enhanced|增强|premium/i.test(v.name)) ??
    orderedZh.find((v) => /婷婷|ting-?ting|xiaoxiao|晓晓|meijia|美佳/i.test(v.name));
  if (enhanced) {
    preferredVoice = enhanced;
    return enhanced;
  }
  preferredVoice = cn[0] ?? otherZh[0] ?? null;
  return preferredVoice;
}

// 部分浏览器（尤其 iOS）需要等 voiceschanged 后才有中文语音列表
if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    preferredVoice = null;
    pickVoice();
  };
}

export function speechSupported(): boolean {
  return "speechSynthesis" in window;
}

function stopCurrentAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

function speakWithTTS(text: string): void {
  if (!speechSupported()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "zh-CN";
  utter.rate = 0.82;
  utter.pitch = 1.05;
  const voice = pickVoice();
  if (voice) utter.voice = voice;
  synth.speak(utter);
}

// 语文：优先播放预生成的单字 mp3（晓晓神经语音），失败再回退系统 TTS
async function playLocalChar(ch: string): Promise<boolean> {
  try {
    const url = `./audio/${encodeURIComponent(ch)}.mp3`;
    const audio = new Audio();
    audio.src = url;
    audio.preload = "auto";
    stopCurrentAudio();
    currentAudio = audio;
    await audio.play();
    audio.addEventListener("ended", () => {
      if (currentAudio === audio) currentAudio = null;
    });
    return true;
  } catch {
    stopCurrentAudio();
    return false;
  }
}

export function speak(text: string): void {
  stopCurrentAudio();
  // 单个汉字优先用本地高品质配音；多字文本走系统 TTS
  if (/^[\u4e00-\u9fff]$/.test(text)) {
    void playLocalChar(text).then((played) => {
      if (!played) speakWithTTS(text);
    });
    return;
  }
  speakWithTTS(text);
}

// 数学：晓晓预生成片段按顺序拼接（数字 0-99 + 加/减/等于/几），不依赖系统语音
export type MathSpeechToken = number | "add" | "sub" | "eq" | "ask";

function playMathChain(
  tokens: MathSpeechToken[],
  idx: number,
  fallbackText: string
): void {
  if (idx >= tokens.length) return;
  const token = tokens[idx];
  const url = `./audio/math/${token}.mp3`;
  const audio = new Audio();
  currentAudio = audio;
  audio.src = url;
  audio.preload = "auto";
  audio.onended = () => {
    if (currentAudio === audio) playMathChain(tokens, idx + 1, fallbackText);
  };
  audio.onerror = () => {
    stopCurrentAudio();
    speakWithTTS(fallbackText);
  };
  void audio.play().catch(() => {
    stopCurrentAudio();
    speakWithTTS(fallbackText);
  });
}

export function speakMathTokens(
  tokens: MathSpeechToken[],
  fallbackText: string
): void {
  stopCurrentAudio();
  if (tokens.length === 0) {
    speakWithTTS(fallbackText);
    return;
  }
  playMathChain(tokens, 0, fallbackText);
}

