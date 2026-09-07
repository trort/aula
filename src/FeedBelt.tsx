import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { speak } from "./lib/audio";
import type { Task } from "./lib/tasks";

type FeedTask = Extract<Task, { kind: "feed" }>;

export default function FeedBelt(props: {
  task: FeedTask;
  answered: boolean;
  isCorrect: boolean;
  onAnswer: (ch: string) => void;
}) {
  const mouthRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{
    wrap: HTMLDivElement;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (props.answered) return;
    const wrap = e.currentTarget;
    drag.current = {
      wrap,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
    wrap.setPointerCapture(e.pointerId);
    wrap.style.animationPlayState = "paused";
    wrap.classList.add("dragging");
  };

  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) + Math.abs(dy) > 8) d.moved = true;
    d.wrap.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const up = (glyph: string, e: ReactPointerEvent<HTMLDivElement>) => {
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
      props.onAnswer(glyph);
    }
  };

  const foods = props.task.options;
  return (
    <div className="feed-belt-wrap">
      <div className={props.answered ? "belt-lane paused" : "belt-lane"}>
        {foods.map((opt, i) => {
          let cls = "belt-food";
          if (props.answered) {
            if (opt.isTarget) cls += " belt-correct";
          }
          return (
            <div
              key={opt.ch}
              className="belt-item"
              style={{
                animationDuration: `${8 + (i % 3)}s`,
                animationDelay: `${-i * 2.2}s`,
                top: `${20 + ((i * 17) % 45)}%`,
              }}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={(e) => up(opt.ch, e)}
            >
              <button
                className={cls}
                disabled={props.answered}
                tabIndex={-1}
              >
                <span className="hanzi">{opt.ch}</span>
              </button>
            </div>
          );
        })}
      </div>

      <div
        ref={mouthRef}
        className={
          props.answered
            ? props.isCorrect
              ? "feed-mouth eaten"
              : "feed-mouth shake"
            : "feed-mouth"
        }
      >
        <button className="speech-bubble" onClick={() => speak(props.task.target)}>
          <span className="bubble-icon">🔊</span>
          <span className="bubble-text">想吃什么？点我听</span>
        </button>
        <span className="animal">{props.task.animal}</span>
        <span className="mouth-zone" aria-hidden="true" />
      </div>
    </div>
  );
}
