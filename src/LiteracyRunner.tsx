import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { CorrectBurst, StreakToast } from "./RewardFx";
import { speak } from "./lib/audio";
import { randomPraise } from "./lib/rewards";
import { playCorrect, playMilestone, playWrong } from "./lib/sfx";
import type { SessionSummary } from "./lib/storage";
import type { Task } from "./lib/tasks";
import type { AnswerItem } from "./lib/types";

export default function LiteracyRunner(props: {
  tasks: Task[];
  onFinish: (summary: SessionSummary & { answers: AnswerItem[] }) => void;
  onQuit: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [answers, setAnswers] = useState<AnswerItem[]>([]);
  const startedAt = useMemo(() => Date.now(), []);
  const lockRef = useRef(false);
  const [streak, setStreak] = useState(0);
  const [burstId, setBurstId] = useState(0);
  const [praise, setPraise] = useState("太棒了！");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const task = props.tasks[idx];

  const answered = picked !== null;
  const isCorrect = (() => {
    if (!answered) return false;
    if (task.kind === "imposter") return picked === task.odd;
    if (task.kind === "audio") {
      return task.options.find((o) => o.ch === picked)?.isTarget === true;
    }
    return picked === task.target;
  })();

  // 拖拽状态
  const dragRef = useRef<{ ch: string; startX: number; startY: number; dx: number; dy: number } | null>(null);
  const [, forceDrag] = useState(0);
  const dropRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!task) return;
    if (task.kind !== "imposter") {
      const timer = window.setTimeout(() => speak(task.target), 240);
      return () => window.clearTimeout(timer);
    }
  }, [idx, task]);

  if (!task) return null;

  const finishOrNext = (nc: number, nm: string[], na: AnswerItem[]) => {
    if (idx + 1 >= props.tasks.length) {
      props.onFinish({
        at: startedAt,
        domain: "literacy",
        total: props.tasks.length,
        correct: nc,
        missed: nm,
        answers: na,
      });
    } else {
      setIdx((i) => i + 1);
      setPicked(null);
      setToast(null);
      dragRef.current = null;
      lockRef.current = false;
    }
  };

  const celebrate = (ok: boolean) => {
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
    } else {
      playWrong();
      setStreak(0);
    }
  };

  const answer = (chosen: string, ok: boolean, decoy?: string) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setPicked(chosen);
    const nextAnswers: AnswerItem[] = [
      ...answers,
      { ch: task.target, ok, decoy: ok ? undefined : decoy },
    ];
    const nextCorrect = correctCount + (ok ? 1 : 0);
    const nextMissed = ok ? missed : [...missed, task.target];
    setAnswers(nextAnswers);
    setCorrectCount(nextCorrect);
    setMissed(nextMissed);
    celebrate(ok);
    if (ok) {
      window.setTimeout(() => finishOrNext(nextCorrect, nextMissed, nextAnswers), 750);
    }
  };

  const isLast = idx + 1 >= props.tasks.length;
  const feedbackText = (() => {
    if (isCorrect) return praise;
    if (task.kind === "imposter") return `“${task.odd}”混进来了！`;
    if (task.kind === "feed") return `应该把“${task.target}”喂进去`;
    return `这个字是“${task.target}”`;
  })();

  const onCardDown = (ch: string, e: ReactPointerEvent<HTMLButtonElement>) => {
    if (answered || task.kind !== "feed") return;
    dragRef.current = { ch, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    forceDrag((t) => t + 1);
  };
  const onCardMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d) return;
    d.dx = e.clientX - d.startX;
    d.dy = e.clientY - d.startY;
    forceDrag((t) => t + 1);
  };
  const onCardUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    dragRef.current = null;
    forceDrag((t) => t + 1);
    if (!d) return;
    const zone = dropRef.current?.getBoundingClientRect();
    if (
      zone &&
      e.clientX >= zone.left &&
      e.clientX <= zone.right &&
      e.clientY >= zone.top &&
      e.clientY <= zone.bottom
    ) {
      answer(d.ch, d.ch === task.target, d.ch === task.target ? undefined : d.ch);
    }
  };

  return (
    <div className="screen quiz">
      {isCorrect && answered && <CorrectBurst burstId={burstId} />}
      <div className="quiz-top">
        <button className="link" onClick={props.onQuit}>退出</button>
        <div className="progress">
          {Array.from({ length: props.tasks.length }, (_, i) => (
            <span
              key={i}
              className={i < idx ? "dot done" : i === idx ? "dot now" : "dot"}
            />
          ))}
        </div>
        <div className="streak-pill" aria-hidden="true">
          {streak >= 2 ? `🔥 ${streak}` : ""}
        </div>
        <span className="counter">
          {idx + 1}/{props.tasks.length}
        </span>
      </div>

      <div className="quiz-body">
        {task.kind === "audio" && (
          <>
            <button className="btn-speaker" onClick={() => speak(task.target)}>
              <span className="speaker-icon">🔊</span>
              <span className="speaker-label">听一听</span>
            </button>
            <div className="options">
              {task.options.map((opt) => {
                let cls = "card";
                if (answered) {
                  if (opt.isTarget) cls += " card-correct";
                  else if (opt.ch === picked) cls += " card-wrong";
                  else cls += " card-dim";
                }
                return (
                  <button
                    key={opt.ch}
                    className={cls}
                    disabled={answered}
                    onClick={() => answer(opt.ch, opt.isTarget, opt.ch)}
                  >
                    <span className="hanzi">{opt.ch}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {task.kind === "imposter" && (
          <>
            <div className="mode-hint">哪个字混进来了？👀</div>
            <div className={task.options.length === 9 ? "options imposter-options nine" : "options imposter-options"}>
              {task.options.map((glyph, gi) => {
                let cls = "card";
                if (answered) {
                  if (glyph === task.odd) cls += " card-correct";
                  else if (glyph === picked) cls += " card-wrong";
                  else cls += " card-dim";
                }
                return (
                  <button
                    key={`${glyph}-${gi}`}
                    className={cls}
                    disabled={answered}
                    onClick={() => answer(glyph, glyph === task.odd)}
                  >
                    <span className="hanzi">{glyph}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {task.kind === "feed" && (
          <>
            <div className="mode-hint">小动物要这个字，把它拖给它！</div>
            <div ref={dropRef} className={answered && isCorrect ? "drop-zone eaten" : "drop-zone"}>
              <span className="drop-emoji">{task.animal}</span>
              <span className="drop-label">把字拖进来</span>
            </div>
            <button className="btn-speaker" onClick={() => speak(task.target)}>
              <span className="speaker-icon">🔊</span>
              <span className="speaker-label">再听一次</span>
            </button>
            <div className="feed-cards">
              {task.options.map((opt) => {
                let cls = "feed-card";
                if (answered) {
                  if (opt.isTarget) cls += " card-correct";
                  else if (opt.ch === picked) cls += " card-wrong";
                  else cls += " card-dim";
                }
                const d = dragRef.current;
                const dragging = d?.ch === opt.ch;
                return (
                  <button
                    key={opt.ch}
                    className={dragging ? `${cls} dragging` : cls}
                    disabled={answered}
                    style={
                      dragging
                        ? { transform: `translate(${d?.dx ?? 0}px, ${d?.dy ?? 0}px) scale(1.08)` }
                        : undefined
                    }
                    onPointerDown={(e) => onCardDown(opt.ch, e)}
                    onPointerMove={onCardMove}
                    onPointerUp={onCardUp}
                  >
                    <span className="hanzi">{opt.ch}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {answered &&
        (isCorrect ? (
          <div className="feedback ok">⭐ {feedbackText}</div>
        ) : (
          <div className="wrong-actions">
            <div className="feedback no">{feedbackText}</div>
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
