import { LoadChart } from '../components/charts'
import { TopBar } from '../components/ui'
import { e1rm, exerciseHistory, recordsFor } from '../lib/calc'
import { fmtDM, relativeDay } from '../lib/date'
import { pop } from '../nav'
import { EXERCISE_BY_ID } from '../seed'
import { useApp } from '../store'
import { fmtNum } from './Workout'

export default function ExerciseScreen({ id }: { id: string }) {
  const d = useApp()
  const meta = EXERCISE_BY_ID[id]
  const hist = exerciseHistory(d.sessions, id)
  const rec = recordsFor(d.sessions, id)
  const isTime = meta?.unit === 'seg'
  const unit = isTime ? 's' : 'kg'

  if (!meta)
    return (
      <div className="wrap">
        <TopBar title="Exercicio" onBack={pop} />
        <div className="card empty">Exercicio desconhecido.</div>
      </div>
    )

  const points = hist.map((p) => ({
    date: p.date,
    v: isTime ? p.best.reps : p.best.weight,
  }))

  const first = hist[0]
  const lastP = hist[hist.length - 1]
  const delta =
    first && lastP && !isTime ? lastP.best.weight - first.best.weight : null

  return (
    <div className="wrap">
      <TopBar title={meta.name} onBack={pop} />

      <div className="grid-3" style={{ marginBottom: 16 }}>
        <div className="card tight">
          <div className="tiny muted">recorde</div>
          <div style={{ fontSize: 19, fontWeight: 650 }}>
            {isTime ? `${rec.maxReps} s` : `${fmtNum(rec.maxWeight)} kg`}
          </div>
        </div>
        <div className="card tight">
          <div className="tiny muted">1RM est.</div>
          <div style={{ fontSize: 19, fontWeight: 650 }}>
            {isTime || rec.maxE1rm === 0 ? '—' : `${Math.round(rec.maxE1rm)} kg`}
          </div>
        </div>
        <div className="card tight">
          <div className="tiny muted">sessoes</div>
          <div style={{ fontSize: 19, fontWeight: 650 }}>{hist.length}</div>
        </div>
      </div>

      <div className="card">
        <span className="eyebrow" style={{ display: 'block', marginBottom: 10 }}>
          evolucao
        </span>
        <LoadChart points={points} unit={unit} />
        {delta != null && hist.length > 1 && (
          <div className="small" style={{ marginTop: 10 }}>
            <span className={delta > 0 ? 'accent' : 'muted'} style={{ fontWeight: 600 }}>
              {delta > 0 ? '+' : ''}
              {fmtNum(delta)} kg
            </span>{' '}
            <span className="muted">
              desde {fmtDM(first.date)} ({hist.length} treinos)
            </span>
          </div>
        )}
      </div>

      <div className="section">
        <span className="eyebrow">sessoes</span>
        {hist.length === 0 ? (
          <div className="card empty">Sem registros deste exercicio.</div>
        ) : (
          <div className="card">
            <table className="data">
              <thead>
                <tr>
                  <th>data</th>
                  <th>series</th>
                  <th className="num">{isTime ? 'melhor' : 'carga'}</th>
                </tr>
              </thead>
              <tbody>
                {[...hist].reverse().map((p, i, arr) => {
                  const prevBest = arr[i + 1]
                  const up =
                    prevBest && !isTime && p.best.weight > prevBest.best.weight
                      ? true
                      : prevBest && isTime && p.best.reps > prevBest.best.reps
                  return (
                    <tr key={p.sessionId + p.date}>
                      <td>
                        {fmtDM(p.date)}
                        <div className="tiny dim">{relativeDay(p.date)}</div>
                      </td>
                      <td className="muted">
                        {isTime
                          ? p.sets.map((s) => `${s.reps}s`).join(' / ')
                          : p.sets.map((s) => s.reps).join(' / ')}
                      </td>
                      <td className="num">
                        {isTime ? `${p.best.reps} s` : `${fmtNum(p.best.weight)} kg`}
                        {up && <span className="pr-badge" style={{ marginLeft: 6 }}>▲</span>}
                        {!isTime && (
                          <div className="tiny dim">1RM {Math.round(e1rm(p.best))}</div>
                        )}
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
