import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import bankJson from "../wordbank/grade1-shang-recognition.json";
import MathQuizScreen from "./MathQuizScreen";
import { CURATED } from "./data/curated";
import { speak, speechSupported } from "./lib/audio";
import {
  MATH_LEVELS,
  buildMathQuestions,
  type MathLevel,
} from "./lib/mathgen";
import { buildQuestions } from "./lib/quiz";
import {
  addSession,
  dueMs,
  exportState,
  importState,
  loadState,
  persist,
  recordAnswer,
  recordMathAnswer,
  type AppState,
  type SessionSummary,
} from "./lib/storage";
import type { AnswerItem, Domain, MathAnswerItem, Question, Screen } from "./lib/types";

type BankGroup = (typeof bankJson.groups)[number];
type BankJson = typeof bankJson;

const COUNT_OPTIONS = [5, 10, 15];
const DEFAULT_LEVELS: MathLevel[] = ["L1", "L2", "L3"];

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [domain, setDomain] = useState<Domain>("literacy");
  const [state, setState] = useState<AppState>(() => loadState());
  const [selectedPacks, setSelectedPacks] = useState<string[]>(() =>
    (bankJson as BankJson).groups
      .filter((g) => CURATED.some((c) => c.pack === g.id))
      .map((g) => g.id)
  );
  const [levels, setLevels] = useState<MathLevel[]>(DEFAULT_LEVELS);
  const [questionCount, setQuestionCount] = useState(10);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [mathQuestions, setMathQuestions] = useState<ReturnType<typeof buildMathQuestions>>([]);
  const [lastResult, setLastResult] = useState<SessionSummary | null>(null);

  useEffect(() => {
    persist(state);
  }, [state]);

  const groups = useMemo(() => (bankJson as BankJson).groups, []);
  const selectableGroups = useMemo(
    () => groups.filter((g) => CURATED.some((c) => c.pack === g.id)),
    [groups]
  );

  const startLiteracy = useCallback(() => {
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
    setDomain("literacy");
    setScreen("quiz");
  }, [selectedPacks, questionCount, state.chars]);

  const startMath = useCallback(() => {
    if (levels.length === 0) {
      alert("请至少选择一个难度。");
      return;
    }
    const qs = buildMathQuestions(levels, questionCount);
    setMathQuestions(qs);
    setDomain("math");
    setScreen("quiz");
  }, [levels, questionCount]);

  const finishSession = useCallback(
    (summary: SessionSummary & { answers: AnswerItem[] }) => {
      setState((prev) => {
        const next: AppState = { ...prev, chars: { ...prev.chars }, sessions: [...prev.sessions] };
        for (const answer of summary.answers) {
          recordAnswer(next, answer.ch, answer.ok, answer.decoy);
        }
        addSession(next, {
          at: summary.at,
          domain: "literacy",
          total: summary.total,
          correct: summary.correct,
          missed: summary.missed,
        });
        return next;
      });
      setLastResult({
        at: summary.at,
        domain: "literacy",
        total: summary.total,
        correct: summary.correct,
        missed: summary.missed,
      });
      setScreen("result");
    },
    []
  );

  const finishMathSession = useCallback(
    (summary: SessionSummary & { answers: MathAnswerItem[] }) => {
      setState((prev) => {
        const next: AppState = { ...prev, math: { ...prev.math }, sessions: [...prev.sessions] };
        for (const answer of summary.answers) {
          recordMathAnswer(next, answer.level, answer.ok);
        }
        addSession(next, {
          at: summary.at,
          domain: "math",
          total: summary.total,
          correct: summary.correct,
          missed: summary.missed,
        });
        return next;
      });
      setLastResult({
        at: summary.at,
        domain: "math",
        total: summary.total,
        correct: summary.correct,
        missed: summary.missed,
      });
      setScreen("result");
    },
    []
  );

  const goHome = useCallback(() => setScreen("home"), []);

  if (screen === "home") {
    return (
      <HomeScreen
        domain={domain}
        onDomainChange={setDomain}
        groups={selectableGroups}
        selectedPacks={selectedPacks}
        onTogglePack={(id) =>
          setSelectedPacks((prev) =>
            prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
          )
        }
        levels={levels}
        onToggleLevel={(id) =>
          setLevels((prev) =>
            prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
          )
        }
        questionCount={questionCount}
        onCountChange={setQuestionCount}
        onStart={domain === "math" ? startMath : startLiteracy}
        onOpenStats={() => setScreen("stats")}
        dueCount={
          domain === "math"
            ? Object.values(state.math).filter((s) => dueMs(s) <= 0).length
            : Object.values(state.chars).filter((s) => dueMs(s) <= 0).length
        }
        lastResult={lastResult}
      />
    );
  }

  if (screen === "quiz") {
    return domain === "math" ? (
      <MathQuizScreen
        key={String(mathQuestions.length)}
        questions={mathQuestions}
        onFinish={finishMathSession}
        onQuit={goHome}
      />
    ) : (
      <QuizScreen
        key={String(questions.map((q) => q.target).join(""))}
        questions={questions}
        onFinish={finishSession}
        onQuit={goHome}
      />
    );
  }

  if (screen === "result") {
    return (
      <ResultScreen
        result={lastResult}
        onRestart={domain === "math" ? startMath : startLiteracy}
        onHome={goHome}
      />
    );
  }

  return (
    <StatsScreen
      state={state}
      onBack={goHome}
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

function DomainSwitch(props: { domain: Domain; onChange: (d: Domain) => void }) {
  return (
    <div className="domain-switch" role="tablist">
      <button
        role="tab"
        aria-selected={props.domain === "literacy"}
        className={props.domain === "literacy" ? "domain-tab active" : "domain-tab"}
        onClick={() => props.onChange("literacy")}
      >
        <span className="domain-glyph">字</span>
        <span>识字岛</span>
      </button>
      <button
        role="tab"
        aria-selected={props.domain === "math"}
        className={props.domain === "math" ? "domain-tab active" : "domain-tab"}
        onClick={() => props.onChange("math")}
      >
        <span className="domain-glyph">数</span>
        <span>数学岛</span>
      </button>
    </div>
  );
}

function HomeScreen(props: {
  domain: Domain;
  onDomainChange: (d: Domain) => void;
  groups: BankGroup[];
  selectedPacks: string[];
  onTogglePack: (id: string) => void;
  levels: MathLevel[];
  onToggleLevel: (id: MathLevel) => void;
  questionCount: number;
  onCountChange: (n: number) => void;
  onStart: () => void;
  onOpenStats: () => void;
  dueCount: number;
  lastResult: SessionSummary | null;
}) {
  const isMath = props.domain === "math";
  const last = props.lastResult && props.lastResult.domain === props.domain ? props.lastResult : null;
  return (
    <div className="screen home">
      <FullscreenButton />
      <header className="hero">
        <DomainSwitch domain={props.domain} onChange={props.onDomainChange} />
        <div className="logo" aria-hidden="true">{isMath ? "数" : "字"}</div>
        <h1>{isMath ? "数学岛" : "识字岛"}</h1>
        <p className="subtitle">
          {isMath ? "听一听、算一算，选出正确的答案" : "听一听，选出你听到的那个字"}
        </p>
      </header>

      {!isMath && !speechSupported() && (
        <div className="notice">当前浏览器不支持语音朗读，请换用 iPad 的 Safari 或 Chrome。</div>
      )}

      {last && (
        <div className="last-result">
          上次：答对 {last.correct}/{last.total}
          {last.missed.length > 0 && (
            <> · 待巩固：{last.missed.join(" ")}</>
          )}
        </div>
      )}

      <section className="panel">
        <h2>{isMath ? "今天练哪个难度？" : "今天学了哪些字？"}</h2>
        {isMath ? (
          <div className="chips level-chips">
            {MATH_LEVELS.map((lv) => {
              const active = props.levels.includes(lv.id);
              return (
                <button
                  key={lv.id}
                  className={active ? "chip active" : "chip"}
                  onClick={() => props.onToggleLevel(lv.id)}
                >
                  {lv.label}
                  <span className="chip-desc">{lv.desc}</span>
                </button>
              );
            })}
          </div>
        ) : (
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
        )}
        {props.levels.length === 0 && isMath && <p className="hint">至少要选一个难度哦。</p>}
        {props.selectedPacks.length === 0 && !isMath && (
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
        disabled={isMath ? props.levels.length === 0 : props.selectedPacks.length === 0}
        onClick={props.onStart}
      >
        开始！
      </button>

      <footer className="home-footer">
        <span>{isMath ? "难度 L1–L6" : `可选字组 ${props.groups.length} 组`}</span>
        <button className="link" onClick={props.onOpenStats}>
          家长数据{props.dueCount > 0 ? `（${props.dueCount} 项待复习）` : ""}
        </button>
      </footer>
    </div>
  );
}

function FullscreenButton() {
  const supported =
    typeof document !== "undefined" &&
    "fullscreenEnabled" in document &&
    document.fullscreenEnabled === true;
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!supported) return;
    const onChange = () => setActive(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [supported]);

  const toggle = async () => {
    if (!supported) {
      alert(
        "当前浏览器不支持网页全屏。\n\n在 iPad 上请用 Safari 的「分享 → 添加到主屏幕」，之后从主屏幕打开就是全屏模式。"
      );
      return;
    }
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // 用户取消或被系统拒绝时静默
    }
  };

  return (
    <button
      className={active ? "fullscreen-btn active" : "fullscreen-btn"}
      onClick={toggle}
      aria-label={active ? "退出全屏" : "进入全屏"}
    >
      {active ? "⛶ 退出全屏" : "⛶ 全屏"}
    </button>
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

  if (!q) return null;

  const finishOrNext = (nc: number, nm: string[], na: AnswerItem[]) => {
    if (idx + 1 >= props.questions.length) {
      props.onFinish({
        at: startedAt,
        domain: "literacy",
        total: props.questions.length,
        correct: nc,
        missed: nm,
        answers: na,
      });
    } else {
      setIdx((i) => i + 1);
      setPicked(null);
      lockRef.current = false;
    }
  };

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
    // 答对：短暂鼓励后自动进入下一题；答错：等孩子看完正确答案后手动继续
    if (isTarget) {
      window.setTimeout(() => finishOrNext(nextCorrect, nextMissed, nextAnswers), 700);
    }
  };

  const isLast = idx + 1 >= props.questions.length;

  return (
    <div className="screen quiz">
      <div className="quiz-top">
        <button className="link" onClick={props.onQuit}>退出</button>
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

      {answered &&
        (isCorrect ? (
          <div className="feedback ok">太棒了！</div>
        ) : (
          <div className="wrong-actions">
            <div className="feedback no">
              这个字是“<span className="hanzi-inline">{q.target}</span>”
            </div>
            <button
              className="btn-next"
              onClick={() => finishOrNext(correctCount, missed, answers)}
            >
              {isLast ? "看结果 →" : "继续 →"}
            </button>
          </div>
        ))}
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
  const isMath = r.domain === "math";
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
          <h2>{isMath ? "明天要再练这几题" : "明天要多看这几个字"}</h2>
          <div className="missed-chars">
            {r.missed.map((ch) =>
              isMath ? (
                <span key={ch} className="mini-card eq-mini"><span className="eq-mini-text">{ch}</span></span>
              ) : (
                <button
                  key={ch}
                  className="mini-card"
                  onClick={() => speak(ch)}
                  aria-label={`再听一遍 ${ch}`}
                >
                  <span className="hanzi">{ch}</span>
                </button>
              )
            )}
          </div>
          <p className="hint">{isMath ? "点🔊再听题目也行，错了没关系" : "点一下可以再听一遍发音"}</p>
        </section>
      )}
      <div className="actions">
        <button className="btn-start" onClick={props.onRestart}>再来一轮</button>
        <button className="btn-ghost" onClick={props.onHome}>回到首页</button>
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
  const charRows = Object.entries(props.state.chars)
    .map(([ch, stat]) => ({ ch, stat }))
    .sort((a, b) => score(b.stat) - score(a.stat));
  const dueChars = charRows.filter((r) => dueMs(r.stat) <= 0).map((r) => r.ch);

  const mathRows = Object.entries(props.state.math)
    .map(([level, stat]) => ({ level, stat }))
    .sort((a, b) => score(b.stat) - score(a.stat));
  const dueLevels = mathRows
    .filter((r) => dueMs(r.stat) <= 0)
    .map((r) => r.level);
  const levelLabel = (id: string) => MATH_LEVELS.find((l) => l.id === id)?.label ?? id;

  const litSessions = props.state.sessions.filter((s) => s.domain === "literacy");

  return (
    <div className="screen stats">
      <header className="stats-head">
        <button className="link" onClick={props.onBack}>← 返回</button>
        <h1>家长数据</h1>
      </header>

      <section className="panel">
        <h2>建议今天复习（识字 {dueChars.length} 字 · 数学 {dueLevels.length} 项）</h2>
        <div className="missed-chars">
          {dueChars.length === 0 && dueLevels.length === 0 && (
            <p className="hint">今天没有到期的内容，很棒！</p>
          )}
          {dueChars.map((ch) => (
            <button
              key={ch}
              className="mini-card"
              onClick={() => speak(ch)}
              aria-label={`再听一遍 ${ch}`}
            >
              <span className="hanzi">{ch}</span>
            </button>
          ))}
          {dueLevels.map((lv) => (
            <span key={lv} className="mini-card level-mini">{levelLabel(lv)}</span>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>最近练习</h2>
        {props.state.sessions.length === 0 ? (
          <p className="hint">还没有练习记录，先带孩子玩一轮吧。</p>
        ) : (
          <ul className="session-list">
            {props.state.sessions.slice(0, 12).map((s, i) => (
              <li key={i}>
                <span className="session-date">{new Date(s.at).toLocaleDateString("zh-CN")}</span>
                <span className="session-domain">{s.domain === "math" ? "数学" : "识字"}</span>
                <span className={s.correct >= s.total * 0.7 ? "good" : "ok"}>
                  {s.correct}/{s.total}
                </span>
                {s.missed.length > 0 && <span className="session-missed">{s.missed.join(" ")}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {litSessions.length > 0 || charRows.length > 0 ? (
        <section className="panel">
          <h2>识字 · 逐字记录（对 / 错 · 连续答对）</h2>
          {charRows.length === 0 ? (
            <p className="hint">练过之后这里会出现每个字的掌握情况。</p>
          ) : (
            <div className="char-table">
              {charRows.map(({ ch, stat }) => (
                <div key={ch} className="char-row">
                  <span className="hanzi">{ch}</span>
                  <span className="nums">{stat.right} 对 / {stat.wrong} 错 · 连对 {stat.streak}</span>
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
      ) : null}

      {mathRows.length > 0 && (
        <section className="panel">
          <h2>数学 · 各难度掌握情况</h2>
          <div className="char-table">
            {mathRows.map(({ level, stat }) => (
                <div key={level} className="char-row math-row">
                  <span className="level-name">{levelLabel(level)}</span>
                  <span className="nums">{stat.right} 对 / {stat.wrong} 错 · 连对 {stat.streak}</span>
                </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel data-actions">
        <h2>数据备份 / 迁移</h2>
        <p className="hint">数据只存在这台设备上，换设备前请先导出。</p>
        <div className="actions">
          <button className="btn-ghost" onClick={props.onExport}>导出 JSON</button>
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

function score(stat: { wrong: number; right: number; seenAt: number }): number {
  return stat.wrong * 100 - stat.right + (stat.seenAt > 0 ? 1 : 0);
}
