import { useEffect, useMemo, useRef, useState } from "react";
import { speak } from "./lib/audio";
import { fillAnswer, speakFilled, type MathQuestion } from "./lib/mathgen";
import type { SessionSummary } from "./lib/storage";
import type { MathAnswerItem } from "./lib/types";

export default function MathQuizScreen(props: {
  questions: MathQuestion[];
  onFinish: (summary: SessionSummary & { answers: MathAnswerItem[] }) => void;
  onQuit: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [answers, setAnswers] = useState<MathAnswerItem[]>([]);
  const startedAt = useMemo(() => Date.now(), []);
  const lockRef = useRef(false);
  const q = props.questions[idx];

  const answered = picked !== null;
  const isCorrect = answered && picked === q.answer;

  useEffect(() => {
    if (!q) return;
    const timer = window.setTimeout(() => speak(q.speakText), 180);
    return () => window.clearTimeout(timer);
  }, [idx, q]);

  if (!q) return null;

  const choose = (value: number) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setPicked(value);
    const ok = value === q.answer;
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
        setPicked(null);
        lockRef.current = false;
      }
    }, ok ? 650 : 1400);
  };

  return (
    <div className="screen quiz">
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
          {answered ? fillAnswer(q) : q.text}
        </div>
        <button className="btn-speaker" onClick={() => speak(answered ? speakFilled(q) : q.speakText)}>
          <span className="speaker-icon">🔊</span>
          <span className="speaker-label">{answered ? "再听答案" : "听一听"}</span>
        </button>

        <div className="num-options">
          {q.options.map((value) => {
            let cls = "num-card";
            if (answered) {
              if (value === q.answer) cls += " card-correct";
              else if (value === picked) cls += " card-wrong";
              else cls += " card-dim";
            }
            return (
              <button
                key={value}
                className={cls}
                disabled={answered}
                onClick={() => choose(value)}
              >
                <span className="num">{value}</span>
              </button>
            );
          })}
        </div>
      </div>

      {answered && (
        <div className={isCorrect ? "feedback ok" : "feedback no"}>
          {isCorrect ? "太棒了！" : `正确答案：${q.answer}`}
        </div>
      )}
    </div>
  );
}
