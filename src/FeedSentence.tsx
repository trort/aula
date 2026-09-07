import { useEffect, useMemo, useRef, useState } from "react";
import { CorrectBurst, StreakToast } from "./RewardFx";
import { CURATED } from "./data/curated";
import { readingForUnit } from "./data/readings";
import { speak, speakUnit, speakUnitSequence } from "./lib/audio";
import { randomPraise } from "./lib/rewards";
import { playCorrect, playMilestone, playWrong } from "./lib/sfx";
import type { SessionSummary } from "./lib/storage";
import type { AnswerItem } from "./lib/types";

const ZOO = ["🐻", "🐰", "🐼", "🦊", "🐵", "🐯", "🦁", "🐨"];
const BALLOON_COLORS = ["#ff8fab", "#ffd166", "#7bd389", "#8ecae6", "#c3a5ff", "#ff9f6e"];
const POLY_CHARS = new Set(["兴", "乐"]);

interface Balloon {
  id: number;
  ch: string;
}

export default function FeedSentence(props: {
  sentence: string;
  units: string[];
  onFinish: (summary: SessionSummary & { answers: AnswerItem[] }) => void;
  onQuit: () => void;
}) {
  const chars = useMemo(() => [...props.sentence], [props.sentence]);
  const [pos, setPos] = useState(0);
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [mood, setMood] = useState<"happy" | "sad" | null>(null);
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
  const idRef = useRef(0);
  const busyRef = useRef(false);
  const toastTimer = useRef<number | undefined>(undefined);
  const finishTimer = useRef<number | undefined>(undefined);
  const target = chars[pos];

  // 找到当前字所属的短语（用于整词发音）
  const currentUnit = useMemo(() => {
    let count = 0;
    for (const unit of props.units) {
      if (pos < count + unit.length) return unit;
      count += unit.length;
    }
    return "";
  }, [props.units, pos]);

  // 气球池持续保留：只补充、不清场；被点对的那只会被移除
  useEffect(() => {
    if (!target) return;
    setBalloons((prev) => {
      if (prev.some((b) => b.ch === target)) return prev;
      const future = chars.slice(pos + 1);
      const seen = new Set(prev.map((b) => b.ch));
      const candidates: string[] = [];
      for (const ch of [target, ...future, ...(CURATED.find((c) => c.ch === target)?.decoys ?? [])]) {
        if (!seen.has(ch) && !candidates.includes(ch)) candidates.push(ch);
        if (candidates.length >= 4) break;
      }
      const added = candidates.map((ch) => ({ id: ++idRef.current, ch }));
      return [...prev, ...added];
    });
  }, [target, chars, pos]);

  useEffect(() => {
    if (!target || mood || done) return;
    const request = () => {
      if (currentUnit && [...currentUnit].some((c) => POLY_CHARS.has(c))) {
        speakUnit(currentUnit);
      } else {
        speak(target);
      }
    };
    const first = window.setTimeout(request, 350);
    const timer = window.setInterval(request, 2600);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [target, mood, done, currentUnit]);

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

  const scheduleReadAndFinish = (nc: number, nm: string[], na: AnswerItem[]) => {
    setDone(true);
    setPos(chars.length);
    setBalloons([]);
    speakUnitSequence(props.units);
    finishTimer.current = window.setTimeout(
      () => finish(nc, nm, na),
      props.units.length * 1200 + 1400
    );
  };

  const tap = (balloon: Balloon) => {
    if (busyRef.current || done || !target) return;
    busyRef.current = true;
    const ok = balloon.ch === target;
    const reading = readingForUnit(currentUnit, target);
    const itemId = reading ? reading.id : target;
    const nextAnswers: AnswerItem[] = [
      ...answers,
      { ch: target, itemId, ok, decoy: ok ? undefined : balloon.ch, track: true },
    ];
    const nextCorrect = correctCount + (ok ? 1 : 0);
    const nextMissed =
      ok || missed.includes(target) ? missed : [...missed, target];
    setAnswers(nextAnswers);
    setCorrectCount(nextCorrect);
    setMissed(nextMissed);

    if (!ok) {
      setMood("sad");
      playWrong();
      setStreak(0);
      window.setTimeout(() => {
        setMood(null);
        busyRef.current = false;
      }, 900);
      return;
    }

    setMood("happy");
    setBalloons((prev) => prev.filter((b) => b.id !== balloon.id));
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

    window.setTimeout(() => {
      setMood(null);
      busyRef.current = false;
      if (pos + 1 >= chars.length) {
        scheduleReadAndFinish(nextCorrect, nextMissed, nextAnswers);
      } else {
        setPos((p) => p + 1);
      }
    }, 800);
  };

  const colorFor = (ch: string) =>
    BALLOON_COLORS[ch.charCodeAt(0) % BALLOON_COLORS.length];

  if (!target && !done) return null;
  const displayPos = done ? chars.length : pos;
  const segments: string[] = [];
  {
    let cursor = 0;
    for (const unit of props.units) {
      const end = Math.min(displayPos, cursor + unit.length);
      const take = end - cursor;
      if (take > 0) segments.push(unit.slice(0, take));
      cursor += unit.length;
      if (cursor >= displayPos) break;
    }
  }

  return (
    <div className="screen quiz">
      {mood === "happy" && <CorrectBurst burstId={burstId} />}
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
        {segments.length === 0 ? (
          "……"
        ) : (
          segments.map((seg, i) => (
            <span key={i} className="sentence-chip">{seg}</span>
          ))
        )}
      </div>

      <div className="quiz-body balloon-body">
        <div className="balloon-lane">
          {balloons.map((balloon, i) => (
            <button
              key={balloon.id}
              className="balloon"
              style={{
                animationDuration: `${9 + (i % 3)}s`,
                animationDelay: `${-i * 2.4}s`,
                top: `${18 + ((i * 16) % 42)}%`,
                background: `radial-gradient(circle at 35% 28%, rgba(255,255,255,.75), ${colorFor(balloon.ch)})`,
              }}
              onClick={() => tap(balloon)}
              disabled={!!mood || done}
            >
              <span className="balloon-char">{balloon.ch}</span>
              <span className="balloon-string" />
            </button>
          ))}
        </div>

        <div
          className={
            done
              ? "feed-mouth eaten"
              : mood === "happy"
                ? "feed-mouth happy"
                : mood === "sad"
                  ? "feed-mouth sad"
                  : "feed-mouth"
          }
        >
          {done && <div className="sentence-done">句子拼好啦！🎉</div>}
          {mood === "happy" && <span className="mood-face happy">😋</span>}
          {mood === "sad" && <span className="mood-face sad">🙁</span>}
          <button
            className="speech-bubble"
            onClick={() => {
              if (currentUnit && [...currentUnit].some((c) => POLY_CHARS.has(c))) speakUnit(currentUnit);
              else if (target) speak(target);
            }}
          >
            <span className="bubble-icon">🔊</span>
            <span className="bubble-text">{done ? "再读一遍" : "再说一遍"}</span>
          </button>
          <span className="animal">{animal}</span>
          <span className="mouth-zone" aria-hidden="true" />
        </div>
      </div>

      {mood === "happy" && !done && (
        <div className="feedback ok">⭐ {praise}</div>
      )}
      <StreakToast text={toast} />
    </div>
  );
}
