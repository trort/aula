import { useMemo, useRef, useState } from "react";
import { speak } from "./lib/audio";
import { fillAnswer, type MathQuestion } from "./lib/mathgen";
import type { SessionSummary } from "./lib/storage";
import type { MathAnswerItem } from "./lib/types";

export default function MathQuizScreen(props: {
  questions: MathQuestion[];
  onFinish: (summary: SessionSummary & { answers: MathAnswerItem[] }) => void;
  onQuit: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [answers, setAnswers] = useState<MathAnswerItem[]>([]);
  const startedAt = useMemo(() => Date.now(), []);
  const lockRef = useRef(false);
  const q = props.questions[idx];

  if (!q) return null;

  const maxLen = String(q.answer).length;
  const isCorrect = confirmed && Number(input) === q.answer;
  const [before, after] = q.text.split("?");

  const typeDigit = (d: string) => {
    if (confirmed) return;
    setInput((prev) => (prev.length >= maxLen ? prev : prev + d));
  };

  const backspace = () => {
    if (confirmed) return;
    setInput((prev) => prev.slice(0, -1));
  };

  const submit = () => {
    if (confirmed || input.length === 0 || lockRef.current) return;
    lockRef.current = true;
    const ok = Number(input) === q.answer;
    setConfirmed(true);
    const nextAnswers: MathAnswerItem[] = [...answers, { level: q.level, ok }];
    const nextCorrect = correctCount + (ok ? 1 : 0);
    const nextMissed = ok ? missed : [...missed, fillAnswer(q)];
    setAnswers(nextAnswers);
    setCorrectCount(nextCorrect);
    setMissed(nextMissed);

    window.setTimeout(() => {
      if (idx + 1 >= props.questions.length) {
        props.onFinish({
          at: startedAt,
          domain: "math",
          total: props.questions.length,
          correct: nextCorrect,
          missed: nextMissed,
          answers: nextAnswers,
        });
      } else {
        setIdx((i) => i + 1);
        setInput("");
        setConfirmed(false);
        lockRef.current = false;
      }
    }, ok ? 650 : 1400);
  };

  return (
    <div className="screen quiz math-fill">
      <div className="quiz-top">
        <button className="link" onClick={props.onQuit}>退出</button>
        <div className="progress">
          {Array.from({ length: props.questions.length }, (_, i) => (
            <span key={i} className={i < idx ? "dot done" : i === idx ? "dot now" : "dot"} />
          ))}
        </div>
        <span className="counter">{idx + 1}/{props.questions.length}</span>
      </div>

      <div className="quiz-body math-body">
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
            {confirmed ? q.answer : input || "?"}
          </span>
          {after}
        </div>

        <button className="btn-speaker" onClick={() => speak(q.speakText)}>
          <span className="speaker-icon">🔊</span>
          <span className="speaker-label">听题</span>
        </button>

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
      </div>

      {confirmed && (
        <div className={isCorrect ? "feedback ok" : "feedback no"}>
          {isCorrect ? "太棒了！" : `正确答案：${q.answer}`}
        </div>
      )}
    </div>
  );
}
