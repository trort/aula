// 多音字按"读音条目"拆分：同形不同音 = 不同学习项
export interface ReadingItem {
  id: string; // 学习/统计用唯一 id，如 "兴:高兴"
  ch: string; // 显示的字形
  py: string;
  carrier: string; // 承载词（也用于按词义发音）
}

export const READINGS: ReadingItem[] = [
  { id: "兴:高兴", ch: "兴", py: "xìng", carrier: "高兴" },
  { id: "兴:兴奋", ch: "兴", py: "xīng", carrier: "兴奋" },
  { id: "乐:快乐", ch: "乐", py: "lè", carrier: "快乐" },
  { id: "乐:音乐", ch: "乐", py: "yuè", carrier: "音乐" },
];

export function readingsFor(ch: string): ReadingItem[] {
  return READINGS.filter((r) => r.ch === ch);
}

// 句子短语 → 该短语中每个字采用的读音 id（用于连句关按词记录）
export const UNIT_READING: Record<string, Record<string, string>> = {
  "快乐高兴": { 乐: "乐:快乐", 兴: "兴:高兴" },
  "快乐又高兴": { 乐: "乐:快乐", 兴: "兴:高兴" },
};

export function readingForUnit(unit: string, ch: string): ReadingItem | undefined {
  const id = UNIT_READING[unit]?.[ch];
  if (!id) return undefined;
  return READINGS.find((r) => r.id === id);
}

export function labelForId(id: string): string {
  const reading = READINGS.find((r) => r.id === id);
  if (reading) return `${reading.ch}·${reading.carrier}`;
  return id.length === 1 ? id : `${id[0]}·${id}`;
}

export function glyphOfId(id: string): string {
  const reading = READINGS.find((r) => r.id === id);
  if (reading) return reading.ch;
  return id[0] ?? id;
}
