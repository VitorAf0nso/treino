import { useState } from 'react'
import { deleteSession } from '../actions'
import { ConfirmSheet, TopBar } from '../components/ui'
import { isPR, programTitle, recordsBefore, sessionVolume } from '../lib/calc'
import { fmtDMY, fmtDuration } from '../lib/date'
import { pop, push } from '../nav'
import { EXERCISE_BY_ID } from '../seed'
import { useApp } from '../store'
import { fmtNum } from './Workout'

export default function SessionDetail({ id }: { id: string }) {
  const d = useApp()
  const s = d.sessions.find((x) => x.id === id)
  const [confirm, setConfirm] = useState(false)

  if (!s)
    return (
      <div className="wrap">
        <TopBar title="Treino" onBack={pop} />
        <div className="card empty">Sessao nao encontrada.</div>
      </div>
    )

  let prCount = 0
  const rows = s.exercises
    .filter((ex) => ex.sets.length > 0)
    .map((ex) => {
      const meta = EXERCISE_BY_ID[ex.exerciseId]
      const prev = recordsBefore(d.sessions, ex.exerciseId, s.id)
      const prs = ex.sets.filter((st) => isPR(st, prev, meta?.unit ?? 'kg')).length
      prCount += prs
      return { ex, meta, prs }
    })

  const duration = s.endedAt ? s.endedAt - s.startedAt : 0

  return (
    <div className="wrap">
      <TopBar title={`Dia ${s.day}`} onBack={pop} />

      <div className="card">
        <div className="row between">
          <div>
            <div style={{ fontWeight: 600 }}>{programTitle(s.day)}</div>
            <div className="small muted">{fmtDMY(s.date)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="tiny muted">duracao</div>
            <div style={{ fontWeight: 600 }}>{duration ? fmtDuration(duration) : '—'}</div>
          </div>
        </div>
        <div className="row" style={{ gap: 18, marginTop: 14 }}>
          <div>
            <div className="tiny muted">volume</div>
            <div style={{ fontWeight: 650, fontSize: 18 }}>
              {Math.round(sessionVolume(s)).toLocaleString('pt-BR')} kg
            </div>
          </div>
          <div>
            <div className="tiny muted">recordes</div>
            <div
              style={{ fontWeight: 650, fontSize: 18 }}
              className={prCount > 0 ? 'accent' : undefined}
            >
              {prCount}
            </div>
          </div>
          <div>
            <div className="tiny muted">series</div>
            <div style={{ fontWeight: 650, fontSize: 18 }}>
              {s.exercises.reduce((n, e) => n + e.sets.length, 0)}
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <span className="eyebrow">exercicios</span>
        <div className="list">
          {rows.map(({ ex, meta, prs }) => (
            <button
              key={ex.slot}
              className="list-item"
              onClick={() => push({ t: 'exercise', id: ex.exerciseId })}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 550, fontSize: 15 }}>
                  {meta?.name ?? ex.exerciseId}
                  {prs > 0 && (
                    <span className="pr-badge" style={{ marginLeft: 6 }}>
                      ▲ {prs}
                    </span>
                  )}
                </div>
                <div className="tiny muted" style={{ marginTop: 2 }}>
                  {meta?.unit === 'seg'
                    ? ex.sets.map((x) => `${x.reps}s`).join(' · ')
                    : ex.sets.map((x) => `${fmtNum(x.weight)}×${x.reps}`).join(' · ')}
                  {ex.replacedId && ` · trocou ${EXERCISE_BY_ID[ex.replacedId]?.name.toLowerCase()}`}
                </div>
              </div>
              <span className="chev">›</span>
            </button>
          ))}
          {rows.length === 0 && <div className="empty">Nenhuma serie marcada.</div>}
        </div>
      </div>

      <div className="section">
        <button className="btn btn-danger" onClick={() => setConfirm(true)}>
          Apagar este treino
        </button>
      </div>

      <ConfirmSheet
        open={confirm}
        title="Apagar treino?"
        body="Some do historico e dos graficos de carga. Nao da para desfazer."
        confirmLabel="Apagar"
        danger
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          deleteSession(s.id)
          setConfirm(false)
          pop()
        }}
      />
    </div>
  )
}
