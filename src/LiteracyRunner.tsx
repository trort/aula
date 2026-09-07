import { useEffect, useMemo, useRef, useState } from "react";
import FeedBelt from "./FeedBelt";
import ScratchCards from "./ScratchCards";
import { CorrectBurst, StreakToast } from "./RewardFx";
import { speak, speakWord } from "./lib/audio";
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

  const speakPrompt = () => {
    if ((task.kind === "audio" || task.kind === "scratch") && task.sense) {
      speakWord(task.sense.carrier);
    } else {
      speak(task.target);
    }
  };

  useEffect(() => {
    if (!task) return;
    if (task.kind !== "imposter") {
      const timer = window.setTimeout(speakPrompt, 240);
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
    const track = task.kind !== "imposter";
    const itemId =
      (task.kind === "audio" || task.kind === "scratch") && task.sense
        ? task.sense.id
        : task.target;
    const nextAnswers: AnswerItem[] = [
      ...answers,
      { ch: task.target, itemId, ok, decoy: ok ? undefined : decoy, track },
    ];
    const nextCorrect = correctCount + (ok ? 1 : 0);
    const nextMissed = ok || !track ? missed : [...missed, task.target];
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
            <button
              className="btn-speaker"
              onClick={speakPrompt}
            >
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
            <div className="mode-hint">把动物要的字拖进它嘴里</div>
            <FeedBelt
              key={`belt-${idx}`}
              task={task}
              answered={answered}
              isCorrect={isCorrect}
              onAnswer={(ch) => answer(ch, ch === task.target, ch === task.target ? undefined : ch)}
            />
          </>
        )}

        {task.kind === "scratch" && (
          <>
            <div className="mode-hint">刮一刮，找到听到的字</div>
            <button className="btn-speaker" onClick={speakPrompt}>
              <span className="speaker-icon">🔊</span>
              <span className="speaker-label">再听一次</span>
            </button>
            <ScratchCards
              key={`scratch-${idx}`}
              options={task.options}
              answered={answered}
              picked={picked}
              onPick={(ch) => answer(ch, ch === task.target, ch === task.target ? undefined : ch)}
            />
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
