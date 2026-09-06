export type Screen = "home" | "quiz" | "result" | "stats";
export type Domain = "literacy" | "math";

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

export interface MathAnswerItem {
  level: string;
  ok: boolean;
}

export interface SessionResult {
  at: number;
  domain: Domain;
  total: number;
  correct: number;
  missed: string[];
}
