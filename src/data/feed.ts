// 拖拽喂食：把听到的字拖给对应的 emoji 场景/角色
export interface FeedPair {
  ch: string;
  emoji: string;
  say: string; // 展示用词（给孩子听/家长参考）
}

export const FEED_PAIRS: FeedPair[] = [
  { ch: "日", emoji: "☀️", say: "太阳" },
  { ch: "月", emoji: "🌙", say: "月亮" },
  { ch: "天", emoji: "🌤️", say: "天空" },
  { ch: "山", emoji: "⛰️", say: "大山" },
  { ch: "水", emoji: "💧", say: "水" },
  { ch: "火", emoji: "🔥", say: "火" },
  { ch: "口", emoji: "👄", say: "嘴巴" },
  { ch: "目", emoji: "👀", say: "眼睛" },
  { ch: "耳", emoji: "👂", say: "耳朵" },
  { ch: "手", emoji: "✋", say: "小手" },
  { ch: "足", emoji: "🦶", say: "脚" },
  { ch: "花", emoji: "🌸", say: "花" },
  { ch: "草", emoji: "🌿", say: "小草" },
  { ch: "树", emoji: "🌳", say: "大树" },
  { ch: "鸟", emoji: "🐦", say: "小鸟" },
  { ch: "虫", emoji: "🐛", say: "虫子" },
  { ch: "马", emoji: "🐴", say: "小马" },
  { ch: "牛", emoji: "🐮", say: "小牛" },
  { ch: "羊", emoji: "🐑", say: "小羊" },
  { ch: "兔", emoji: "🐰", say: "兔子" },
  { ch: "星", emoji: "⭐", say: "星星" },
  { ch: "云", emoji: "☁️", say: "白云" },
  { ch: "雨", emoji: "🌧️", say: "下雨" },
  { ch: "风", emoji: "💨", say: "大风" },
  { ch: "人", emoji: "🧍", say: "人" },
  { ch: "心", emoji: "❤️", say: "爱心" },
  { ch: "笑", emoji: "😄", say: "笑" },
  { ch: "乐", emoji: "🎵", say: "音乐" },
  { ch: "好", emoji: "👍", say: "真好" },
  { ch: "爱", emoji: "💖", say: "爱" },
  { ch: "爸", emoji: "👨", say: "爸爸" },
  { ch: "妈", emoji: "👩", say: "妈妈" },
  { ch: "飞", emoji: "🕊️", say: "飞" },
  { ch: "跑", emoji: "🏃", say: "跑步" },
  { ch: "跳", emoji: "🦘", say: "跳" },
  { ch: "吃", emoji: "🥣", say: "吃饭" },
  { ch: "亮", emoji: "💡", say: "亮" },
  { ch: "白", emoji: "🤍", say: "白色" },
];

export const FEED_BY_CHAR = new Map(FEED_PAIRS.map((p) => [p.ch, p]));

