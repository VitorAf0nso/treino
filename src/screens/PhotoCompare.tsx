import { useMemo, useState } from 'react'
import { Segmented, TopBar } from '../components/ui'
import { diffDays, fmtDMY } from '../lib/date'
import { usePhotoUrl } from '../lib/photos'
import { pop } from '../nav'
import { useApp } from '../store'
import { MEASURE_KEYS, type Angle, type ISODate } from '../types'

const ANGLES: Angle[] = ['frente', 'lado', 'costas']

export default function PhotoCompare({ angle: initial = 'frente' }: { angle?: Angle }) {
  const d = useApp()
  const [angle, setAngle] = useState<Angle>(initial)

  const dates = useMemo(
    () => [...new Set(d.photos.map((p) => p.date))].sort(),
    [d.photos],
  )
  const [li, setLi] = useState(0)
  const [ri, setRi] = useState(Math.max(0, dates.length - 1))

  if (dates.length === 0)
    return (
      <div className="wrap">
        <TopBar title="Comparar" onBack={pop} />
        <div className="card empty">Nenhuma foto ainda.</div>
      </div>
    )

  const left = dates[Math.min(li, dates.length - 1)]
  const right = dates[Math.min(ri, dates.length - 1)]

  const wl = weightNear(d.weights, left)
  const wr = weightNear(d.weights, right)
  const days = diffDays(right, left)

  const ml = measureNear(d.measurements, left)
  const mr = measureNear(d.measurements, right)

  return (
    <div className="wrap">
      <TopBar title="Comparar" onBack={pop} />

      <Segmented
        value={angle}
        onChange={setAngle}
        options={ANGLES.map((a) => ({ value: a, label: a }))}
      />

      <div className="photo-pair" style={{ marginTop: 14 }}>
        <Side date={left} angle={angle} kg={wl} />
        <Side date={right} angle={angle} kg={wr} />
      </div>

      <div className="grid-2" style={{ marginTop: 10 }}>
        <Picker
          index={li}
          count={dates.length}
          label={fmtDMY(left)}
          onChange={setLi}
        />
        <Picker
          index={ri}
          count={dates.length}
          label={fmtDMY(right)}
          onChange={setRi}
        />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          diferenca
        </div>
        <div style={{ fontSize: 17, fontWeight: 600 }}>
          {wl != null && wr != null ? (
            <span className={wr - wl >= 0 ? 'accent' : 'warn'}>
              {wr - wl >= 0 ? '+' : ''}
              {(wr - wl).toFixed(1).replace('.', ',')} kg
            </span>
          ) : (
            <span className="muted">sem pesagem proxima</span>
          )}
          <span className="muted" style={{ fontWeight: 400 }}>
            {' '}
            em {Math.abs(days)} dias
          </span>
        </div>
        {ml && mr && (
          <div style={{ marginTop: 12 }}>
            <table className="data">
              <tbody>
                {MEASURE_KEYS.filter((k) => ml[k] != null && mr[k] != null).map((k) => {
                  const v = (mr[k] as number) - (ml[k] as number)
                  return (
                    <tr key={k}>
                      <td className="muted">{k}</td>
                      <td className="num">
                        {(ml[k] as number).toFixed(1).replace('.', ',')} →{' '}
                        {(mr[k] as number).toFixed(1).replace('.', ',')} cm
                      </td>
                      <td className="num" style={{ width: 54 }}>
                        <span className={v > 0 ? 'accent' : 'muted'} style={{ fontWeight: 600 }}>
                          {v > 0 ? '+' : ''}
                          {v.toFixed(1).replace('.', ',')}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Side({ date, angle, kg }: { date: ISODate; angle: Angle; kg: number | null }) {
  const d = useApp()
  const meta = d.photos.find((p) => p.date === date && p.angle === angle)
  const url = usePhotoUrl(meta?.id)
  return (
    <div className="photo-box">
      {url ? (
        <img src={url} alt={`${angle} ${date}`} />
      ) : (
        <span className="tiny dim">sem foto de {angle}</span>
      )}
      <div className="cap">
        {fmtDMY(date)}
        {kg != null && <div className="tiny muted">{kg.toFixed(1).replace('.', ',')} kg</div>}
      </div>
    </div>
  )
}

function Picker({
  index,
  count,
  label,
  onChange,
}: {
  index: number
  count: number
  label: string
  onChange: (i: number) => void
}) {
  return (
    <div className="stepper">
      <button onClick={() => onChange(Math.max(0, index - 1))} disabled={index === 0}>
        ‹
      </button>
      <div className="val" style={{ fontSize: 14 }}>
        {label}
      </div>
      <button onClick={() => onChange(Math.min(count - 1, index + 1))} disabled={index >= count - 1}>
        ›
      </button>
    </div>
  )
}

function weightNear(weights: { date: ISODate; kg: number }[], date: ISODate): number | null {
  let best: { d: number; kg: number } | null = null
  for (const w of weights) {
    const dist = Math.abs(diffDays(w.date, date))
    if (dist <= 7 && (!best || dist < best.d)) best = { d: dist, kg: w.kg }
  }
  return best?.kg ?? null
}

function measureNear<T extends { date: ISODate }>(list: T[], date: ISODate): T | null {
  let best: { d: number; m: T } | null = null
  for (const m of list) {
    const dist = Math.abs(diffDays(m.date, date))
    if (dist <= 12 && (!best || dist < best.d)) best = { d: dist, m }
  }
  return best?.m ?? null
}
