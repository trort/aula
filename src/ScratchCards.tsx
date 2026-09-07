import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

interface Card {
  ch: string;
  isTarget: boolean;
}

export default function ScratchCards(props: {
  options: Card[];
  answered: boolean;
  picked: string | null;
  onPick: (ch: string) => void;
}) {
  const [scratched, setScratched] = useState<Record<string, Array<{ x: number; y: number }>>>({});
  const wrapRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scratch = (ch: string, e: ReactPointerEvent<HTMLDivElement>) => {
    if (props.answered) return;
    const wrap = wrapRefs.current[ch];
    if (!wrap) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = wrap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setScratched((prev) => ({
      ...prev,
      [ch]: [...(prev[ch] ?? []), { x, y }],
    }));
  };

  const maskFor = (ch: string): string | undefined => {
    const circles = scratched[ch];
    if (!circles || circles.length === 0) return undefined;
    return circles
      .map((c) => `radial-gradient(circle 92px at ${c.x}px ${c.y}px, transparent 66%, #000 67%)`)
      .join(", ");
  };

  return (
    <div className="scratch-grid">
      {props.options.map((opt) => {
        const hasScratched = (scratched[opt.ch]?.length ?? 0) > 0;
        let cls = "scratch-card";
        if (props.answered) {
          if (opt.isTarget) cls += " scratch-correct";
          else if (opt.ch === props.picked) cls += " scratch-wrong";
        }
        return (
          <div
            key={opt.ch}
            ref={(el) => {
              wrapRefs.current[opt.ch] = el;
            }}
            className={cls}
          >
            <span className="hanzi">{opt.ch}</span>
            <div
              className={props.answered ? "scratch-mask revealed" : "scratch-mask"}
              style={maskFor(opt.ch) ? { maskImage: maskFor(opt.ch), WebkitMaskImage: maskFor(opt.ch) } : undefined}
              onPointerDown={(e) => scratch(opt.ch, e)}
              onPointerMove={(e) => {
                if (e.buttons > 0) scratch(opt.ch, e);
              }}
            >
              <span className="mask-frost">✨</span>
            </div>
            {hasScratched && !props.answered && (
              <button
                className="scratch-confirm"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => props.onPick(opt.ch)}
              >
                ✓
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
