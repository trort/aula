import { useMemo, useState } from "react";

/**
 * 超简单的一元一次方程（如 4x + 7 = 31）：加减法小朋友很快就学会了，
 * 解方程则基本不可能；答错就换一道，乱试也没用。答案固定是整数 x。
 */
function makeQuestion(): { text: string; answer: number } {
  const x = 2 + Math.floor(Math.random() * 11); // 2–12
  const a = 2 + Math.floor(Math.random() * 8); // 2–9
  const b = 3 + Math.floor(Math.random() * 23); // 3–25
  const minus = a * x - b;
  if (Math.random() < 0.5 && minus > 0) {
    return { text: `${a}x − ${b} = ${minus}`, answer: x };
  }
  return { text: `${a}x + ${b} = ${a * x + b}`, answer: x };
}

export default function ParentGate(props: { onPass: () => void; onBack: () => void }) {
  const [round, setRound] = useState(0);
  const question = useMemo(() => makeQuestion(), [round]);
  const [value, setValue] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState("");

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed === "") {
      setError("先填上答案");
      return;
    }
    if (Number(trimmed) === question.answer) {
      props.onPass();
      return;
    }
    setAttempts((n) => n + 1);
    setError("答案不对，换一道新题再试");
    setValue("");
    setRound((r) => r + 1);
  };

  return (
    <div className="screen stats">
      <header className="stats-head">
        <button className="link" onClick={props.onBack}>← 返回</button>
        <h1>家长模式</h1>
      </header>

      <section className="panel">
        <p className="hint">
          家长验证题：解出下面方程里的 x 就能进入家长数据页（防止小朋友误点改掉进度）。
        </p>
        <div className="gate-question">{question.text}</div>
        <div className="gate-row">
          <input
            className="gate-input"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            aria-label="答案"
            placeholder="答案"
            value={value}
            onChange={(e) => {
              setValue(e.target.value.replace(/[^0-9]/g, ""));
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
          <button className="btn-start gate-btn" onClick={submit}>
            确定
          </button>
        </div>
        {error && <div className="gate-error">{error}</div>}
        {attempts > 0 && (
          <p className="hint">已尝试 {attempts} 次 · 每次答错都会换一道新题</p>
        )}
      </section>
    </div>
  );
}
