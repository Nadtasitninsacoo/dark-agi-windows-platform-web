'use client';

import { useId, useRef, useState } from 'react';

export interface SparkPoint {
  readonly t: string;
  readonly v: number;
}

/**
 * Single-series line (0–100 scale) with a hover crosshair + readout.
 * The panel title names the series, so no legend is drawn.
 */
export function Sparkline({
  points,
  label,
  height = 64,
  formatValue = (v) => `${v.toFixed(1)}%`,
}: {
  points: readonly SparkPoint[];
  label: string;
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const width = 300;
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const titleId = useId();

  if (points.length < 2) {
    return (
      <div className="flex items-center justify-center text-[11px] text-ink-3" style={{ height }}>
        Collecting samples…
      </div>
    );
  }

  const step = width / (points.length - 1);
  const y = (v: number) => height - 2 - (Math.max(0, Math.min(100, v)) / 100) * (height - 4);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(2)},${y(p.v).toFixed(2)}`).join(' ');
  const area = `${path} L${width},${height} L0,${height} Z`;
  const active = hover === null ? null : points[hover];

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = (event.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1)))));
  };

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="block w-full cursor-crosshair"
        style={{ height }}
        role="img"
        aria-labelledby={titleId}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <title id={titleId}>{`${label}: latest ${formatValue(points.at(-1)!.v)}`}</title>
        {[25, 50, 75].map((g) => (
          <line key={g} x1={0} x2={width} y1={y(g)} y2={y(g)} stroke="#1f2528" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
        <path d={area} fill="rgb(46 232 143 / 0.12)" />
        <path d={path} fill="none" stroke="#2ee88f" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {hover !== null && active ? (
          <line x1={hover * step} x2={hover * step} y1={0} y2={height} stroke="#9aa3a6" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ) : null}
      </svg>
      {active ? (
        <div className="pointer-events-none absolute -top-1 right-0 rounded border border-edge-strong bg-canvas/95 px-1.5 py-0.5 font-mono text-[11px] text-ink">
          {new Date(active.t).toLocaleTimeString([], { hour12: false })} · {formatValue(active.v)}
        </div>
      ) : null}
    </div>
  );
}
