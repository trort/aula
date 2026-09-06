// 第一单元"识字基础"的形近干扰配置。
// decoys 可以是本单元/字表内已学的字，也可以是刻意引入的"视觉陷阱"（如 大 的干扰项 太/犬），
// 目的是逼孩子看笔画差异，而不是靠排除"没学过的字"来作答。

export interface CuratedChar {
  ch: string; // 目标字
  py: string; // 普通话读音（孤立语境，供调试/后续数据补全）
  pack: string; // 对应 wordbank JSON 里的 group id
  decoys: string[]; // 形近干扰字，题目从中随机取 2 个
}

export const CURATED: CuratedChar[] = [
  // 识字1 天地人
  { ch: "天", py: "tiān", pack: "s1", decoys: ["大", "夫", "太", "无"] },
  { ch: "地", py: "dì", pack: "s1", decoys: ["他", "也", "池"] },
  { ch: "人", py: "rén", pack: "s1", decoys: ["入", "八", "大", "个"] },
  { ch: "你", py: "nǐ", pack: "s1", decoys: ["他", "们", "体", "您"] },
  { ch: "我", py: "wǒ", pack: "s1", decoys: ["找", "成", "伐", "战"] },
  { ch: "他", py: "tā", pack: "s1", decoys: ["地", "也", "你", "池"] },

  // 识字2 金木水火土
  { ch: "一", py: "yī", pack: "s2", decoys: ["二", "三", "十"] },
  { ch: "二", py: "èr", pack: "s2", decoys: ["一", "三", "土", "干"] },
  { ch: "三", py: "sān", pack: "s2", decoys: ["二", "王", "土"] },
  { ch: "四", py: "sì", pack: "s2", decoys: ["西", "田", "回"] },
  { ch: "五", py: "wǔ", pack: "s2", decoys: ["王", "玉", "正"] },
  { ch: "上", py: "shàng", pack: "s2", decoys: ["下", "土", "止"] },
  { ch: "下", py: "xià", pack: "s2", decoys: ["上", "不", "卡"] },

  // 识字3 口耳目
  { ch: "口", py: "kǒu", pack: "s3", decoys: ["日", "中", "回", "田"] },
  { ch: "耳", py: "ěr", pack: "s3", decoys: ["目", "手", "月", "贝"] },
  { ch: "目", py: "mù", pack: "s3", decoys: ["日", "白", "自", "田"] },
  { ch: "手", py: "shǒu", pack: "s3", decoys: ["毛", "牛", "午", "平"] },
  { ch: "足", py: "zú", pack: "s3", decoys: ["走", "是", "定"] },
  { ch: "站", py: "zhàn", pack: "s3", decoys: ["点", "战", "占"] },
  { ch: "坐", py: "zuò", pack: "s3", decoys: ["从", "众", "座"] },

  // 识字4 日月水火
  { ch: "日", py: "rì", pack: "s4", decoys: ["目", "白", "田", "旦"] },
  { ch: "月", py: "yuè", pack: "s4", decoys: ["用", "目", "朋"] },
  { ch: "水", py: "shuǐ", pack: "s4", decoys: ["小", "永", "冰"] },
  { ch: "火", py: "huǒ", pack: "s4", decoys: ["大", "灭", "木"] },
  { ch: "山", py: "shān", pack: "s4", decoys: ["出", "上", "土"] },
  { ch: "石", py: "shí", pack: "s4", decoys: ["右", "后", "古"] },
  { ch: "田", py: "tián", pack: "s4", decoys: ["日", "由", "甲", "回"] },
  { ch: "禾", py: "hé", pack: "s4", decoys: ["木", "本", "未", "末"] },

  // 识字5 对韵歌
  { ch: "对", py: "duì", pack: "s5", decoys: ["时", "村", "过"] },
  { ch: "云", py: "yún", pack: "s5", decoys: ["去", "会", "元"] },
  { ch: "雨", py: "yǔ", pack: "s5", decoys: ["两", "而", "云"] },
  { ch: "风", py: "fēng", pack: "s5", decoys: ["凤", "几", "飞"] },
  { ch: "花", py: "huā", pack: "s5", decoys: ["草", "华", "朵"] },
  { ch: "鸟", py: "niǎo", pack: "s5", decoys: ["乌", "马", "岛"] },
  { ch: "虫", py: "chóng", pack: "s5", decoys: ["中", "它", "鱼"] },

  // 语文园地一
  { ch: "六", py: "liù", pack: "y1", decoys: ["大", "文", "立"] },
  { ch: "七", py: "qī", pack: "y1", decoys: ["也", "匕", "北"] },
  { ch: "八", py: "bā", pack: "y1", decoys: ["人", "入", "儿"] },
  { ch: "九", py: "jiǔ", pack: "y1", decoys: ["几", "力", "丸"] },
  { ch: "十", py: "shí", pack: "y1", decoys: ["土", "干", "千"] },
];

export const CURATED_PACK_IDS = Array.from(new Set(CURATED.map((c) => c.pack)));

