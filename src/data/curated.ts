// 第一单元"识字基础"的形近干扰配置。
// decoys 可以是本单元/字表内已学的字，也可以是刻意引入的"视觉陷阱"（如 大 的干扰项 太/犬），
// 目的是逼孩子看笔画差异，而不是靠排除"没学过的字"来作答。
//
// 注意：decoys 里**可以**写与目标字同音的形近字（如 站/占、坐/座），它们只服务于纯视觉的"找茬"；
// 听音类玩法（听音选字/迷雾寻字/连句喂食）出题时会在 src/lib/decoys.ts 里自动跳过同音干扰项。
// 新增字/干扰字前请先看 docs/content-rules.md，跑 `npm run check:content` 校验。

export interface CuratedChar {
  ch: string; // 目标字
  py: string; // 普通话读音（孤立语境，供调试/后续数据补全）
  pack: string; // 对应 wordbank JSON 里的 group id
  decoys: string[]; // 形近干扰字，题目从中随机取 2 个
}

export const CURATED: CuratedChar[] = [
  // 《四五快读》第一册里教材没有的字（其余 79 字与课本重合，按字共享进度，不重复学）
  { ch: "哭", py: "kū", pack: "swkd1-1", decoys: ["犬", "口", "笑"] },
  { ch: "聪", py: "cōng", pack: "swkd1-3", decoys: ["耳", "明", "心"] },
  { ch: "眉", py: "méi", pack: "swkd1-3", decoys: ["目", "看", "耳"] },
  { ch: "鼻", py: "bí", pack: "swkd1-3", decoys: ["自", "田", "目"] },
  { ch: "唱", py: "chàng", pack: "swkd1-4", decoys: ["口", "喝", "叫"] },
  { ch: "宝", py: "bǎo", pack: "swkd1-5", decoys: ["家", "字", "玉"] },
  { ch: "游", py: "yóu", pack: "swkd1-5", decoys: ["江", "海", "活"] },
  { ch: "习", py: "xí", pack: "swkd1-6", decoys: ["飞", "书", "己"] },
  { ch: "戏", py: "xì", pack: "swkd1-6", decoys: ["又", "我", "找"] },

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

  // ===== 一年级上册（统编版）其余课文 =====
  // 说明：早期做"家长补充字表"时，这些字先收在 x1 里；现在按教材课次归位，
  // 新字条的干扰项按"形近优先、同期/已学优先"挑选（详见 docs/content-rules.md）。

  // 汉语拼音3
  { ch: "爸", py: "bà", pack: "p3", decoys: ["爷", "斧", "巴"] },
  { ch: "妈", py: "mā", pack: "p3", decoys: ["好", "奶", "她"] },

  // 汉语拼音4
  { ch: "马", py: "mǎ", pack: "p4", decoys: ["鸟", "乌", "与"] },
  { ch: "土", py: "tǔ", pack: "p4", decoys: ["十", "王", "干"] },
  { ch: "不", py: "bù", pack: "p4", decoys: ["木", "下", "小"] },

  // 汉语拼音5
  { ch: "画", py: "huà", pack: "p5", decoys: ["田", "由", "甲"] },
  { ch: "打", py: "dǎ", pack: "p5", decoys: ["找", "挂", "手"] },

  // 汉语拼音6
  { ch: "棋", py: "qí", pack: "p6", decoys: ["木", "树", "桃"] },
  { ch: "鸡", py: "jī", pack: "p6", decoys: ["鸟", "鸭", "鸦"] },

  // 汉语拼音7
  { ch: "字", py: "zì", pack: "p7", decoys: ["子", "学", "家"] },
  { ch: "词", py: "cí", pack: "p7", decoys: ["语", "句", "字"] },
  { ch: "语", py: "yǔ", pack: "p7", decoys: ["词", "句", "说"] },
  { ch: "句", py: "jù", pack: "p7", decoys: ["包", "口", "同"] },
  { ch: "子", py: "zǐ", pack: "p7", decoys: ["了", "字", "才"] },

  // 汉语拼音8
  { ch: "桌", py: "zhuō", pack: "p8", decoys: ["早", "果", "木"] },
  { ch: "纸", py: "zhǐ", pack: "p8", decoys: ["红", "绿", "给"] },

  // 语文园地二
  { ch: "文", py: "wén", pack: "y2", decoys: ["六", "又", "大"] },
  { ch: "数", py: "shù", pack: "y2", decoys: ["放", "米", "女"] },
  { ch: "学", py: "xué", pack: "y2", decoys: ["字", "子", "觉"] },
  { ch: "音", py: "yīn", pack: "y2", decoys: ["立", "日", "亮"] },
  { ch: "乐", py: "lè", pack: "y2", decoys: ["东", "车"] },

  // 汉语拼音9
  { ch: "妹", py: "mèi", pack: "p9", decoys: ["奶", "妈", "姐"] },
  { ch: "奶", py: "nǎi", pack: "p9", decoys: ["妹", "妈", "她"] },
  { ch: "白", py: "bái", pack: "p9", decoys: ["日", "目", "百"] },
  { ch: "皮", py: "pí", pack: "p9", decoys: ["友", "发", "又"] },

  // 汉语拼音10
  { ch: "小", py: "xiǎo", pack: "p10", decoys: ["水", "少", "心"] },
  { ch: "桥", py: "qiáo", pack: "p10", decoys: ["木", "树", "校"] },
  { ch: "台", py: "tái", pack: "p10", decoys: ["古", "名", "口"] },

  // 汉语拼音11
  { ch: "雪", py: "xuě", pack: "p11", decoys: ["雨", "雷", "云"] },
  { ch: "儿", py: "ér", pack: "p11", decoys: ["几", "九", "八"] },

  // 汉语拼音12
  { ch: "草", py: "cǎo", pack: "p12", decoys: ["花", "早", "苹"] },
  { ch: "家", py: "jiā", pack: "p12", decoys: ["字", "学", "子"] },
  { ch: "是", py: "shì", pack: "p12", decoys: ["足", "走", "定"] },

  // 汉语拼音13
  { ch: "车", py: "chē", pack: "p13", decoys: ["东", "七", "十"] },
  { ch: "羊", py: "yáng", pack: "p13", decoys: ["半", "美", "关"] },
  { ch: "走", py: "zǒu", pack: "p13", decoys: ["足", "去", "土"] },
  { ch: "也", py: "yě", pack: "p13", decoys: ["他", "地", "池"] },

  // 课文1 秋天
  { ch: "秋", py: "qiū", pack: "k1", decoys: ["禾", "和", "冬"] },
  { ch: "气", py: "qì", pack: "k1", decoys: ["毛", "手", "午"] },
  { ch: "了", py: "le", pack: "k1", decoys: ["子", "于", "才"] },
  { ch: "树", py: "shù", pack: "k1", decoys: ["村", "林", "对"] },
  { ch: "叶", py: "yè", pack: "k1", decoys: ["古", "只", "口"] },
  { ch: "片", py: "piàn", pack: "k1", decoys: ["门", "日", "月"] },
  { ch: "大", py: "dà", pack: "k1", decoys: ["太", "犬", "天"] },
  { ch: "飞", py: "fēi", pack: "k1", decoys: ["风", "习", "凤"] },
  { ch: "会", py: "huì", pack: "k1", decoys: ["云", "金", "全"] },
  { ch: "个", py: "gè", pack: "k1", decoys: ["人", "入", "大"] },

  // 课文2 小小的船
  { ch: "的", py: "de", pack: "k2", decoys: ["白", "勺", "约"] },
  { ch: "船", py: "chuán", pack: "k2", decoys: ["用", "月", "几"] },
  { ch: "两", py: "liǎng", pack: "k2", decoys: ["雨", "西", "而"] },
  { ch: "头", py: "tóu", pack: "k2", decoys: ["大", "买", "兴"] },
  { ch: "在", py: "zài", pack: "k2", decoys: ["土", "王", "正"] },
  { ch: "里", py: "lǐ", pack: "k2", decoys: ["田", "果", "甲"] },
  { ch: "看", py: "kàn", pack: "k2", decoys: ["着", "目", "手"] },
  { ch: "见", py: "jiàn", pack: "k2", decoys: ["贝", "儿", "元"] },
  { ch: "闪", py: "shǎn", pack: "k2", decoys: ["门", "问", "人"] },
  { ch: "星", py: "xīng", pack: "k2", decoys: ["日", "生", "早"] },

  // 课文3 江南
  { ch: "江", py: "jiāng", pack: "k3", decoys: ["海", "池", "水"] },
  { ch: "南", py: "nán", pack: "k3", decoys: ["西", "四", "向"] },
  { ch: "可", py: "kě", pack: "k3", decoys: ["句", "哥", "口"] },
  { ch: "采", py: "cǎi", pack: "k3", decoys: ["彩", "受", "爱"] },
  { ch: "莲", py: "lián", pack: "k3", decoys: ["草", "花", "黄"] },
  { ch: "鱼", py: "yú", pack: "k3", decoys: ["田", "用", "甲"] },
  { ch: "东", py: "dōng", pack: "k3", decoys: ["车", "乐", "七"] },
  { ch: "西", py: "xī", pack: "k3", decoys: ["四", "田", "两"] },
  { ch: "北", py: "běi", pack: "k3", decoys: ["比", "七", "九"] },

  // 课文4 四季
  { ch: "尖", py: "jiān", pack: "k4", decoys: ["小", "大", "尘"] },
  { ch: "说", py: "shuō", pack: "k4", decoys: ["语", "词", "课"] },
  { ch: "春", py: "chūn", pack: "k4", decoys: ["早", "日", "冬"] },
  { ch: "青", py: "qīng", pack: "k4", decoys: ["生", "月", "日"] },
  { ch: "蛙", py: "wā", pack: "k4", decoys: ["虫", "娃", "挂"] },
  { ch: "夏", py: "xià", pack: "k4", decoys: ["是", "反", "冬"] },
  { ch: "弯", py: "wān", pack: "k4", decoys: ["变", "友", "水"] },
  { ch: "就", py: "jiù", pack: "k4", decoys: ["京", "高", "亮"] },
  { ch: "冬", py: "dōng", pack: "k4", decoys: ["冰", "水", "友"] },

  // 语文园地四
  { ch: "男", py: "nán", pack: "y4", decoys: ["田", "力", "里"] },
  { ch: "女", py: "nǚ", pack: "y4", decoys: ["好", "妈", "妹"] },
  { ch: "开", py: "kāi", pack: "y4", decoys: ["天", "大", "无"] },
  { ch: "关", py: "guān", pack: "y4", decoys: ["美", "羊", "天"] },
  { ch: "正", py: "zhèng", pack: "y4", decoys: ["止", "上", "下"] },
  { ch: "反", py: "fǎn", pack: "y4", decoys: ["又", "后", "厂"] },

  // 识字6 画
  { ch: "远", py: "yuǎn", pack: "s6", decoys: ["元", "近", "还"] },
  { ch: "有", py: "yǒu", pack: "s6", decoys: ["右", "月", "友"] },
  { ch: "色", py: "sè", pack: "s6", decoys: ["免", "巴", "兔"] },
  { ch: "近", py: "jìn", pack: "s6", decoys: ["远", "还", "进"] },
  { ch: "听", py: "tīng", pack: "s6", decoys: ["叫", "口", "只"] },
  { ch: "无", py: "wú", pack: "s6", decoys: ["天", "夫", "大"] },
  { ch: "声", py: "shēng", pack: "s6", decoys: ["生", "是", "早"] },
  { ch: "去", py: "qù", pack: "s6", decoys: ["云", "土", "会"] },
  { ch: "还", py: "hái", pack: "s6", decoys: ["远", "近", "不"] },
  { ch: "来", py: "lái", pack: "s6", decoys: ["米", "木", "未"] },

  // 识字7 大小多少
  { ch: "多", py: "duō", pack: "s7", decoys: ["夕", "名", "岁"] },
  { ch: "少", py: "shǎo", pack: "s7", decoys: ["小", "水", "尘"] },
  { ch: "黄", py: "huáng", pack: "s7", decoys: ["草", "田", "果"] },
  { ch: "牛", py: "niú", pack: "s7", decoys: ["午", "生", "半"] },
  { ch: "只", py: "zhī", pack: "s7", decoys: ["口", "贝", "兄"] },
  { ch: "猫", py: "māo", pack: "s7", decoys: ["狗", "毛", "苗"] },
  { ch: "边", py: "biān", pack: "s7", decoys: ["过", "还", "近"] },
  { ch: "鸭", py: "yā", pack: "s7", decoys: ["鸟", "鸡", "鸦"] },
  { ch: "苹", py: "píng", pack: "s7", decoys: ["草", "花", "平"] },
  { ch: "果", py: "guǒ", pack: "s7", decoys: ["田", "木", "里"] },
  { ch: "杏", py: "xìng", pack: "s7", decoys: ["木", "口", "古"] },
  { ch: "桃", py: "táo", pack: "s7", decoys: ["跳", "挑", "逃"] },

  // 识字8 小书包
  { ch: "书", py: "shū", pack: "s8", decoys: ["画", "写", "用"] },
  { ch: "包", py: "bāo", pack: "s8", decoys: ["句", "己", "巴"] },
  { ch: "尺", py: "chǐ", pack: "s8", decoys: ["刀", "人", "八"] },
  { ch: "作", py: "zuò", pack: "s8", decoys: ["昨", "们", "你"] },
  { ch: "业", py: "yè", pack: "s8", decoys: ["山", "小", "水"] },
  { ch: "本", py: "běn", pack: "s8", decoys: ["木", "禾", "末"] },
  { ch: "笔", py: "bǐ", pack: "s8", decoys: ["毛", "竹", "笑"] },
  { ch: "刀", py: "dāo", pack: "s8", decoys: ["力", "办", "九"] },
  { ch: "课", py: "kè", pack: "s8", decoys: ["果", "说", "语"] },
  { ch: "早", py: "zǎo", pack: "s8", decoys: ["日", "草", "十"] },
  { ch: "校", py: "xiào", pack: "s8", decoys: ["木", "桥", "村"] },

  // 识字9 日月明
  { ch: "明", py: "míng", pack: "s9", decoys: ["日", "月", "朋"] },
  { ch: "力", py: "lì", pack: "s9", decoys: ["刀", "办", "九"] },
  { ch: "尘", py: "chén", pack: "s9", decoys: ["小", "土", "尖"] },
  { ch: "从", py: "cóng", pack: "s9", decoys: ["人", "众", "双"] },
  { ch: "众", py: "zhòng", pack: "s9", decoys: ["从", "人", "多"] },
  { ch: "双", py: "shuāng", pack: "s9", decoys: ["又", "叉", "对"] },
  { ch: "木", py: "mù", pack: "s9", decoys: ["禾", "本", "林"] },
  { ch: "林", py: "lín", pack: "s9", decoys: ["木", "森", "村"] },
  { ch: "森", py: "sēn", pack: "s9", decoys: ["林", "木", "众"] },
  { ch: "条", py: "tiáo", pack: "s9", decoys: ["冬", "木", "未"] },
  { ch: "心", py: "xīn", pack: "s9", decoys: ["小", "水", "少"] },

  // 识字10 升国旗
  { ch: "升", py: "shēng", pack: "s10", decoys: ["开", "无", "大"] },
  { ch: "国", py: "guó", pack: "s10", decoys: ["回", "田", "玉"] },
  { ch: "旗", py: "qí", pack: "s10", decoys: ["方", "放", "旁"] },
  { ch: "中", py: "zhōng", pack: "s10", decoys: ["口", "日", "田"] },
  { ch: "红", py: "hóng", pack: "s10", decoys: ["绿", "给", "纸"] },
  { ch: "歌", py: "gē", pack: "s10", decoys: ["哥", "可", "课"] },
  { ch: "起", py: "qǐ", pack: "s10", decoys: ["走", "己", "足"] },
  { ch: "么", py: "me", pack: "s10", decoys: ["公", "去", "云"] },
  { ch: "美", py: "měi", pack: "s10", decoys: ["羊", "关", "半"] },
  { ch: "丽", py: "lì", pack: "s10", decoys: ["两", "雨", "开"] },
  { ch: "立", py: "lì", pack: "s10", decoys: ["六", "文", "音"] },

  // 语文园地五
  { ch: "午", py: "wǔ", pack: "y5", decoys: ["牛", "半", "手"] },
  { ch: "晚", py: "wǎn", pack: "y5", decoys: ["日", "免", "昨"] },
  { ch: "昨", py: "zuó", pack: "y5", decoys: ["作", "晚", "日"] },
  { ch: "今", py: "jīn", pack: "y5", decoys: ["全", "会", "年"] },
  { ch: "年", py: "nián", pack: "y5", decoys: ["午", "牛", "千"] },

  // 课文5 影子
  { ch: "影", py: "yǐng", pack: "k5", decoys: ["京", "亮", "阳"] },
  { ch: "前", py: "qián", pack: "k5", decoys: ["月", "有", "用"] },
  { ch: "后", py: "hòu", pack: "k5", decoys: ["反", "石", "右"] },
  { ch: "黑", py: "hēi", pack: "k5", decoys: ["里", "果", "田"] },
  { ch: "狗", py: "gǒu", pack: "k5", decoys: ["猫", "句", "毛"] },
  { ch: "左", py: "zuǒ", pack: "k5", decoys: ["右", "在", "有"] },
  { ch: "右", py: "yòu", pack: "k5", decoys: ["左", "石", "有"] },
  { ch: "它", py: "tā", pack: "k5", decoys: ["家", "字", "匕"] },
  { ch: "好", py: "hǎo", pack: "k5", decoys: ["妈", "她", "如"] },
  { ch: "朋", py: "péng", pack: "k5", decoys: ["月", "明", "用"] },
  { ch: "友", py: "yǒu", pack: "k5", decoys: ["又", "受", "爱"] },

  // 课文6 比尾巴
  { ch: "比", py: "bǐ", pack: "k6", decoys: ["北", "七", "九"] },
  { ch: "尾", py: "wěi", pack: "k6", decoys: ["毛", "尺", "巴"] },
  { ch: "巴", py: "bā", pack: "k6", decoys: ["爸", "色", "己"] },
  { ch: "谁", py: "shuí", pack: "k6", decoys: ["说", "语", "词"] },
  { ch: "长", py: "cháng", pack: "k6", decoys: ["卡", "车", "七"] },
  { ch: "短", py: "duǎn", pack: "k6", decoys: ["知", "和", "禾"] },
  { ch: "伞", py: "sǎn", pack: "k6", decoys: ["全", "今", "会"] },
  { ch: "兔", py: "tù", pack: "k6", decoys: ["免", "色", "象"] },
  { ch: "最", py: "zuì", pack: "k6", decoys: ["日", "耳", "是"] },
  { ch: "公", py: "gōng", pack: "k6", decoys: ["么", "八", "今"] },

  // 课文7 青蛙写诗
  { ch: "写", py: "xiě", pack: "k7", decoys: ["与", "书", "字"] },
  { ch: "诗", py: "shī", pack: "k7", decoys: ["语", "词", "说"] },
  { ch: "点", py: "diǎn", pack: "k7", decoys: ["占", "立", "黑"] },
  { ch: "要", py: "yào", pack: "k7", decoys: ["西", "女", "果"] },
  { ch: "过", py: "guò", pack: "k7", decoys: ["还", "近", "边"] },
  { ch: "给", py: "gěi", pack: "k7", decoys: ["红", "绿", "纸"] },
  { ch: "当", py: "dāng", pack: "k7", decoys: ["雪", "小", "田"] },
  { ch: "串", py: "chuàn", pack: "k7", decoys: ["中", "口", "虫"] },
  { ch: "们", py: "men", pack: "k7", decoys: ["人", "你", "他"] },
  { ch: "以", py: "yǐ", pack: "k7", decoys: ["从", "人", "己"] },
  { ch: "成", py: "chéng", pack: "k7", decoys: ["我", "找", "在"] },

  // 课文8 雨点儿
  { ch: "彩", py: "cǎi", pack: "k8", decoys: ["采", "受", "爱"] },
  { ch: "半", py: "bàn", pack: "k8", decoys: ["羊", "牛", "午"] },
  { ch: "空", py: "kōng", pack: "k8", decoys: ["工", "它", "家"] },
  { ch: "问", py: "wèn", pack: "k8", decoys: ["门", "闪", "口"] },
  { ch: "到", py: "dào", pack: "k8", decoys: ["前", "全", "金"] },
  { ch: "方", py: "fāng", pack: "k8", decoys: ["放", "旁", "旗"] },
  { ch: "没", py: "méi", pack: "k8", decoys: ["朵", "江", "海"] },
  { ch: "更", py: "gèng", pack: "k8", decoys: ["是", "反", "变"] },
  { ch: "绿", py: "lǜ", pack: "k8", decoys: ["红", "给", "纸"] },
  { ch: "出", py: "chū", pack: "k8", decoys: ["山", "凶", "中"] },

  // 课文9 明天要远足
  { ch: "睡", py: "shuì", pack: "k9", decoys: ["目", "看", "耳"] },
  { ch: "那", py: "nà", pack: "k9", decoys: ["月", "右", "贝"] },
  { ch: "海", py: "hǎi", pack: "k9", decoys: ["江", "没", "水"] },
  { ch: "真", py: "zhēn", pack: "k9", decoys: ["是", "早", "十"] },
  { ch: "老", py: "lǎo", pack: "k9", decoys: ["走", "生", "匕"] },
  { ch: "师", py: "shī", pack: "k9", decoys: ["们", "你", "同"] },
  { ch: "吗", py: "ma", pack: "k9", decoys: ["妈", "马", "鸟"] },
  { ch: "同", py: "tóng", pack: "k9", decoys: ["回", "口", "向"] },
  { ch: "什", py: "shén", pack: "k9", decoys: ["十", "们", "你"] },
  { ch: "才", py: "cái", pack: "k9", decoys: ["子", "了", "千"] },
  { ch: "亮", py: "liàng", pack: "k9", decoys: ["高", "京", "亭"] },

  // 课文10 大还是小
  { ch: "时", py: "shí", pack: "k10", decoys: ["日", "早", "是"] },
  { ch: "候", py: "hòu", pack: "k10", decoys: ["后", "你", "们"] },
  { ch: "觉", py: "jué", pack: "k10", decoys: ["学", "见", "字"] },
  { ch: "得", py: "dé", pack: "k10", decoys: ["很", "时", "日"] },
  { ch: "自", py: "zì", pack: "k10", decoys: ["目", "白", "百"] },
  { ch: "己", py: "jǐ", pack: "k10", decoys: ["起", "巴", "包"] },
  { ch: "很", py: "hěn", pack: "k10", decoys: ["得", "们", "你"] },
  { ch: "穿", py: "chuān", pack: "k10", decoys: ["牙", "空", "它"] },
  { ch: "衣", py: "yī", pack: "k10", decoys: ["六", "文", "大"] },
  { ch: "服", py: "fú", pack: "k10", decoys: ["月", "朋", "用"] },
  { ch: "快", py: "kuài", pack: "k10", decoys: ["块", "决", "怪"] },

  // 课文11 项链
  { ch: "蓝", py: "lán", pack: "k11", decoys: ["草", "花", "黄"] },
  { ch: "又", py: "yòu", pack: "k11", decoys: ["叉", "友", "双"] },
  { ch: "笑", py: "xiào", pack: "k11", decoys: ["笔", "哭", "答"] },
  { ch: "着", py: "zhe", pack: "k11", decoys: ["看", "美", "羊"] },
  { ch: "向", py: "xiàng", pack: "k11", decoys: ["同", "回", "问"] },
  { ch: "和", py: "hé", pack: "k11", decoys: ["禾", "秋", "口"] },
  { ch: "贝", py: "bèi", pack: "k11", decoys: ["见", "目", "人"] },
  { ch: "娃", py: "wá", pack: "k11", decoys: ["蛙", "挂", "女"] },
  { ch: "挂", py: "guà", pack: "k11", decoys: ["娃", "蛙", "找"] },
  { ch: "活", py: "huó", pack: "k11", decoys: ["江", "海", "没"] },
  { ch: "金", py: "jīn", pack: "k11", decoys: ["全", "会", "今"] },

  // 语文园地七
  { ch: "哥", py: "gē", pack: "y7", decoys: ["歌", "可", "句"] },
  { ch: "姐", py: "jiě", pack: "y7", decoys: ["妹", "奶", "妈"] },
  { ch: "弟", py: "dì", pack: "y7", decoys: ["前", "关", "半"] },
  { ch: "叔", py: "shū", pack: "y7", decoys: ["又", "反", "受"] },
  { ch: "爷", py: "yé", pack: "y7", decoys: ["爸", "色", "巴"] },

  // 课文12 雪地里的小画家
  { ch: "群", py: "qún", pack: "k12", decoys: ["羊", "美", "半"] },
  { ch: "竹", py: "zhú", pack: "k12", decoys: ["个", "林", "木"] },
  { ch: "牙", py: "yá", pack: "k12", decoys: ["牛", "午", "穿"] },
  { ch: "用", py: "yòng", pack: "k12", decoys: ["月", "朋", "同"] },
  { ch: "几", py: "jǐ", pack: "k12", decoys: ["九", "儿", "力"] },
  { ch: "步", py: "bù", pack: "k12", decoys: ["少", "止", "走"] },
  { ch: "为", py: "wéi", pack: "k12", decoys: ["办", "力", "九"] },
  { ch: "参", py: "cān", pack: "k12", decoys: ["三", "全", "会"] },
  { ch: "加", py: "jiā", pack: "k12", decoys: ["力", "办", "口"] },
  { ch: "洞", py: "dòng", pack: "k12", decoys: ["同", "江", "海"] },

  // 课文13 乌鸦喝水
  { ch: "乌", py: "wū", pack: "k13", decoys: ["鸟", "马", "与"] },
  { ch: "鸦", py: "yā", pack: "k13", decoys: ["鸟", "鸡", "鸭"] },
  { ch: "处", py: "chù", pack: "k13", decoys: ["冬", "友", "反"] },
  { ch: "找", py: "zhǎo", pack: "k13", decoys: ["我", "成", "打"] },
  { ch: "办", py: "bàn", pack: "k13", decoys: ["为", "力", "刀"] },
  { ch: "旁", py: "páng", pack: "k13", decoys: ["方", "放", "旗"] },
  { ch: "许", py: "xǔ", pack: "k13", decoys: ["午", "语", "词"] },
  { ch: "法", py: "fǎ", pack: "k13", decoys: ["去", "江", "活"] },
  { ch: "放", py: "fàng", pack: "k13", decoys: ["方", "旁", "数"] },
  { ch: "进", py: "jìn", pack: "k13", decoys: ["近", "远", "还"] },
  { ch: "高", py: "gāo", pack: "k13", decoys: ["亮", "京", "亭"] },

  // 课文14 小蜗牛
  { ch: "住", py: "zhù", pack: "k14", decoys: ["们", "你", "他"] },
  { ch: "孩", py: "hái", pack: "k14", decoys: ["子", "字", "学"] },
  { ch: "玩", py: "wán", pack: "k14", decoys: ["王", "玉", "元"] },
  { ch: "吧", py: "ba", pack: "k14", decoys: ["爸", "巴", "呀"] },
  { ch: "发", py: "fā", pack: "k14", decoys: ["友", "皮", "又"] },
  { ch: "芽", py: "yá", pack: "k14", decoys: ["牙", "草", "花"] },
  { ch: "爬", py: "pá", pack: "k14", decoys: ["爸", "巴", "牙"] },
  { ch: "呀", py: "ya", pack: "k14", decoys: ["牙", "吧", "吗"] },
  { ch: "久", py: "jiǔ", pack: "k14", decoys: ["夕", "冬", "友"] },
  { ch: "回", py: "huí", pack: "k14", decoys: ["田", "国", "口"] },
  { ch: "全", py: "quán", pack: "k14", decoys: ["金", "会", "今"] },
  { ch: "变", py: "biàn", pack: "k14", decoys: ["弯", "友", "又"] },

  // 语文园地八
  { ch: "工", py: "gōng", pack: "y8", decoys: ["土", "王", "三"] },
  { ch: "厂", py: "chǎng", pack: "y8", decoys: ["反", "后", "石"] },
  { ch: "医", py: "yī", pack: "y8", decoys: ["日", "目", "田"] },
  { ch: "院", py: "yuàn", pack: "y8", decoys: ["家", "它", "空"] },
  { ch: "生", py: "shēng", pack: "y8", decoys: ["牛", "午", "青"] },

  // 家长补充字表（教材字表里没有的字，保留在最后）
  { ch: "太", py: "tài", pack: "x1", decoys: ["大", "犬", "天"] },
  { ch: "阳", py: "yáng", pack: "x1", decoys: ["日", "明", "阴"] },
  { ch: "吃", py: "chī", pack: "x1", decoys: ["喝", "吹", "叫"] },
  { ch: "爱", py: "ài", pack: "x1", decoys: ["受", "暖", "发"] },
  { ch: "跑", py: "pǎo", pack: "x1", decoys: ["抱", "泡", "包"] },
  { ch: "跳", py: "tiào", pack: "x1", decoys: ["挑", "桃", "逃"] },
  { ch: "兴", py: "xìng", pack: "x1", decoys: ["关", "六", "头"] },
];

export const CURATED_PACK_IDS = Array.from(new Set(CURATED.map((c) => c.pack)));
