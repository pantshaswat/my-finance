'use client';

/** Lightweight hand-rolled SVG charts. No runtime deps. */

export function LineChart({
  data,
  height = 200,
}: {
  data: Array<{ date: string; income: number; expense: number }>;
  height?: number;
}) {
  const width = 800;
  const padding = { top: 12, right: 12, bottom: 24, left: 48 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  if (data.length === 0) {
    return <div className="py-16 text-center text-sm text-[var(--color-text-muted)]">No data</div>;
  }

  const maxVal = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const step = innerW / Math.max(1, data.length - 1);

  const path = (key: 'income' | 'expense') =>
    data
      .map((d, i) => {
        const x = padding.left + i * step;
        const y = padding.top + innerH - (d[key] / maxVal) * innerH;
        return `${i === 0 ? 'M' : 'L'}${x},${y}`;
      })
      .join(' ');

  // Y-axis ticks: 4 evenly-spaced.
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: padding.top + innerH - f * innerH,
    label: formatShort(maxVal * f),
  }));

  // X-axis labels: first, middle, last.
  const xLabels = [
    { i: 0, d: data[0] },
    { i: Math.floor(data.length / 2), d: data[Math.floor(data.length / 2)] },
    { i: data.length - 1, d: data[data.length - 1] },
  ];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      {/* grid */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={t.y}
            y2={t.y}
            stroke="var(--color-border)"
            strokeDasharray="2 4"
          />
          <text x={padding.left - 6} y={t.y + 3} textAnchor="end" fontSize="10" fill="var(--color-text-faint)">
            {t.label}
          </text>
        </g>
      ))}

      {/* lines */}
      <path d={path('income')} stroke="var(--color-income)" strokeWidth="2" fill="none" />
      <path d={path('expense')} stroke="var(--color-expense)" strokeWidth="2" fill="none" />

      {/* x labels */}
      {xLabels.map(({ i, d }) => (
        <text
          key={i}
          x={padding.left + i * step}
          y={height - 6}
          textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
          fontSize="10"
          fill="var(--color-text-faint)"
        >
          {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </text>
      ))}
    </svg>
  );
}

export function Donut({
  slices,
  size = 180,
}: {
  slices: Array<{ label: string; value: number; color: string }>;
  size?: number;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) {
    return <div className="py-10 text-center text-sm text-[var(--color-text-muted)]">No data</div>;
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  const inner = r * 0.6;

  let acc = 0;
  const arcs = slices.map((s) => {
    const startAngle = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += s.value;
    const endAngle = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const large = endAngle - startAngle > Math.PI ? 1 : 0;
    const x1 = cx + Math.cos(startAngle) * r;
    const y1 = cy + Math.sin(startAngle) * r;
    const x2 = cx + Math.cos(endAngle) * r;
    const y2 = cy + Math.sin(endAngle) * r;
    const x3 = cx + Math.cos(endAngle) * inner;
    const y3 = cy + Math.sin(endAngle) * inner;
    const x4 = cx + Math.cos(startAngle) * inner;
    const y4 = cy + Math.sin(startAngle) * inner;
    return {
      d: `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${inner},${inner} 0 ${large} 0 ${x4},${y4} Z`,
      color: s.color,
      label: s.label,
    };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} />)}
    </svg>
  );
}

function formatShort(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toFixed(0);
}
