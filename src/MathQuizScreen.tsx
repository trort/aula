import { useMemo, useRef, useState } from "react";
import { CorrectBurst, StreakToast } from "./RewardFx";
import { speakMathTokens } from "./lib/audio";
import {
  MATH_RELATIONS,
  fillAnswer,
  relationSymbol,
  type MathQuestion,
  type MathOperand,
  type MathRelation,
} from "./lib/mathgen";
import { randomPraise } from "./lib/rewards";
import { playCorrect, playMilestone, playWrong } from "./lib/sfx";
import type { SessionSummary } from "./lib/storage";
import type { MathAnswerItem } from "./lib/types";

/** 比大小的两边：算式（"13 + 5"）比单个数字长，字号要小一档 */
function sideClass(side: MathOperand): string {
  return "compare-side" + (side.label.includes(" ") ? " expr" : "");
}

export default function MathQuizScreen(props: {
  questions: MathQuestion[];
  onFinish: (summary: SessionSummary & { answers: MathAnswerItem[] }) => void;
  onQuit: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [picked, setPicked] = useState<MathRelation | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [answers, setAnswers] = useState<MathAnswerItem[]>([]);
  const startedAt = useMemo(() => Date.now(), []);
  const lockRef = useRef(false);
  const [streak, setStreak] = useState(0);
  const [burstId, setBurstId] = useState(0);
  const [praise, setPraise] = useState("太棒了！");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const q = props.questions[idx];

  if (!q) return null;

  const compare = q.form === "compare" ? q : null;
  const fill = q.form === "fill" ? q : null;
  const maxLen = fill ? String(fill.answer).length : 1;
  const isCorrect =
    confirmed &&
    (fill ? Number(input) === fill.answer : !!compare && picked === compare.relation);
  const [before, after] = fill ? fill.text.split("?") : ["", ""];

  const finishOrNext = (nc: number, nm: string[], na: MathAnswerItem[]) => {
    if (idx + 1 >= props.questions.length) {
      props.onFinish({
        at: startedAt,
        domain: "math",
        total: props.questions.length,
        correct: nc,
        missed: nm,
        answers: na,
      });
    } else {
      setIdx((i) => i + 1);
      setInput("");
      setConfirmed(false);
      setPicked(null);
      setToast(null);
      lockRef.current = false;
    }
  };

  const typeDigit = (d: string) => {
    if (confirmed) return;
    setInput((prev) => (prev.length >= maxLen ? prev : prev + d));
  };

  const backspace = () => {
    if (confirmed) return;
    setInput((prev) => prev.slice(0, -1));
  };

  /** 记这一题 + 反馈（填空题、比大小题共用） */
  const settle = (ok: boolean) => {
    lockRef.current = true;
    setConfirmed(true);
    const nextAnswers: MathAnswerItem[] = [...answers, { level: q.level, ok }];
    const nextCorrect = correctCount + (ok ? 1 : 0);
    const nextMissed = ok ? missed : [...missed, fillAnswer(q)];
    setAnswers(nextAnswers);
    setCorrectCount(nextCorrect);
    setMissed(nextMissed);

    // 答对：自动进入下一题；答错：先展示正确答案，孩子确认后再继续
    if (ok) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setPraise(randomPraise());
      setBurstId((id) => id + 1);
      playCorrect(newStreak);
      if (newStreak === 3 || newStreak === 5 || newStreak === 8) {
        playMilestone();
        setToast(`🔥 连对 ${newStreak} 个！+1⭐`);
        if (toastTimer.current) window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(null), 1500);
      }
      window.setTimeout(() => finishOrNext(nextCorrect, nextMissed, nextAnswers), 700);
    } else {
      playWrong();
      setStreak(0);
    }
  };

  const submit = () => {
    if (!fill || confirmed || input.length === 0 || lockRef.current) return;
    settle(Number(input) === fill.answer);
  };

  const pickRelation = (relation: MathRelation) => {
    if (!compare || confirmed || lockRef.current) return;
    setPicked(relation);
    settle(relation === compare.relation);
  };

  const isLast = idx + 1 >= props.questions.length;

  return (
    <div className="screen quiz math-fill">
      {isCorrect && confirmed && <CorrectBurst burstId={burstId} />}
      <div className="quiz-top">
        <button className="link" onClick={props.onQuit}>退出</button>
        <div className="progress">
          {Array.from({ length: props.questions.length }, (_, i) => (
            <span key={i} className={i < idx ? "dot done" : i === idx ? "dot now" : "dot"} />
          ))}
        </div>
        <div className="streak-pill" aria-hidden="true">
          {streak >= 2 ? `🔥 ${streak}` : ""}
        </div>
        <span className="counter">{idx + 1}/{props.questions.length}</span>
      </div>

      <div className="quiz-body math-body">
        {compare ? (
          <>
            <div className="mode-hint">比一比，选一个 👇</div>
            <div className="compare-line">
              <span className={sideClass(compare.left)}>{compare.left.label}</span>
              <span
                className={
                  confirmed
                    ? isCorrect
                      ? "compare-slot right"
                      : "compare-slot wrong"
                    : "compare-slot"
                }
              >
                {confirmed ? relationSymbol(compare.relation) : "?"}
              </span>
              <span className={sideClass(compare.right)}>{compare.right.label}</span>
            </div>
            <div className="compare-choices">
              {MATH_RELATIONS.map((rel) => {
                let cls = "compare-choice";
                if (confirmed) {
                  if (rel.id === compare.relation) cls += " win";
                  else if (rel.id === picked) cls += " miss";
                  else cls += " dim";
                }
                return (
                  <button
                    key={rel.id}
                    className={cls}
                    disabled={confirmed}
                    onClick={() => pickRelation(rel.id)}
                    aria-label={rel.label}
                  >
                    <span className="compare-choice-symbol">{rel.symbol}</span>
                    <span className="compare-choice-word">{rel.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : fill ? (
          <div className="equation-line" aria-live="polite">
            {before}
            <span
              className={
                confirmed
                  ? isCorrect
                    ? "fill-slot right"
                    : "fill-slot wrong"
                  : "fill-slot"
              }
            >
              {confirmed ? fill.answer : input || "?"}
            </span>
            {after}
          </div>
        ) : null}

        <button
          className="btn-speaker"
          onClick={() => speakMathTokens(q.speakTokens, q.speakText)}
        >
          <span className="speaker-icon">🔊</span>
          <span className="speaker-label">听题</span>
        </button>

        {fill && (
          <div className="keypad" aria-label="数字键盘">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
              <button
                key={d}
                className="key"
                disabled={confirmed}
                onClick={() => typeDigit(String(d))}
              >
                {d}
              </button>
            ))}
            <button className="key key-back" disabled={confirmed} onClick={backspace} aria-label="退格">
              ⌫
            </button>
            <button className="key" disabled={confirmed} onClick={() => typeDigit("0")}>
              0
            </button>
            <button
              className="key key-ok"
              disabled={confirmed || input.length === 0}
              onClick={submit}
            >
              确定
            </button>
          </div>
        )}
      </div>

      {confirmed &&
        (isCorrect ? (
          <div className="feedback ok">⭐ {praise}</div>
        ) : (
          <div className="wrong-actions">
            <div className="feedback no">
              {compare
                ? `正确答案：${fillAnswer(compare)}`
                : `正确答案：${fill?.answer ?? ""}`}
            </div>
            <button
              className="btn-next"
              onClick={() => finishOrNext(correctCount, missed, answers)}
            >
              {isLast ? "看结果 →" : "继续 →"}
            </button>
          </div>
        ))}
      <StreakToast text={toast} />
    </div>
  );
}
