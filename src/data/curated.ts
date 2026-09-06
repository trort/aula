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
  { ch: "我", py: "wǒ", pack: "s1", decoys: ["找", "成", "伐"] },
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
  { ch: "耳", py: "ěr", pack: "s3", decoys: ["目", "月", "贝"] },
  { ch: "目", py: "mù", pack: "s3", decoys: ["日", "白", "自", "田"] },
  { ch: "手", py: "shǒu", pack: "s3", decoys: ["毛", "牛", "午", "平"] },
  { ch: "足", py: "zú", pack: "s3", decoys: ["走", "是", "定"] },
  // 站 = 立 + 占；用“少一边的字形”做干扰，而不是同音的 战
  { ch: "站", py: "zhàn", pack: "s3", decoys: ["占", "点", "立"] },
  { ch: "坐", py: "zuò", pack: "s3", decoys: ["从", "众", "座"] },

  // 识字4 日月水火
  { ch: "日", py: "rì", pack: "s4", decoys: ["目", "白", "田", "旦"] },
  { ch: "月", py: "yuè", pack: "s4", decoys: ["用", "目", "朋"] },
  { ch: "水", py: "shuǐ", pack: "s4", decoys: ["小", "永", "冰"] },
  { ch: "火", py: "huǒ", pack: "s4", decoys: ["大", "灭", "木"] },
  { ch: "山", py: "shān", pack: "s4", decoys: ["出", "凶", "岛"] },
  { ch: "石", py: "shí", pack: "s4", decoys: ["右", "后", "古"] },
  { ch: "田", py: "tián", pack: "s4", decoys: ["日", "由", "甲", "回"] },
  { ch: "禾", py: "hé", pack: "s4", decoys: ["木", "本", "未", "末"] },

  // 识字5 对韵歌
  { ch: "对", py: "duì", pack: "s5", decoys: ["时", "村", "过"] },
  { ch: "云", py: "yún", pack: "s5", decoys: ["去", "会", "元"] },
  { ch: "雨", py: "yǔ", pack: "s5", decoys: ["两", "而", "雷"] },
  { ch: "风", py: "fēng", pack: "s5", decoys: ["凤", "几", "飞"] },
  { ch: "花", py: "huā", pack: "s5", decoys: ["草", "华", "朵"] },
  { ch: "鸟", py: "niǎo", pack: "s5", decoys: ["乌", "马", "岛"] },
  { ch: "虫", py: "chóng", pack: "s5", decoys: ["中", "电"] },

  // 语文园地一
  { ch: "六", py: "liù", pack: "y1", decoys: ["大", "文", "立"] },
  { ch: "七", py: "qī", pack: "y1", decoys: ["也", "匕", "北"] },
  { ch: "八", py: "bā", pack: "y1", decoys: ["人", "入", "儿"] },
  { ch: "九", py: "jiǔ", pack: "y1", decoys: ["几", "力", "丸"] },
  { ch: "十", py: "shí", pack: "y1", decoys: ["土", "干", "千"] },

  // 家长补充字表（已去重：跳过第一单元已收录的字）
  { ch: "两", py: "liǎng", pack: "x1", decoys: ["雨", "西", "而"] },
  { ch: "只", py: "zhī", pack: "x1", decoys: ["口", "贝", "兄"] },
  { ch: "头", py: "tóu", pack: "x1", decoys: ["大", "买", "兴"] },
  { ch: "又", py: "yòu", pack: "x1", decoys: ["叉", "友", "双"] },
  { ch: "了", py: "le", pack: "x1", decoys: ["子", "于", "才"] },
  { ch: "不", py: "bù", pack: "x1", decoys: ["木", "下", "小"] },
  { ch: "大", py: "dà", pack: "x1", decoys: ["太", "犬", "天"] },
  { ch: "小", py: "xiǎo", pack: "x1", decoys: ["水", "少", "心"] },
  { ch: "多", py: "duō", pack: "x1", decoys: ["夕", "名", "岁"] },
  { ch: "少", py: "shǎo", pack: "x1", decoys: ["小", "水", "尘"] },
  { ch: "白", py: "bái", pack: "x1", decoys: ["日", "目", "百"] },
  { ch: "太", py: "tài", pack: "x1", decoys: ["大", "犬", "天"] },
  { ch: "阳", py: "yáng", pack: "x1", decoys: ["日", "明", "阴"] },
  { ch: "亮", py: "liàng", pack: "x1", decoys: ["高", "京", "亭"] },
  { ch: "星", py: "xīng", pack: "x1", decoys: ["日", "生", "早"] },
  { ch: "马", py: "mǎ", pack: "x1", decoys: ["鸟", "乌", "与"] },
  { ch: "牛", py: "niú", pack: "x1", decoys: ["午", "生", "半"] },
  { ch: "羊", py: "yáng", pack: "x1", decoys: ["半", "美", "关"] },
  { ch: "兔", py: "tù", pack: "x1", decoys: ["免", "色", "象"] },
  { ch: "草", py: "cǎo", pack: "x1", decoys: ["花", "早", "苹"] },
  { ch: "树", py: "shù", pack: "x1", decoys: ["村", "林", "对"] },
  { ch: "吃", py: "chī", pack: "x1", decoys: ["喝", "吹", "叫"] },
  { ch: "看", py: "kàn", pack: "x1", decoys: ["着", "目", "手"] },
  { ch: "走", py: "zǒu", pack: "x1", decoys: ["足", "去", "土"] },
  { ch: "笑", py: "xiào", pack: "x1", decoys: ["笔", "哭", "答"] },
  { ch: "来", py: "lái", pack: "x1", decoys: ["米", "木", "未"] },
  { ch: "飞", py: "fēi", pack: "x1", decoys: ["风", "习", "凤"] },
  { ch: "爱", py: "ài", pack: "x1", decoys: ["受", "暖", "发"] },
  { ch: "是", py: "shì", pack: "x1", decoys: ["足", "走", "定"] },
  { ch: "跑", py: "pǎo", pack: "x1", decoys: ["抱", "泡", "包"] },
  { ch: "跳", py: "tiào", pack: "x1", decoys: ["挑", "桃", "逃"] },
  { ch: "高", py: "gāo", pack: "x1", decoys: ["亮", "京", "亭"] },
  { ch: "兴", py: "xìng", pack: "x1", decoys: ["关", "六", "头"] },
  { ch: "快", py: "kuài", pack: "x1", decoys: ["块", "决", "怪"] },
  { ch: "乐", py: "lè", pack: "x1", decoys: ["东", "车"] },
  { ch: "好", py: "hǎo", pack: "x1", decoys: ["妈", "她", "如"] },
  { ch: "的", py: "de", pack: "x1", decoys: ["白", "勺", "约"] },
  { ch: "爸", py: "bà", pack: "x1", decoys: ["爷", "斧", "巴"] },
  { ch: "妈", py: "mā", pack: "x1", decoys: ["好", "奶", "她"] },
];

export const CURATED_PACK_IDS = Array.from(new Set(CURATED.map((c) => c.pack)));
