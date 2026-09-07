import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

interface Card {
  ch: string;
  isTarget: boolean;
}

const BOARD_W = 640;
const BOARD_H = 420;
const BOX_W = 130;
const BOX_H = 150;
const REVEAL_RATIO = 0.55;

function randomPositions(count: number): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  let guard = 0;
  while (out.length < count && guard < 800) {
    guard += 1;
    const x = 30 + Math.random() * (BOARD_W - BOX_W - 60);
    const y = 25 + Math.random() * (BOARD_H - BOX_H - 50);
    if (
      out.every(
        (p) =>
          Math.abs(p.x - x) > BOX_W * 0.8 || Math.abs(p.y - y) > BOX_H * 0.75
      )
    ) {
      out.push({ x, y });
    }
  }
  return out;
}

export default function ScratchCards(props: {
  options: Card[];
  answered: boolean;
  picked: string | null;
  onPick: (ch: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const basketRef = useRef<HTMLDivElement | null>(null);
  const revealedRef = useRef<Set<string>>(new Set());
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const stroke = useRef<{ x: number; y: number } | null>(null);
  const lastCheck = useRef(0);
  const drag = useRef<{ el: HTMLDivElement; ch: string; startX: number; startY: number } | null>(null);

  const positions = useMemo(() => randomPositions(props.options.length), [props.options]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = BOARD_W;
    canvas.height = BOARD_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const grad = ctx.createLinearGradient(0, 0, BOARD_W, BOARD_H);
    grad.addColorStop(0, "#2c3050");
    grad.addColorStop(1, "#12142a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, BOARD_W, BOARD_H);
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = i % 3 === 0 ? "rgba(255,255,255,.8)" : "rgba(255,255,255,.3)";
      ctx.beginPath();
      ctx.arc(Math.random() * BOARD_W, Math.random() * BOARD_H, i % 4 === 0 ? 2 : 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  const toCanvas = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * BOARD_W,
      y: ((e.clientY - rect.top) / rect.height) * BOARD_H,
    };
  };

  const checkReveal = (ctx: CanvasRenderingContext2D) => {
    const now = Date.now();
    if (now - lastCheck.current < 90) return;
    lastCheck.current = now;
    const next = new Set(revealedRef.current);
    props.options.forEach((opt, i) => {
      if (next.has(opt.ch)) return;
      const p = positions[i];
      if (!p) return;
      const cx = Math.floor(p.x + BOX_W / 2);
      const cy = Math.floor(p.y + BOX_H / 2);
      const r = 66;
      try {
        const data = ctx.getImageData(cx - r, cy - r, r * 2, r * 2).data;
        let erased = 0;
        let total = 0;
        for (let j = 0; j < data.length; j += 16) {
          total += 1;
          if (data[j + 3] < 128) erased += 1;
        }
        if (total > 0 && erased / total >= REVEAL_RATIO) next.add(opt.ch);
      } catch {
        // 区域越界时忽略
      }
    });
    if (next.size !== revealedRef.current.size) {
      revealedRef.current = next;
      setRevealed(next);
    }
  };

  const erase = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (props.answered) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = toCanvas(e);
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.lineWidth = 36;
    ctx.beginPath();
    if (stroke.current) {
      ctx.moveTo(stroke.current.x, stroke.current.y);
    } else {
      ctx.moveTo(pt.x, pt.y);
    }
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    stroke.current = pt;
    checkReveal(ctx);
  };

  const down = (ch: string, e: ReactPointerEvent<HTMLDivElement>) => {
    if (props.answered || !revealed.has(ch)) return;
    const el = e.currentTarget;
    drag.current = { el, ch, startX: e.clientX, startY: e.clientY };
    el.setPointerCapture(e.pointerId);
  };
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    d.el.style.transform = `translate(${e.clientX - d.startX}px, ${e.clientY - d.startY}px) scale(1.1)`;
  };
  const up = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    d.el.style.transform = "";
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
      <div className="scratch-board">
        <canvas
          ref={canvasRef}
          className="scratch-canvas"
          onPointerDown={erase}
          onPointerMove={(e) => {
            if (e.buttons > 0) erase(e);
          }}
          onPointerUp={() => {
            stroke.current = null;
          }}
        />
        {props.options.map((opt, i) => {
          const p = positions[i];
          if (!p) return null;
          const isOpen = revealed.has(opt.ch);
          let cls = "board-char";
          if (props.answered) {
            if (opt.isTarget) cls += " board-correct";
            else if (opt.ch === props.picked) cls += " board-wrong";
          } else if (isOpen) {
            cls += " board-open";
          }
          return (
            <div
              key={opt.ch}
              className={cls}
              style={{ left: `${(p.x / BOARD_W) * 100}%`, top: `${(p.y / BOARD_H) * 100}%` }}
              onPointerDown={(e) => down(opt.ch, e)}
              onPointerMove={move}
              onPointerUp={up}
            >
              <span className="hanzi">{opt.ch}</span>
            </div>
          );
        })}
      </div>
      <div ref={basketRef} className="answer-basket">
        <span className="basket-icon">📥</span>
      </div>
    </div>
  );
}
