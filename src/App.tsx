import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import bankJson from "../wordbank/grade1-shang-recognition.json";
import { CURATED } from "./data/curated";
import { speak, speechSupported } from "./lib/audio";
import { buildQuestions } from "./lib/quiz";
import {
  addSession,
  dueMs,
  exportState,
  importState,
  loadState,
  persist,
  recordAnswer,
  type AppState,
  type SessionSummary,
} from "./lib/storage";
import type { Question, Screen } from "./lib/types";
import type { AnswerItem } from "./lib/types";

type BankGroup = (typeof bankJson.groups)[number];
type BankJson = typeof bankJson;

const COUNT_OPTIONS = [5, 10, 15];

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [state, setState] = useState<AppState>(() => loadState());
  const [selectedPacks, setSelectedPacks] = useState<string[]>(() =>
    (bankJson as BankJson).groups
      .filter((g) => CURATED.some((c) => c.pack === g.id))
      .map((g) => g.id)
  );
  const [questionCount, setQuestionCount] = useState(10);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [lastResult, setLastResult] = useState<SessionSummary | null>(null);

  useEffect(() => {
    persist(state);
  }, [state]);

  const groups = useMemo(() => (bankJson as BankJson).groups, []);
  const selectableGroups = useMemo(
    () => groups.filter((g) => CURATED.some((c) => c.pack === g.id)),
    [groups]
  );

  const startSession = useCallback(() => {
    const entries = CURATED.filter((c) => selectedPacks.includes(c.pack));
    const priority = new Set(
      Object.entries(state.chars)
        .filter(([ch]) => entries.some((e) => e.ch === ch))
        .filter(([, stat]) => dueMs(stat) <= 0)
        .map(([ch]) => ch)
    );
    const qs = buildQuestions(entries, questionCount, priority);
    if (qs.length === 0) {
      alert("这个字包里能出题的汉字还不够，请多勾选几个字组。");
      return;
    }
    setQuestions(qs);
    setScreen("quiz");
  }, [selectedPacks, questionCount, state.chars]);

  const finishSession = useCallback((summary: SessionSummary & { answers: AnswerItem[] }) => {
    setState((prev) => {
      const next = { ...prev, chars: { ...prev.chars }, sessions: [...prev.sessions] };
      for (const answer of summary.answers) {
        recordAnswer(next, answer.ch, answer.ok, answer.decoy);
      }
      addSession(next, {
        at: summary.at,
        total: summary.total,
        correct: summary.correct,
        missed: summary.missed,
      });
      return next;
    });
    setLastResult({
      at: summary.at,
      total: summary.total,
      correct: summary.correct,
      missed: summary.missed,
    });
    setScreen("result");
  }, []);

  if (screen === "home") {
    return (
      <HomeScreen
        groups={selectableGroups}
        selectedPacks={selectedPacks}
        onTogglePack={(id) =>
          setSelectedPacks((prev) =>
            prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
          )
        }
        questionCount={questionCount}
        onCountChange={setQuestionCount}
        onStart={startSession}
        onOpenStats={() => setScreen("stats")}
        dueCount={Object.values(state.chars).filter((s) => dueMs(s) <= 0).length}
        lastResult={lastResult}
      />
    );
  }

  if (screen === "quiz") {
    return (
      <QuizScreen
        key={String(questions.map((q) => q.target).join(""))}
        questions={questions}
        onFinish={finishSession}
        onQuit={() => setScreen("home")}
      />
    );
  }

  if (screen === "result") {
    return (
      <ResultScreen
        result={lastResult}
        onRestart={startSession}
        onHome={() => setScreen("home")}
      />
    );
  }

  return (
    <StatsScreen
      state={state}
      onBack={() => setScreen("home")}
      onImport={async (file) => {
        try {
          const next = await importState(file);
          setState(next);
          alert("数据已恢复。");
        } catch (err) {
          alert(err instanceof Error ? err.message : "恢复失败，请检查文件。");
        }
      }}
      onExport={() => exportState(state)}
    />
  );
}

function HomeScreen(props: {
  groups: BankGroup[];
  selectedPacks: string[];
  onTogglePack: (id: string) => void;
  questionCount: number;
  onCountChange: (n: number) => void;
  onStart: () => void;
  onOpenStats: () => void;
  dueCount: number;
  lastResult: SessionSummary | null;
}) {
  const available = props.groups.length;
  return (
    <div className="screen home">
      <header className="hero">
        <div className="logo" aria-hidden="true">字</div>
        <h1>识字岛</h1>
        <p className="subtitle">听一听，选出你听到的那个字</p>
      </header>

      {!speechSupported() && (
        <div className="notice">当前浏览器不支持语音朗读，请换用 iPad 的 Safari 或 Chrome。</div>
      )}

      {props.lastResult && (
        <div className="last-result">
          上次：答对 {props.lastResult.correct}/{props.lastResult.total}
          {props.lastResult.missed.length > 0 && (
            <> · 待巩固：{props.lastResult.missed.join(" ")}</>
          )}
        </div>
      )}

      <section className="panel">
        <h2>今天学了哪些字？</h2>
        <div className="chips">
          {props.groups.map((g) => {
            const active = props.selectedPacks.includes(g.id);
            return (
              <button
                key={g.id}
                className={active ? "chip active" : "chip"}
                onClick={() => props.onTogglePack(g.id)}
              >
                {g.title.replace(/^识字\d+ /, "")}
                <span className="chip-count">{g.chars.length}</span>
              </button>
            );
          })}
        </div>
        {props.selectedPacks.length === 0 && (
          <p className="hint">至少要选一组才能开始哦。</p>
        )}
      </section>

      <section className="panel">
        <h2>做几题？</h2>
        <div className="chips">
          {COUNT_OPTIONS.map((n) => (
            <button
              key={n}
              className={props.questionCount === n ? "chip active" : "chip"}
              onClick={() => props.onCountChange(n)}
            >
              {n} 题
            </button>
          ))}
        </div>
      </section>

      <button
        className="btn-start"
        disabled={props.selectedPacks.length === 0}
        onClick={props.onStart}
      >
        开始！
      </button>

      <footer className="home-footer">
        <span>可选字组 {available} 组</span>
        <button className="link" onClick={props.onOpenStats}>
          家长数据{props.dueCount > 0 ? `（${props.dueCount} 字待复习）` : ""}
        </button>
      </footer>
    </div>
  );
}

function QuizScreen(props: {
  questions: Question[];
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
  const q = props.questions[idx];

  const answered = picked !== null;
  const pickedOption = q.options.find((o) => o.ch === picked);
  const isCorrect = answered && pickedOption?.isTarget;

  useEffect(() => {
    if (!q) return;
    const timer = window.setTimeout(() => speak(q.target), 220);
    return () => window.clearTimeout(timer);
  }, [idx, q]);

  if (!q) {
    return null;
  }

  const choose = (ch: string, isTarget: boolean) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setPicked(ch);
    const nextAnswers: AnswerItem[] = [
      ...answers,
      { ch: q.target, ok: isTarget, decoy: isTarget ? undefined : ch },
    ];
    const nextCorrect = correctCount + (isTarget ? 1 : 0);
    const nextMissed = isTarget ? missed : [...missed, q.target];
    setAnswers(nextAnswers);
    setCorrectCount(nextCorrect);
    setMissed(nextMissed);
    window.setTimeout(() => {
      if (idx + 1 >= props.questions.length) {
        props.onFinish({
          at: startedAt,
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
    }, isTarget ? 650 : 1300);
  };

  return (
    <div className="screen quiz">
      <div className="quiz-top">
        <button className="link" onClick={props.onQuit}>
          退出
        </button>
        <div className="progress">
          {Array.from({ length: props.questions.length }, (_, i) => (
            <span
              key={i}
              className={i < idx ? "dot done" : i === idx ? "dot now" : "dot"}
            />
          ))}
        </div>
        <span className="counter">
          {idx + 1}/{props.questions.length}
        </span>
      </div>

      <div className="quiz-body">
        <button className="btn-speaker" onClick={() => speak(q.target)} aria-label="再听一遍">
          <span className="speaker-icon">🔊</span>
          <span className="speaker-label">听一听</span>
        </button>

        <div className="options">
          {q.options.map((opt) => {
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
                onClick={() => choose(opt.ch, opt.isTarget)}
              >
                <span className="hanzi">{opt.ch}</span>
              </button>
            );
          })}
        </div>
      </div>

      {answered && (
        <div className={isCorrect ? "feedback ok" : "feedback no"}>
          {isCorrect ? "太棒了！" : `这个字是“${q.target}”`}
        </div>
      )}
    </div>
  );
}

function ResultScreen(props: {
  result: SessionSummary | null;
  onRestart: () => void;
  onHome: () => void;
}) {
  const r = props.result;
  if (!r) return null;
  const ratio = r.total === 0 ? 0 : r.correct / r.total;
  const stars = ratio >= 0.9 ? "⭐⭐⭐" : ratio >= 0.7 ? "⭐⭐" : "⭐";
  return (
    <div className="screen result">
      <div className="stars">{stars}</div>
      <h1>
        答对 {r.correct} / {r.total}
      </h1>
      <p className="subtitle">
        {ratio >= 0.9
          ? "全都记住了，好厉害！"
          : ratio >= 0.7
            ? "很不错，再复习一下就更棒了！"
            : "没关系，我们明天再来一次！"}
      </p>
      {r.missed.length > 0 && (
        <section className="panel">
          <h2>明天要多看这几个字</h2>
          <div className="missed-chars">
            {r.missed.map((ch) => (
              <button
                key={ch}
                className="mini-card"
                onClick={() => speak(ch)}
                aria-label={`再听一遍 ${ch}`}
              >
                <span className="hanzi">{ch}</span>
              </button>
            ))}
          </div>
          <p className="hint">点一下可以再听一遍发音</p>
        </section>
      )}
      <div className="actions">
        <button className="btn-start" onClick={props.onRestart}>
          再来一轮
        </button>
        <button className="btn-ghost" onClick={props.onHome}>
          回到首页
        </button>
      </div>
    </div>
  );
}

function StatsScreen(props: {
  state: AppState;
  onBack: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}) {
  const [importing, setImporting] = useState(false);
  const rows = Object.entries(props.state.chars)
    .map(([ch, stat]) => ({ ch, stat }))
    .sort((a, b) => {
      const score = (s: { wrong: number; right: number; seenAt: number }) =>
        s.wrong * 100 - s.right + (s.seenAt > 0 ? 1 : 0);
      return score(b.stat) - score(a.stat);
    });
  const due = rows.filter((r) => dueMs(r.stat) <= 0).map((r) => r.ch);

  return (
    <div className="screen stats">
      <header className="stats-head">
        <button className="link" onClick={props.onBack}>
          ← 返回
        </button>
        <h1>家长数据</h1>
      </header>

      <section className="panel">
        <h2>建议今天复习（{due.length} 字）</h2>
        <div className="missed-chars">
          {due.length === 0 ? (
            <p className="hint">今天没有到期的字，很棒！</p>
          ) : (
            due.map((ch) => (
              <button
                key={ch}
                className="mini-card"
                onClick={() => speak(ch)}
                aria-label={`再听一遍 ${ch}`}
              >
                <span className="hanzi">{ch}</span>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="panel">
        <h2>最近练习</h2>
        {props.state.sessions.length === 0 ? (
          <p className="hint">还没有练习记录，先带孩子玩一轮吧。</p>
        ) : (
          <ul className="session-list">
            {props.state.sessions.slice(0, 10).map((s, i) => (
              <li key={i}>
                <span className="session-date">
                  {new Date(s.at).toLocaleDateString("zh-CN")}
                </span>
                <span className={s.correct >= s.total * 0.7 ? "good" : "ok"}>
                  {s.correct}/{s.total}
                </span>
                {s.missed.length > 0 && <span className="session-missed">{s.missed.join(" ")}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>逐字记录（对 / 错 · 连续答对）</h2>
        {rows.length === 0 ? (
          <p className="hint">练过之后这里会出现每个字的掌握情况。</p>
        ) : (
          <div className="char-table">
            {rows.map(({ ch, stat }) => (
              <div key={ch} className="char-row">
                <span className="hanzi">{ch}</span>
                <span className="nums">
                  {stat.right} 对 / {stat.wrong} 错 · 连对 {stat.streak}
                </span>
                {Object.entries(stat.confusion).length > 0 && (
                  <span className="confusion">
                    常错：{Object.entries(stat.confusion).sort((a, b) => b[1] - a[1])[0][0]}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel data-actions">
        <h2>数据备份 / 迁移</h2>
        <p className="hint">数据只存在这台设备上，换设备前请先导出。</p>
        <div className="actions">
          <button className="btn-ghost" onClick={props.onExport}>
            导出 JSON
          </button>
          <label className="btn-ghost file-btn">
            {importing ? "恢复中…" : "导入 JSON"}
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setImporting(true);
                  props.onImport(file);
                  setImporting(false);
                }
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </section>
    </div>
  );
}
