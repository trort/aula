export type Screen = "home" | "quiz" | "result" | "stats";

export interface QuestionOption {
  ch: string;
  isTarget: boolean;
}

export interface Question {
  target: string;
  decoys: string[];
  options: QuestionOption[];
}

export interface AnswerItem {
  ch: string;
  ok: boolean;
  decoy?: string;
}

export interface SessionResult {
  at: number;
  total: number;
  correct: number;
  missed: string[];
}
