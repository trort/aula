let preferredVoice: SpeechSynthesisVoice | null = null;
let currentAudio: HTMLAudioElement | null = null;
const voiceListeners = new Set<() => void>();

export function subscribeVoices(cb: () => void): () => void {
  voiceListeners.add(cb);
  return () => {
    voiceListeners.delete(cb);
  };
}

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
    voiceListeners.forEach((cb) => cb());
  };
}

export function speechSupported(): boolean {
  return "speechSynthesis" in window;
}

export interface VoiceDiag {
  supported: boolean;
  voices: Array<{ name: string; lang: string; enhanced: boolean }>;
  preferred: string | null;
}

export function getVoiceDiagnostics(): VoiceDiag {
  if (!speechSupported()) {
    return { supported: false, voices: [], preferred: null };
  }
  const voices = window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.startsWith("zh"))
    .map((v) => ({
      name: v.name,
      lang: v.lang,
      enhanced: /enhanced|增强|premium/i.test(v.name),
    }));
  const preferred = pickVoice();
  return {
    supported: true,
    voices,
    preferred: preferred ? preferred.name : null,
  };
}

// 手动触发一次语音列表刷新（部分浏览器需要先 speak 一次才回填列表）
export function retriggerVoiceList(): void {
  if (!speechSupported()) return;
  const synth = window.speechSynthesis;
  synth.getVoices();
  synth.cancel();
  const probe = new SpeechSynthesisUtterance("测");
  probe.lang = "zh-CN";
  synth.speak(probe);
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
