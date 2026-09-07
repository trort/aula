import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

interface Card {
  ch: string;
  isTarget: boolean;
}

const REVEAL_POINTS = 24; // 手指划过的点数达到后视为"完整刮开"

export default function ScratchCards(props: {
  options: Card[];
  answered: boolean;
  picked: string | null;
  onPick: (ch: string) => void;
}) {
  const [circles, setCircles] = useState<Record<string, Array<{ x: number; y: number }>>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const basketRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ card: HTMLDivElement; ch: string; startX: number; startY: number } | null>(null);

  const scratch = (ch: string, e: ReactPointerEvent<HTMLDivElement>) => {
    if (props.answered || revealed.has(ch)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const wrap = cardRefs.current[ch];
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const next = [...(circles[ch] ?? []), { x, y }];
    setCircles((prev) => ({ ...prev, [ch]: next }));
    if (next.length >= REVEAL_POINTS) {
      setRevealed((prev) => {
        const s = new Set(prev);
        s.add(ch);
        return s;
      });
    }
  };

  const maskFor = (ch: string): string | undefined => {
    const pts = circles[ch];
    if (!pts || pts.length === 0) return undefined;
    return pts
      .map((c) => `radial-gradient(circle 72px at ${c.x}px ${c.y}px, transparent 68%, #000 69%)`)
      .join(", ");
  };

  const down = (ch: string, e: ReactPointerEvent<HTMLDivElement>) => {
    if (props.answered || !revealed.has(ch)) return;
    const card = e.currentTarget;
    drag.current = { card, ch, startX: e.clientX, startY: e.clientY };
    card.setPointerCapture(e.pointerId);
  };
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    d.card.style.transform = `translate(${e.clientX - d.startX}px, ${e.clientY - d.startY}px) scale(1.05)`;
  };
  const up = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    d.card.style.transform = "";
    const basket = basketRef.current?.getBoundingClientRect();
    if (
      basket &&
      e.clientX >= basket.left &&
      e.clientX <= basket.right &&
      e.clientY >= basket.top &&
      e.clientY <= basket.bottom
    ) {
      props.onPick(d.ch);
    }
  };

  return (
    <div className="scratch-area">
      <div className="scratch-grid">
        {props.options.map((opt) => {
          const isOpen = revealed.has(opt.ch);
          let cls = "scratch-card";
          if (props.answered) {
            if (opt.isTarget) cls += " scratch-correct";
            else if (opt.ch === props.picked) cls += " scratch-wrong";
          } else if (isOpen) {
            cls += " scratch-open";
          }
          return (
            <div
              key={opt.ch}
              ref={(el) => {
                cardRefs.current[opt.ch] = el;
              }}
              className={cls}
              onPointerDown={(e) => down(opt.ch, e)}
              onPointerMove={move}
              onPointerUp={up}
            >
              <span className="hanzi">{opt.ch}</span>
              {!props.answered && !isOpen && (
                <div
                  className="scratch-mask"
                  style={
                    maskFor(opt.ch)
                      ? {
                          maskImage: maskFor(opt.ch),
                          WebkitMaskImage: maskFor(opt.ch),
                        }
                      : undefined
                  }
                  onPointerDown={(e) => scratch(opt.ch, e)}
                  onPointerMove={(e) => {
                    if (e.buttons > 0) scratch(opt.ch, e);
                  }}
                >
                  <span className="mask-frost">✨</span>
                </div>
              )}
              {!props.answered && isOpen && <span className="open-tag">刮开啦，拖下去！</span>}
            </div>
          );
        })}
      </div>
      <div ref={basketRef} className="answer-basket">
        <span className="basket-icon">📥</span>
        <span className="basket-label">把字拖到这里</span>
      </div>
    </div>
  );
}

