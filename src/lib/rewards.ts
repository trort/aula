export const STICKERS = [
  "🐶", "🐱", "🐼", "🦊", "🐰", "🐸",
  "🐯", "🦁", "🐨", "🐷", "🐵", "🦄",
];

const MILESTONES = [3, 5, 8];

export interface AnswerOk {
  ok: boolean;
}

export interface SessionReward {
  stars: number; // 答对 1 星 + 连对里程碑奖励星
  bestStreak: number;
  perfect: boolean;
}

export function calcSessionReward(answers: AnswerOk[]): SessionReward {
  let stars = 0;
  let streak = 0;
  let bestStreak = 0;
  for (const a of answers) {
    if (a.ok) {
      streak += 1;
      stars += 1;
      if (MILESTONES.includes(streak)) stars += 1;
      bestStreak = Math.max(bestStreak, streak);
    } else {
      streak = 0;
    }
  }
  return {
    stars,
    bestStreak,
    perfect: answers.length > 0 && answers.every((a) => a.ok),
  };
}

export function nextSticker(collected: number): string {
  return STICKERS[collected % STICKERS.length];
}

export const PRAISES = [
  "太棒了！",
  "好厉害！",
  "答对啦！",
  "真聪明！",
  "眼睛真亮！",
  "小冠军！",
  "真了不起！",
];

export function randomPraise(): string {
  return PRAISES[Math.floor(Math.random() * PRAISES.length)];
}

