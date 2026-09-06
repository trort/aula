let preferredVoice: SpeechSynthesisVoice | null = null;
let currentAudio: HTMLAudioElement | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (preferredVoice) return preferredVoice;
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const enhanced =
    voices.find(
      (v) =>
        v.lang === "zh-CN" &&
        /enhanced|增强|premium|siri|婷婷|tingting|xiaoxiao|晓晓/i.test(v.name)
    ) ||
    voices.find(
      (v) =>
        v.lang.startsWith("zh") &&
        /enhanced|增强|premium|婷婷|tingting|xiaoxiao|晓晓|meijia|美佳/i.test(v.name)
    );
  if (enhanced) {
    preferredVoice = enhanced;
    return enhanced;
  }
  preferredVoice =
    voices.find((v) => v.lang === "zh-CN" && /xiaoyi|tingting|meijia|huihui/i.test(v.name)) ||
    voices.find((v) => v.lang === "zh-CN") ||
    voices.find((v) => v.lang.startsWith("zh")) ||
    null;
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

export function speak(text: string): void {
  stopCurrentAudio();
  // 单个汉字优先用本地高品质配音；多字文本（数学题/短语）走系统 TTS
  if (/^[\u4e00-\u9fff]$/.test(text)) {
    void playLocalChar(text).then((played) => {
      if (!played) speakWithTTS(text);
    });
    return;
  }
  speakWithTTS(text);
}

