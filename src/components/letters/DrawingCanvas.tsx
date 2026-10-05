"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Tool = "pen" | "eraser" | "line" | "rect" | "circle";
type Pt = { x: number; y: number };

const COLORS = ["#1a1410", "#e85a7a", "#c4a35a", "#f4b8c5", "#3f6b54", "#4c6a8a", "#8b5e3c"];
const PAPER = "#fbf6f0";

type Props = {
  value: string;
  onChange: (dataUrl: string) => void;
  className?: string;
};

export function DrawingCanvas({ value, onChange, className }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const committed = useRef<ImageData | null>(null);
  const history = useRef<ImageData[]>([]);
  const future = useRef<ImageData[]>([]);
  const drawing = useRef(false);
  const start = useRef<Pt | null>(null);
  const last = useRef<Pt | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(4);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const widthRef = useRef(width);
  toolRef.current = tool;
  colorRef.current = color;
  widthRef.current = width;

  function ctxOf() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    return { canvas, ctx };
  }

  function cssSize(canvas: HTMLCanvasElement) {
    const r = canvas.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }

  function point(e: PointerEvent, canvas: HTMLCanvasElement): Pt {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function snapshot() {
    const pair = ctxOf();
    if (!pair) return;
    committed.current = pair.ctx.getImageData(0, 0, pair.canvas.width, pair.canvas.height);
  }

  function pushHistory() {
    if (!committed.current) snapshot();
    if (committed.current) {
      history.current = [...history.current.slice(-19), committed.current];
      future.current = [];
    }
  }

  function restore(data: ImageData) {
    const pair = ctxOf();
    if (!pair) return;
    pair.ctx.putImageData(data, 0, 0);
    committed.current = data;
    emit();
  }

  function paintPaper(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w, h);
  }

  function emit() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL("image/jpeg", 0.88));
  }

  function styleStroke(ctx: CanvasRenderingContext2D) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = widthRef.current;
    ctx.strokeStyle = toolRef.current === "eraser" ? PAPER : colorRef.current;
    ctx.fillStyle = toolRef.current === "eraser" ? PAPER : colorRef.current;
  }

  function drawShape(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, t: Tool) {
    styleStroke(ctx);
    ctx.beginPath();
    if (t === "line") {
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      return;
    }
    if (t === "rect") {
      ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
      return;
    }
    const rx = (b.x - a.x) / 2;
    const ry = (b.y - a.y) / 2;
    ctx.ellipse(a.x + rx, a.y + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  useEffect(() => {
    const wrap = host.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const fit = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintPaper(ctx, w, h);
      if (value) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, w, h);
          snapshot();
        };
        img.src = value;
      } else {
        snapshot();
      }
    };

    fit();
    const ro = new ResizeObserver(() => {
      const prev = canvas.toDataURL("image/jpeg", 0.88);
      fit();
      const img = new Image();
      img.onload = () => {
        const { w, h } = cssSize(canvas);
        ctx.drawImage(img, 0, 0, w, h);
        snapshot();
      };
      img.src = prev;
    });
    ro.observe(wrap);

    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      drawing.current = true;
      pushHistory();
      const p = point(e, canvas);
      start.current = p;
      last.current = p;
      if (toolRef.current === "pen" || toolRef.current === "eraser") {
        styleStroke(ctx);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + 0.01, p.y);
        ctx.stroke();
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!drawing.current) return;
      const p = point(e, canvas);
      const t = toolRef.current;
      if (t === "pen" || t === "eraser") {
        const prev = last.current;
        if (!prev) return;
        styleStroke(ctx);
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        last.current = p;
        return;
      }
      if (committed.current) ctx.putImageData(committed.current, 0, 0);
      if (start.current) drawShape(ctx, start.current, p, t);
    };
    const onUp = (e: PointerEvent) => {
      if (!drawing.current) return;
      drawing.current = false;
      const p = point(e, canvas);
      const t = toolRef.current;
      if ((t === "line" || t === "rect" || t === "circle") && start.current) {
        if (committed.current) ctx.putImageData(committed.current, 0, 0);
        drawShape(ctx, start.current, p, t);
      }
      snapshot();
      emit();
      start.current = null;
      last.current = null;
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function undo() {
    const lastSnap = history.current.pop();
    if (!lastSnap || !committed.current) return;
    future.current.push(committed.current);
    restore(lastSnap);
  }

  function redo() {
    const next = future.current.pop();
    if (!next || !committed.current) return;
    history.current.push(committed.current);
    restore(next);
  }

  function clearAll() {
    const pair = ctxOf();
    if (!pair) return;
    pushHistory();
    const { w, h } = cssSize(pair.canvas);
    paintPaper(pair.ctx, w, h);
    snapshot();
    emit();
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border border-line bg-paper", className)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        {(
          [
            ["pen", "Caneta"],
            ["eraser", "Borracha"],
            ["line", "Linha"],
            ["rect", "Retângulo"],
            ["circle", "Círculo"],
          ] as [Tool, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-label={label}
            title={label}
            onClick={() => setTool(id)}
            className={cn(
              "min-h-9 rounded-full px-3 text-xs uppercase tracking-widest",
              tool === id ? "bg-ink text-paper" : "text-muted hover:bg-cream",
            )}
          >
            {label}
          </button>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            onClick={() => setColor(c)}
            className={cn(
              "size-6 rounded-full",
              color === c ? "ring-2 ring-rose ring-offset-2 ring-offset-paper" : "opacity-80",
            )}
            style={{ background: c }}
          />
        ))}
        <label className="ml-auto flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted">
          Traço
          <input
            type="range"
            min={2}
            max={28}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
          />
        </label>
      </div>
      <div ref={host} className="relative h-72 w-full touch-none sm:h-96">
        <canvas ref={canvasRef} className="block h-full w-full cursor-crosshair touch-none" />
      </div>
      <div className="flex flex-wrap gap-2 border-t border-line px-3 py-2">
        <button type="button" className="min-h-9 rounded-full px-3 text-xs uppercase tracking-widest" onClick={undo}>
          Desfazer
        </button>
        <button type="button" className="min-h-9 rounded-full px-3 text-xs uppercase tracking-widest" onClick={redo}>
          Refazer
        </button>
        <button type="button" className="min-h-9 rounded-full px-3 text-xs uppercase tracking-widest" onClick={clearAll}>
          Limpar
        </button>
      </div>
    </div>
  );
}
