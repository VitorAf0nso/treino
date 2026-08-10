import type { ISODate } from '../types'
import { addDays, diffDays, fmtDM, fmtMonth, parseISO } from '../lib/date'

const W = 340
const H = 170
const PAD = { t: 10, r: 8, b: 20, l: 30 }

interface Pt {
  date: ISODate
  v: number
}

function scales(from: ISODate, to: ISODate, min: number, max: number) {
  const span = Math.max(1, diffDays(to, from))
  const range = Math.max(0.001, max - min)
  const x = (d: ISODate) => PAD.l + (diffDays(d, from) / span) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - (v - min) / range) * (H - PAD.t - PAD.b)
  return { x, y }
}

function niceTicks(min: number, max: number, count = 4): number[] {
  const raw = (max - min) / count
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-6))))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10
  const start = Math.ceil(min / step) * step
  const out: number[] = []
  for (let v = start; v <= max + 1e-9; v += step) out.push(Math.round(v * 100) / 100)
  return out
}

// ------------------------------------------------------------------ peso

export function WeightChart({
  raw,
  ma,
  goalAt,
  goalDate,
}: {
  raw: Pt[]
  ma: Pt[]
  goalAt: (d: ISODate) => number
  goalDate: ISODate
}) {
  if (raw.length === 0) return <Empty text="Sem pesagens ainda." />

  const from = raw[0].date
  const to = diffDays(goalDate, raw[raw.length - 1].date) > 0 ? goalDate : raw[raw.length - 1].date
  const goalPts: Pt[] = []
  const days = Math.max(1, diffDays(to, from))
  for (let i = 0; i <= days; i += Math.max(1, Math.floor(days / 24)))
    goalPts.push({ date: addDays(from, i), v: goalAt(addDays(from, i)) })
  if (goalPts[goalPts.length - 1]?.date !== to) goalPts.push({ date: to, v: goalAt(to) })

  const all = [...raw.map((p) => p.v), ...goalPts.map((p) => p.v)]
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  const pad = Math.max(0.5, (hi - lo) * 0.1)
  const min = lo - pad
  const max = hi + pad
  const { x, y } = scales(from, to, min, max)
  const ticks = niceTicks(min, max, 4)

  const path = (pts: Pt[]) =>
    pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')

  return (
    <>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="grafico de peso">
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--line-soft)"
              strokeWidth="1"
            />
            <text x={PAD.l - 5} y={y(t) + 3} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        <MonthTicks from={from} to={to} x={x} />

        <path d={path(goalPts)} fill="none" stroke="var(--accent-dim)" strokeWidth="1.5" strokeDasharray="4 4" />
        {raw.map((p) => (
          <circle key={p.date} cx={x(p.date)} cy={y(p.v)} r="2" fill="var(--muted-2)" />
        ))}
        {ma.length > 1 && (
          <path
            d={path(ma)}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="legend">
        <span>
          <i style={{ background: 'var(--accent)' }} />
          media 7 dias
        </span>
        <span>
          <i style={{ background: 'var(--muted-2)' }} />
          pesagens
        </span>
        <span>
          <i style={{ background: 'var(--accent-dim)' }} />
          meta
        </span>
      </div>
    </>
  )
}

function MonthTicks({
  from,
  to,
  x,
}: {
  from: ISODate
  to: ISODate
  x: (d: ISODate) => number
}) {
  const out: { d: ISODate; label: string }[] = []
  const start = parseISO(from)
  const cur = new Date(start.getFullYear(), start.getMonth(), 1, 12)
  const end = parseISO(to)
  while (cur <= end) {
    const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-01`
    if (diffDays(iso, from) >= 0) out.push({ d: iso, label: fmtMonth(iso).split('/')[0] })
    cur.setMonth(cur.getMonth() + 1)
  }
  const step = out.length > 7 ? Math.ceil(out.length / 6) : 1
  return (
    <>
      {out
        .filter((_, i) => i % step === 0)
        .map((t) => (
          <text key={t.d} x={x(t.d)} y={H - 5} textAnchor="middle">
            {t.label}
          </text>
        ))}
    </>
  )
}

// ------------------------------------------------------------------ carga

export function LoadChart({ points, unit }: { points: Pt[]; unit: string }) {
  if (points.length < 2)
    return <Empty text="Registre esse exercicio pelo menos duas vezes para ver a evolucao." />

  const from = points[0].date
  const to = points[points.length - 1].date
  const lo = Math.min(...points.map((p) => p.v))
  const hi = Math.max(...points.map((p) => p.v))
  const pad = Math.max(1, (hi - lo) * 0.15)
  const min = Math.max(0, lo - pad)
  const max = hi + pad
  const { x, y } = scales(from, to, min, max)
  const ticks = niceTicks(min, max, 3)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')

  return (
    <>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="evolucao de carga">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--line-soft)" />
            <text x={PAD.l - 5} y={y(t) + 3} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle
            key={p.date + i}
            cx={x(p.date)}
            cy={y(p.v)}
            r="3"
            fill="var(--bg)"
            stroke="var(--accent)"
            strokeWidth="2"
          />
        ))}
        <text x={PAD.l} y={H - 5} textAnchor="start">
          {fmtDM(from)}
        </text>
        <text x={W - PAD.r} y={H - 5} textAnchor="end">
          {fmtDM(to)}
        </text>
      </svg>
      <div className="legend">
        <span>melhor serie de cada treino, em {unit}</span>
      </div>
    </>
  )
}

// ------------------------------------------------------------------ barras

export function WeeklyBars({
  bars,
}: {
  bars: { label: string; value: number; goal: number }[]
}) {
  if (!bars.length) return <Empty text="Sem registros de comida ainda." />
  const max = Math.max(...bars.map((b) => Math.max(b.value, b.goal))) * 1.1
  const bw = (W - PAD.l - PAD.r) / bars.length
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b)

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="calorias por semana">
      {bars.map((b, i) => {
        const cx = PAD.l + i * bw
        const h = Math.max(1, H - PAD.b - y(b.value))
        const ok = b.value >= b.goal * 0.95
        return (
          <g key={b.label}>
            <rect
              x={cx + bw * 0.18}
              y={y(b.value)}
              width={bw * 0.64}
              height={h}
              rx="3"
              fill={ok ? 'var(--accent)' : 'var(--accent-dim)'}
            />
            <line
              x1={cx + bw * 0.12}
              x2={cx + bw * 0.88}
              y1={y(b.goal)}
              y2={y(b.goal)}
              stroke="var(--muted-2)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <text x={cx + bw / 2} y={H - 5} textAnchor="middle">
              {b.label}
            </text>
          </g>
        )
      })}
      <text x={PAD.l - 5} y={y(max * 0.9) + 3} textAnchor="end">
        {Math.round((max * 0.9) / 100) * 100}
      </text>
    </svg>
  )
}

// ------------------------------------------------------------------ sparkline

export function Sparkline({ points }: { points: Pt[] }) {
  if (points.length < 2) return null
  const w = 300
  const h = 34
  const lo = Math.min(...points.map((p) => p.v))
  const hi = Math.max(...points.map((p) => p.v))
  const range = Math.max(0.2, hi - lo)
  const from = points[0].date
  const span = Math.max(1, diffDays(points[points.length - 1].date, from))
  const d = points
    .map((p, i) => {
      const x = (diffDays(p.date, from) / span) * w
      const y = h - 2 - ((p.v - lo) / range) * (h - 4)
      return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height: 34 }}>
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>
}
