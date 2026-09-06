let preferredVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (preferredVoice) return preferredVoice;
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
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

export function speak(text: string): void {
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

