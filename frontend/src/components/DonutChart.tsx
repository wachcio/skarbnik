interface DonutChartProps {
  percent: number;
  caption: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

/** Pierścieniowy wskaźnik postępu (np. zebrano/planowane) — SVG, bez
 * biblioteki wykresów. Kolor pobierany z tokenów motywu (var(--...)),
 * więc działa poprawnie w obu motywach. */
export function DonutChart({ percent, caption, size = 132, strokeWidth = 14, color = "var(--accent)" }: DonutChartProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <div className="donut-figure" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--surface-alt)" strokeWidth={strokeWidth} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: "stroke-dasharray 0.4s ease" }}
        />
      </svg>
      <div className="donut-center">
        <span className="donut-percent">{Math.round(clamped)}%</span>
        <span className="donut-caption">{caption}</span>
      </div>
    </div>
  );
}
