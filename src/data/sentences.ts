// 只使用当前字库内字符组成的真实短语/句子（4 字起步），用于传送带连句关
export const SENTENCE_UNITS: string[] = [
  "太阳月亮",
  "山水花鸟",
  "天上白云",
  "日月山水",
  "大小多少",
  "不多不少",
  "快乐高兴",
  "一上一下",
  "七上八下",
  "一五一十",
  "三三两两",
  "大手小手",
  "又白又大",
  "又白又亮",
  "看了又看",
  "来了又走",
  "小鸟飞上天",
  "月亮天上亮",
  "天上白云飞",
  "快乐又高兴",
  "小牛吃草",
  "小鸟吃虫",
  "山羊吃草",
  "风雨来了",
  "大风来了",
  "看小鸟飞",
  "爸爸爱妈妈",
  "妈妈看我笑",
  "马牛羊来了",
  "一人一口水",
  "小马小牛小羊",
  "你笑我笑他笑",
];

function shuffle<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 拼出刚好不少于 length 个字的句子串（按完整短语拼接，允许略超长度） */
export function assembleSentence(length: number): string {
  const units = shuffle(SENTENCE_UNITS);
  let out = "";
  for (const unit of units) {
    if (out.length >= length) break;
    const remaining = length - out.length;
    if (unit.length <= remaining || out.length === 0) {
      out += unit;
      continue;
    }
    // 剩余不足时，尝试找更短的完整句；找不到就保留这一整句
    const shorter = units.find(
      (u) => u.length <= remaining && !out.includes(u)
    );
    if (shorter) out += shorter;
    else out += unit;
  }
  return out;
}

