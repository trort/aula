import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { CorrectBurst, StreakToast } from "./RewardFx";
import { CURATED } from "./data/curated";
import { readingForUnit } from "./data/readings";
import { speak, speakUnit, speakUnitSequence } from "./lib/audio";
import { pickDecoysFor } from "./lib/decoys";
import { randomPraise } from "./lib/rewards";
import { playCorrect, playMilestone, playWrong } from "./lib/sfx";
import type { SessionSummary } from "./lib/storage";
import type { AnswerItem } from "./lib/types";

const ZOO = ["🐻", "🐰", "🐼", "🦊", "🐵", "🐯", "🦁", "🐨"];
const BALLOON_COLORS = ["#ff8fab", "#ffd166", "#7bd389", "#8ecae6", "#c3a5ff", "#ff9f6e"];
const POLY_CHARS = new Set(["兴", "乐"]);

// ---------- 传送带几何 ----------
// 气球都挂在固定的"槽位"上、用同一个速度跑：槽位之间等距，所以永远追不上彼此，不会叠在一起。
// 横向位移交给 .balloon-track 的 transform（走合成层，不触发 layout），比动 left 顺得多。
// 槽位数和气球的尺寸都随赛道宽度走：宽屏多放几只、气球更大；窄屏少放、免得挤。
const SLOT_GAP = 16; // 相邻槽位之间至少留的横向空隙
const BELT_TRAVEL = 1.55; // 一圈跑过的距离（= 1.55 个赛道宽，与 styles.css 的 balloon-drift 一致）
const BELT_CYCLE = 11; // 跑完一圈的秒数；所有气球一致 → 相对位置恒定
const MIN_SLOTS = 3;
const MAX_SLOTS = 6;
const MIN_BALLOON_W = 88;
const MAX_BALLOON_W = 124;
const BALLOON_STRING_H = 34; // 气球下面还要留出绳子/阴影的高度

const balloonWidthFor = (laneWidth: number) =>
  Math.round(
    Math.max(MIN_BALLOON_W, Math.min(MAX_BALLOON_W, laneWidth * 0.175))
  );

const slotCountFor = (laneWidth: number, balloonW: number) =>
  Math.max(
    MIN_SLOTS,
    Math.min(
      MAX_SLOTS,
      Math.floor((laneWidth * BELT_TRAVEL) / (balloonW + SLOT_GAP))
    )
  );

/** 槽位的纵向位置：错开但不排成一条斜线（黄金比打散），且始终留在赛道内 */
const slotSpread = (slot: number) => (slot * 0.6180339887) % 1;

/** 池子里至少留几只"干扰气球"（本句用不到的字）：孩子得在真干扰里找字，不能只有本句的字 */
const decoyQuotaOf = (slots: number) => Math.min(3, Math.max(1, slots - 2));

interface Balloon {
  id: number;
  ch: string;
  /** 挂在哪个槽位（0..slots-1）：决定横向相位与纵向位置 */
  slot: number;
  /** true = 本句用不到的干扰字（区别于"这句里后面的字"） */
  decoy: boolean;
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
  const [lane, setLane] = useState({ w: 600, h: 210 });
  const startedAt = useMemo(() => Date.now(), []);
  const animal = useMemo(() => ZOO[Math.floor(Math.random() * ZOO.length)], []);
  const idRef = useRef(0);
  const laneRef = useRef<HTMLDivElement | null>(null);
  const busyRef = useRef(false);
  const toastTimer = useRef<number | undefined>(undefined);
  const finishTimer = useRef<number | undefined>(undefined);
  const target = chars[pos];

  const balloonW = balloonWidthFor(lane.w);
  const slots = slotCountFor(lane.w, balloonW);
  const laneSpread = Math.max(
    0,
    lane.h - Math.round(balloonW * 1.25) - BALLOON_STRING_H
  );
  const topOf = (slot: number) => Math.round(laneSpread * slotSpread(slot));

  // 赛道尺寸决定能并排放几只气球、气球多大（窄屏少放几只，免得挤在一起）
  useEffect(() => {
    const el = laneRef.current;
    if (!el) return;
    const measure = () => {
      const next = { w: el.clientWidth, h: el.clientHeight };
      setLane((prev) => (prev.w === next.w && prev.h === next.h ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 找到当前字所属的短语（用于整词发音）
  const currentUnit = useMemo(() => {
    let count = 0;
    for (const unit of props.units) {
      if (pos < count + unit.length) return unit;
      count += unit.length;
    }
    return "";
  }, [props.units, pos]);

  // 气球池持续保留：只补充、不清场；被点对的那只会被移除。
  // 每次补气球都按 [目标字 → 干扰气球（保证配额）→ 这句后面的字 → 多余干扰气球] 的顺序补满槽位。
  useEffect(() => {
    if (!target) return;
    const limit = slots;
    setBalloons((prev) => {
      // 槽位变少时（横竖屏切换等）先瘦身：优先留目标字，其次干扰气球；剩下的按槽位重排，不留空档
      let pool = prev;
      if (pool.length > limit) {
        const rank = (b: Balloon) => (b.ch === target ? 0 : b.decoy ? 1 : 2);
        pool = [...pool]
          .sort((a, b) => rank(a) - rank(b) || a.id - b.id)
          .slice(0, limit)
          .sort((a, b) => a.slot - b.slot)
          .map((b, i) => ({ ...b, slot: i }));
      }

      const adds: Array<{ ch: string; decoy: boolean }> = [];
      const used = new Set(pool.map((b) => b.ch));
      const room = () => limit - pool.length - adds.length;
      const decoyCount = () =>
        pool.filter((b) => b.decoy).length + adds.filter((a) => a.decoy).length;
      const take = (list: string[], isDecoy: boolean, enough?: () => boolean) => {
        for (const ch of list) {
          if (room() <= 0 || enough?.()) return;
          if (used.has(ch)) continue;
          used.add(ch);
          adds.push({ ch, decoy: isDecoy });
        }
      };

      const entry = CURATED.find((c) => c.ch === target);
      // 干扰气球不能和目标字同音，否则听到一个音会出现两个"好像都对"的气球
      const decoys = entry
        ? pickDecoysFor(entry, 3, { py: readingForUnit(currentUnit, target)?.py })
        : [];

      if (!used.has(target) && room() > 0) {
        used.add(target);
        adds.push({ ch: target, decoy: false });
      }
      take(decoys, true, () => decoyCount() >= decoyQuotaOf(limit));
      take(chars.slice(pos + 1), false);
      take(decoys, true);
      if (adds.length === 0) return pool;

      // 挑空槽位放新气球：优先放在此刻最靠中间（孩子正看着）的那只空槽
      const now = Date.now();
      const leftOf = (slot: number) =>
        105 - BELT_TRAVEL * 100 * (((now - startedAt) / 1000 / BELT_CYCLE + slot / limit) % 1);
      const taken = new Set(pool.map((b) => b.slot));
      const free = Array.from({ length: limit }, (_, s) => s)
        .filter((s) => !taken.has(s))
        .sort((a, b) => Math.abs(leftOf(a) - 38) - Math.abs(leftOf(b) - 38));
      if (free.length === 0) return pool;

      const added = adds.map((a, i) => ({
        id: ++idRef.current,
        ch: a.ch,
        decoy: a.decoy,
        slot: free[i % free.length],
      }));
      return [...pool, ...added];
    });
  }, [target, chars, pos, currentUnit, slots, startedAt]);

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
        <div
          className="balloon-lane"
          ref={laneRef}
          style={{ "--balloon-w": `${balloonW}px` } as CSSProperties}
        >
          {/* 槽位轨道一直挂着（一起挂、一起跑，队形才等距）：气球只在有内容时出现 */}
          {Array.from({ length: slots }, (_, slot) => {
            const balloon = balloons.find((b) => b.slot === slot) ?? null;
            return (
              <div
                key={`${slots}-${slot}`}
                className="balloon-track"
                style={{
                  animationDelay: `${-(slot / slots) * BELT_CYCLE}s`,
                  animationDuration: `${BELT_CYCLE}s`,
                  top: `${topOf(slot)}px`,
                }}
              >
                {balloon && (
                  <button
                    className="balloon"
                    style={{
                      background: `radial-gradient(circle at 35% 28%, rgba(255,255,255,.75), ${colorFor(balloon.ch)})`,
                    }}
                    onClick={() => tap(balloon)}
                    disabled={!!mood || done}
                  >
                    <span className="balloon-char">{balloon.ch}</span>
                    <span className="balloon-string" />
                  </button>
                )}
              </div>
            );
          })}
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
