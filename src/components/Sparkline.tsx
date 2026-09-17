const WIDTH = 48;
const HEIGHT = 20;
const PADDING = 3;

/**
 * Minigráfico con los dos únicos puntos reales que tenemos (precio de hace una
 * semana y precio actual). No se interpola ni se inventan puntos intermedios.
 */
export default function Sparkline({
  previous,
  latest,
}: {
  previous: number;
  latest: number;
}) {
  const up = latest >= previous;
  const min = Math.min(previous, latest);
  const max = Math.max(previous, latest);
  const range = max - min || 1;

  const y = (value: number) =>
    HEIGHT - PADDING - ((value - min) / range) * (HEIGHT - PADDING * 2);

  const x1 = PADDING;
  const x2 = WIDTH - PADDING;
  const y1 = y(previous);
  const y2 = y(latest);

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="shrink-0"
      aria-hidden="true"
    >
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={up ? "#dc2626" : "#059669"}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <circle cx={x2} cy={y2} r={1.75} fill={up ? "#dc2626" : "#059669"} />
    </svg>
  );
}
