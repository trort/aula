import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { CorrectBurst, StreakToast } from "./RewardFx";
import { CURATED } from "./data/curated";
import { speak } from "./lib/audio";
import { randomPraise } from "./lib/rewards";
import { playCorrect, playMilestone, playWrong } from "./lib/sfx";
import type { SessionSummary } from "./lib/storage";
import type { AnswerItem } from "./lib/types";

const ZOO = ["🐻", "🐰", "🐼", "🦊", "🐵", "🐯", "🦁", "🐨"];

function shuffle<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function FeedSentence(props: {
  sentence: string;
  onFinish: (summary: SessionSummary & { answers: AnswerItem[] }) => void;
  onQuit: () => void;
}) {
  const chars = useMemo(() => [...props.sentence], [props.sentence]);
  const [pos, setPos] = useState(0);
  const [last, setLast] = useState<{ ok: boolean } | null>(null);
  const [answers, setAnswers] = useState<AnswerItem[]>([]);
  const [missed, setMissed] = useState<string[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [burstId, setBurstId] = useState(0);
  const [praise, setPraise] = useState("太棒了！");
  const [toast, setToast] = useState<string | null>(null);
  const startedAt = useMemo(() => Date.now(), []);
  const animal = useMemo(() => ZOO[Math.floor(Math.random() * ZOO.length)], []);
  const mouthRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ wrap: HTMLDivElement; startX: number; startY: number } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const target = chars[pos];

  const options = useMemo(() => {
    if (!target) return [];
    const remaining = chars.slice(pos + 1);
    const pool = new Set<string>([target, ...remaining.slice(0, 2)]);
    const entry = CURATED.find((c) => c.ch === target);
    if (entry) {
      for (const dec of shuffle(entry.decoys)) {
        if (pool.size >= 4) break;
        pool.add(dec);
      }
    }
    return shuffle([...pool]);
  }, [target, chars, pos]);

  // 每 2.4 秒自动重复要的字；答错等待时暂停
  useEffect(() => {
    if (!target || last) return;
    const first = window.setTimeout(() => speak(target), 350);
    const timer = window.setInterval(() => speak(target), 2400);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [target, last]);

  const finish = (
    nc: number,
    nm: string[],
    na: AnswerItem[]
  ) => {
    props.onFinish({
      at: startedAt,
      domain: "literacy",
      total: chars.length,
      correct: nc,
      missed: nm,
      answers: na,
    });
  };

  const advance = (nc: number, nm: string[], na: AnswerItem[]) => {
    setLast(null);
    if (pos + 1 >= chars.length) {
      finish(nc, nm, na);
    } else {
      setPos((p) => p + 1);
    }
  };

  const feed = (ch: string) => {
    if (last || !target) return;
    const ok = ch === target;
    const nextAnswers: AnswerItem[] = [
      ...answers,
      { ch: target, ok, decoy: ok ? undefined : ch },
    ];
    const nextCorrect = correctCount + (ok ? 1 : 0);
    const nextMissed = ok ? missed : [...missed, target];
    setAnswers(nextAnswers);
    setCorrectCount(nextCorrect);
    setMissed(nextMissed);
    setLast({ ok });

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
      window.setTimeout(() => advance(nextCorrect, nextMissed, nextAnswers), 800);
    } else {
      playWrong();
      setStreak(0);
    }
  };

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (last) return;
    const wrap = e.currentTarget;
    drag.current = { wrap, startX: e.clientX, startY: e.clientY };
    wrap.setPointerCapture(e.pointerId);
    wrap.style.animationPlayState = "paused";
    wrap.classList.add("dragging");
  };
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    d.wrap.style.transform = `translate(${e.clientX - d.startX}px, ${e.clientY - d.startY}px)`;
  };
  const up = (ch: string, e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    d.wrap.style.transform = "";
    d.wrap.classList.remove("dragging");
    d.wrap.style.animationPlayState = "running";
    const mouth = mouthRef.current?.getBoundingClientRect();
    if (
      mouth &&
      e.clientX >= mouth.left &&
      e.clientX <= mouth.right &&
      e.clientY >= mouth.top &&
      e.clientY <= mouth.bottom
    ) {
      feed(ch);
    }
  };

  if (!target) return null;

  return (
    <div className="screen quiz">
      {last?.ok && <CorrectBurst burstId={burstId} />}
      <div className="quiz-top">
        <button className="link" onClick={props.onQuit}>退出</button>
        <div className="progress">
          {chars.map((_, i) => (
            <span key={i} className={i < pos ? "dot done" : i === pos ? "dot now" : "dot"} />
          ))}
        </div>
        <div className="streak-pill" aria-hidden="true">
          {streak >= 2 ? `🔥 ${streak}` : ""}
        </div>
        <span className="counter">{pos + 1}/{chars.length}</span>
      </div>

      <div className="quiz-body">
        <div className="mode-hint">按顺序把字喂给它（已喂 {pos} 个）</div>
        <div className="belt-lane">
          {options.map((ch, i) => {
            let cls = "belt-food";
            if (last && ch === target) cls += " belt-correct";
            return (
              <div
                key={`${ch}-${i}`}
                className="belt-item"
                style={{
                  animationDuration: `${8 + (i % 3)}s`,
                  animationDelay: `${-i * 2.2}s`,
                  top: `${24 + ((i * 17) % 40)}%`,
                }}
                onPointerDown={down}
                onPointerMove={move}
                onPointerUp={(e) => up(ch, e)}
              >
                <button className={cls} tabIndex={-1}>
                  <span className="hanzi">{ch}</span>
                </button>
              </div>
            );
          })}
        </div>

        <div
          ref={mouthRef}
          className={last ? (last.ok ? "feed-mouth eaten" : "feed-mouth shake") : "feed-mouth"}
        >
          <button className="speech-bubble" onClick={() => speak(target)}>
            <span className="bubble-icon">🔊</span>
            <span className="bubble-text">再说一遍</span>
          </button>
          <span className="animal">{animal}</span>
          <span className="mouth-zone" aria-hidden="true" />
        </div>
      </div>

      {last &&
        (last.ok ? (
          <div className="feedback ok">⭐ {praise}</div>
        ) : (
          <div className="wrong-actions">
            <div className="feedback no">“{target}”才是它要的字</div>
            <button
              className="btn-next"
              onClick={() => advance(correctCount, missed, answers)}
            >
              {pos + 1 >= chars.length ? "看结果 →" : "继续 →"}
            </button>
          </div>
        ))}
      <StreakToast text={toast} />
    </div>
  );
}

