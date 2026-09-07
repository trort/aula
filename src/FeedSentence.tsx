import { useEffect, useMemo, useRef, useState } from "react";
import { CorrectBurst, StreakToast } from "./RewardFx";
import { CURATED } from "./data/curated";
import { speak, speakCharSequence } from "./lib/audio";
import { randomPraise } from "./lib/rewards";
import { playCorrect, playMilestone, playWrong } from "./lib/sfx";
import type { SessionSummary } from "./lib/storage";
import type { AnswerItem } from "./lib/types";

const ZOO = ["🐻", "🐰", "🐼", "🦊", "🐵", "🐯", "🦁", "🐨"];
const BALLOON_COLORS = [
  "#ff8fab",
  "#ffd166",
  "#7bd389",
  "#8ecae6",
  "#c3a5ff",
  "#ff9f6e",
];

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
  const [done, setDone] = useState(false);
  const [answers, setAnswers] = useState<AnswerItem[]>([]);
  const [missed, setMissed] = useState<string[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [burstId, setBurstId] = useState(0);
  const [praise, setPraise] = useState("太棒了！");
  const [toast, setToast] = useState<string | null>(null);
  const startedAt = useMemo(() => Date.now(), []);
  const animal = useMemo(() => ZOO[Math.floor(Math.random() * ZOO.length)], []);
  const toastTimer = useRef<number | undefined>(undefined);
  const finishTimer = useRef<number | undefined>(undefined);

  const target = chars[pos];

  const balloons = useMemo(() => {
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

  useEffect(() => {
    if (!target || last || done) return;
    const first = window.setTimeout(() => speak(target), 350);
    const timer = window.setInterval(() => speak(target), 2600);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [target, last, done]);

  useEffect(
    () => () => {
      if (finishTimer.current) window.clearTimeout(finishTimer.current);
    },
    []
  );

  const finish = (nc: number, nm: string[], na: AnswerItem[]) => {
    props.onFinish({
      at: startedAt,
      domain: "literacy",
      total: chars.length,
      correct: nc,
      missed: nm,
      answers: na,
    });
  };

  const scheduleReadAndFinish = (
    nc: number,
    nm: string[],
    na: AnswerItem[]
  ) => {
    setDone(true);
    speakCharSequence(chars);
    finishTimer.current = window.setTimeout(
      () => finish(nc, nm, na),
      chars.length * 700 + 900
    );
  };

  const pick = (ch: string) => {
    if (last || done || !target) return;
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

    if (!ok) {
      playWrong();
      setStreak(0);
      return;
    }

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

    if (pos + 1 >= chars.length) {
      scheduleReadAndFinish(nextCorrect, nextMissed, nextAnswers);
      return;
    }
    window.setTimeout(() => {
      setPos((p) => p + 1);
      setLast(null);
    }, 800);
  };

  const colorFor = (ch: string) =>
    BALLOON_COLORS[ch.charCodeAt(0) % BALLOON_COLORS.length];

  if (!target) return null;
  const fedSoFar = chars.slice(0, pos).join("");

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

      <div className="sentence-board" aria-live="polite">
        {fedSoFar.length > 0 ? fedSoFar : "……"}
      </div>

      <div className="quiz-body balloon-body">
        <div className="balloon-lane">
          {balloons.map((ch, i) => (
            <button
              key={`${ch}-${i}`}
              className="balloon"
              style={{
                animationDuration: `${9 + (i % 3)}s`,
                animationDelay: `${-i * 2.4}s`,
                top: `${20 + ((i * 16) % 40)}%`,
                background: `radial-gradient(circle at 35% 28%, rgba(255,255,255,.75), ${colorFor(ch)})`,
              }}
              onClick={() => pick(ch)}
              disabled={!!last || done}
            >
              <span className="balloon-char">{ch}</span>
              <span className="balloon-string" />
            </button>
          ))}
        </div>

        <div
          className={
            done
              ? "feed-mouth eaten"
              : last
                ? last.ok
                  ? "feed-mouth eaten"
                  : "feed-mouth shake"
                : "feed-mouth"
          }
        >
          {done ? (
            <>
              <div className="sentence-done">句子拼好啦！🎉</div>
              <button className="speech-bubble" onClick={() => speakCharSequence(chars)}>
                <span className="bubble-icon">🔊</span>
                <span className="bubble-text">再读一遍</span>
              </button>
            </>
          ) : (
            <button className="speech-bubble" onClick={() => speak(target)}>
              <span className="bubble-icon">🔊</span>
              <span className="bubble-text">再说一遍</span>
            </button>
          )}
          <span className="animal">{animal}</span>
          <span className="mouth-zone" aria-hidden="true" />
        </div>
      </div>

      {last &&
        !done &&
        (last.ok ? (
          <div className="feedback ok">⭐ {praise}</div>
        ) : (
          <div className="wrong-actions">
            <div className="feedback no">“{target}”才是它要的字</div>
            <button
              className="btn-next"
              onClick={() => {
                setLast(null);
                if (pos + 1 >= chars.length) {
                  scheduleReadAndFinish(correctCount, missed, answers);
                } else {
                  setPos((p) => p + 1);
                }
              }}
            >
              {pos + 1 >= chars.length ? "听整句 →" : "继续 →"}
            </button>
          </div>
        ))}
      <StreakToast text={toast} />
    </div>
  );
}

