import { useCallback, useEffect, useMemo, useState } from "react";
import bankJson from "../wordbank/grade1-shang-recognition.json";
import LiteracyRunner from "./LiteracyRunner";
import MathQuizScreen from "./MathQuizScreen";
import { CURATED } from "./data/curated";
import { speak, speechSupported } from "./lib/audio";
import { STICKERS, calcSessionReward, nextSticker } from "./lib/rewards";
import {
  focusIndex,
  mastered,
  packProgress,
  pickLessonChars,
  pickMathLevels,
  scoreOf,
  type CharPack,
} from "./lib/progress";
import {
  MATH_LEVELS,
  buildMathQuestions,
} from "./lib/mathgen";
import { buildSessionTasks, type LiteracyMode, type Task } from "./lib/tasks";
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
import type { AnswerItem, Domain, MathAnswerItem, Screen } from "./lib/types";

type BankJson = typeof bankJson;

const COUNT_OPTIONS = [5, 10, 15];
const APP_VERSION = "0.25";

interface LastReward {
  stars: number;
  bestStreak: number;
  perfect: boolean;
  sticker: string;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [domain, setDomain] = useState<Domain>("literacy");
  const [state, setState] = useState<AppState>(() => loadState());
  const [literacyMode, setLiteracyMode] = useState<LiteracyMode>("audio");
  const [questionCount, setQuestionCount] = useState(10);
  const [literacyTasks, setLiteracyTasks] = useState<Task[]>([]);
  const [mathQuestions, setMathQuestions] = useState<ReturnType<typeof buildMathQuestions>>([]);
  const [lastResult, setLastResult] = useState<SessionSummary | null>(null);
  const [lastReward, setLastReward] = useState<LastReward | null>(null);

  useEffect(() => {
    persist(state);
  }, [state]);

  const groups = useMemo(() => (bankJson as BankJson).groups, []);
  const selectableGroups = useMemo(
    () => groups.filter((g) => CURATED.some((c) => c.pack === g.id)),
    [groups]
  );
  const packs = useMemo<CharPack[]>(
    () =>
      selectableGroups.map((g) => ({
        id: g.id,
        title: g.title.replace(/^识字\d+ /, ""),
        chars: CURATED.filter((c) => c.pack === g.id && c.decoys.length >= 2),
      })),
    [selectableGroups]
  );
  const totalChars = packs.reduce((sum, p) => sum + p.chars.length, 0);
  const litPackScores = useMemo(
    () => packs.map((p) => packProgress(p, state.chars)),
    [packs, state.chars]
  );
  const litFocusIdx = useMemo(() => focusIndex(litPackScores), [litPackScores]);
  const litOverallScore = useMemo(() => {
    if (totalChars === 0) return 1;
    const sum = packs.reduce(
      (acc, p) => acc + p.chars.reduce((a, c) => a + scoreOf(state.chars[c.ch]), 0),
      0
    );
    return sum / totalChars;
  }, [packs, state.chars, totalChars]);
  const mathScores = useMemo(
    () => MATH_LEVELS.map((lv) => scoreOf(state.math[lv.id])),
    [state.math]
  );
  const mathFocusIdx = useMemo(() => focusIndex(mathScores), [mathScores]);
  const mathOverallScore = useMemo(() => {
    if (mathScores.length === 0) return 1;
    return mathScores.reduce((a, b) => a + b, 0) / mathScores.length;
  }, [mathScores]);

  const startLiteracy = useCallback(() => {
    const chosen = pickLessonChars(packs, state.chars, questionCount);
    const tasks = buildSessionTasks(literacyMode, chosen, questionCount);
    if (tasks.length === 0) {
      alert("暂时没有可练的字，先让孩子复习一下再开始吧。");
      return;
    }
    setLiteracyTasks(tasks);
    setDomain("literacy");
    setScreen("quiz");
  }, [packs, state.chars, questionCount, literacyMode]);

  const startMath = useCallback(() => {
    const pickedLevels = pickMathLevels(
      MATH_LEVELS.map((lv) => lv.id),
      state.math,
      questionCount
    );
    const qs = buildMathQuestions(pickedLevels, questionCount);
    setMathQuestions(qs);
    setDomain("math");
    setScreen("quiz");
  }, [state.math, questionCount]);

  const finishSession = useCallback(
    (summary: SessionSummary & { answers: AnswerItem[] }) => {
      const reward = calcSessionReward(summary.answers);
      const sticker = nextSticker(state.rewards.stickers.length);
      setState((prev) => {
        const next: AppState = {
          ...prev,
          chars: { ...prev.chars },
          rewards: {
            stars: prev.rewards.stars + reward.stars,
            stickers: [...prev.rewards.stickers, sticker],
            perfect: prev.rewards.perfect + (reward.perfect ? 1 : 0),
          },
          sessions: [...prev.sessions],
        };
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
      setLastReward({
        stars: reward.stars,
        bestStreak: reward.bestStreak,
        perfect: reward.perfect,
        sticker,
      });
      setScreen("result");
    },
    [state.rewards.stickers.length]
  );

  const finishMathSession = useCallback(
    (summary: SessionSummary & { answers: MathAnswerItem[] }) => {
      const reward = calcSessionReward(summary.answers);
      const sticker = nextSticker(state.rewards.stickers.length);
      setState((prev) => {
        const next: AppState = {
          ...prev,
          math: { ...prev.math },
          rewards: {
            stars: prev.rewards.stars + reward.stars,
            stickers: [...prev.rewards.stickers, sticker],
            perfect: prev.rewards.perfect + (reward.perfect ? 1 : 0),
          },
          sessions: [...prev.sessions],
        };
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
      setLastReward({
        stars: reward.stars,
        bestStreak: reward.bestStreak,
        perfect: reward.perfect,
        sticker,
      });
      setScreen("result");
    },
    [state.rewards.stickers.length]
  );

  const goHome = useCallback(() => setScreen("home"), []);

  if (screen === "home") {
    return (
      <HomeScreen
        domain={domain}
        onDomainChange={setDomain}
        stageFocus={
          domain === "math"
            ? MATH_LEVELS[mathFocusIdx].label
            : (packs[litFocusIdx]?.title ?? "")
        }
        stagePct={Math.round(
          (domain === "math" ? mathOverallScore : litOverallScore) * 100
        )}
        stageMeta={
          domain === "math"
            ? `难度 ${mathFocusIdx + 1}/${MATH_LEVELS.length} · 自动进阶`
            : `${packs.length} 个字表 · ${totalChars} 字`
        }
        nextStage={
          domain === "math"
            ? (MATH_LEVELS[mathFocusIdx + 1]?.label ?? null)
            : (packs[litFocusIdx + 1]?.title ?? null)
        }
        startFresh={
          domain === "math" ? mathOverallScore === 0 : litOverallScore === 0
        }
        footerText={
          domain === "math"
            ? `${MATH_LEVELS.length} 档难度 · 自动进阶`
            : `共 ${totalChars} 字 · 自动进阶`
        }
        literacyMode={literacyMode}
        onModeChange={setLiteracyMode}
        questionCount={questionCount}
        onCountChange={setQuestionCount}
        onStart={domain === "math" ? startMath : startLiteracy}
        onOpenStats={() => setScreen("stats")}
        dueCount={
          domain === "math"
            ? Object.values(state.math).filter((s) => dueMs(s) <= 0).length
            : Object.values(state.chars).filter((s) => dueMs(s) <= 0).length
        }
        stars={state.rewards.stars}
        stickerCount={state.rewards.stickers.length}
        perfect={state.rewards.perfect}
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
      <LiteracyRunner
        key={String(literacyTasks.map((t) => t.target).join(""))}
        tasks={literacyTasks}
        onFinish={finishSession}
        onQuit={goHome}
      />
    );
  }

  if (screen === "result") {
    return (
      <ResultScreen
        result={lastResult}
        reward={lastReward}
        onRestart={domain === "math" ? startMath : startLiteracy}
        onHome={goHome}
      />
    );
  }

  return (
    <StatsScreen
      state={state}
      packs={packs}
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
  stageFocus: string;
  stagePct: number;
  stageMeta: string;
  nextStage: string | null;
  startFresh: boolean;
  footerText: string;
  literacyMode: LiteracyMode;
  onModeChange: (m: LiteracyMode) => void;
  questionCount: number;
  onCountChange: (n: number) => void;
  onStart: () => void;
  onOpenStats: () => void;
  dueCount: number;
  stars: number;
  stickerCount: number;
  perfect: number;
  lastResult: SessionSummary | null;
}) {
  const isMath = props.domain === "math";
  const last = props.lastResult && props.lastResult.domain === props.domain ? props.lastResult : null;
  return (
    <div className="screen home">
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

      <div className="reward-strip" aria-label="我的收获">
        <span>⭐ 星星罐 {props.stars}</span>
        <span>贴纸 {props.stickerCount} 张</span>
        <span>🏅 {props.perfect} 次</span>
      </div>

      <section className="panel">
        <h2>自动进阶</h2>
        <div className="stage-card">
          <div className="stage-row">
            <span className="stage-label">当前重点</span>
            <span className="stage-name">{props.stageFocus}</span>
          </div>
          <div className="meter">
            <div className="meter-fill" style={{ width: `${props.stagePct}%` }} />
          </div>
          <div className="stage-meta">
            整体进度 {props.stagePct}% · {props.stageMeta}
          </div>
          {props.nextStage ? (
            <div className="stage-next">
              练稳后会逐渐混入：{props.nextStage}（旧内容会穿插复习）
            </div>
          ) : (
            <div className="stage-next all">各档已练稳，进入综合复习 🎉</div>
          )}
        </div>
      </section>

      {!isMath && (
        <section className="panel">
          <h2>玩哪个游戏？</h2>
          <div className="chips mode-chips">
            <button
              className={props.literacyMode === "audio" ? "chip active" : "chip"}
              onClick={() => props.onModeChange("audio")}
            >
              <span className="chip-title">🎧 听音选字</span>
              <span className="chip-desc">听一听，选出正确的字</span>
            </button>
            <button
              className={props.literacyMode === "imposter" ? "chip active" : "chip"}
              onClick={() => props.onModeChange("imposter")}
            >
              <span className="chip-title">🔍 找茬</span>
              <span className="chip-desc">找出混进来的那个字</span>
            </button>
          </div>
        </section>
      )}

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
        onClick={props.onStart}
      >
        {props.startFresh ? (isMath ? "开始第一关" : "开始第一课") : "继续练习"}
      </button>

      <footer className="home-footer">
        <span>{props.footerText}</span>
        <button className="link" onClick={props.onOpenStats}>
          家长数据{props.dueCount > 0 ? `（${props.dueCount} 项待复习）` : ""}
        </button>
      </footer>
      <span className="version-tag" aria-hidden="true">v{APP_VERSION}</span>
    </div>
  );
}

function ResultScreen(props: {
  result: SessionSummary | null;
  reward: LastReward | null;
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
      {props.reward && (
        <div className="result-reward">
          <div className="reward-gain">
            本轮 +{props.reward.stars} ⭐
            {props.reward.bestStreak >= 3 ? ` · 最高连对 ${props.reward.bestStreak}` : ""}
          </div>
          {props.reward.perfect && <div className="perfect-badge">🏅 全对，完美！</div>}
          <div className="sticker-gain">获得贴纸 {props.reward.sticker}</div>
        </div>
      )}
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
  packs: CharPack[];
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
        <h2>
          收获：⭐ 星星罐 {props.state.rewards.stars} · 🏅 全对 {props.state.rewards.perfect} 次
        </h2>
        <p className="hint">
          贴纸簿：已收集 {props.state.rewards.stickers.length} / {STICKERS.length} 张
        </p>
        {props.state.rewards.stickers.length > 0 ? (
          <div className="missed-chars">
            {props.state.rewards.stickers.map((s, i) => (
              <span key={`${s}-${i}`} className="mini-card sticker-mini">{s}</span>
            ))}
          </div>
        ) : (
          <p className="hint">答对题目攒星星，完成一轮就能收集第一张贴纸啦！</p>
        )}
      </section>

      <section className="panel">
        <h2>识字 · 字表进度</h2>
        {props.packs.map((pack) => {
          const done = pack.chars.filter((c) => mastered(props.state.chars[c.ch])).length;
          const total = pack.chars.length;
          const pct = total === 0 ? 100 : Math.round((done / total) * 100);
          const weak = pack.chars.filter((c) => {
            const stat = props.state.chars[c.ch];
            return !!stat && !mastered(stat);
          });
          return (
            <div key={pack.id} className="bank-block">
              <div className="stage-row">
                <span className="stage-name bank-name">{pack.title}</span>
                <span className="nums">已掌握 {done}/{total}</span>
              </div>
              <div className="meter">
                <div className="meter-fill" style={{ width: `${pct}%` }} />
              </div>
              {weak.length > 0 ? (
                <div className="bank-weak">
                  <span className="bank-weak-label">练过还不熟：</span>
                  {weak.map((c) => (
                    <button
                      key={c.ch}
                      className="weak-char"
                      onClick={() => speak(c.ch)}
                      aria-label={`再听一遍 ${c.ch}`}
                    >
                      {c.ch}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bank-weak">
                  <span className="bank-weak-label">
                    {done === 0 ? "还没开始练这个字表" : "练过的都掌握啦"}
                  </span>
                </div>
              )}
            </div>
          );
        })}
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
