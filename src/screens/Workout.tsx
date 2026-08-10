import { useState } from 'react'
import { startSession } from '../actions'
import { Segmented } from '../components/ui'
import {
  lastPerformance,
  nextDay,
  programTitle,
  sessionVolume,
  slotsFor,
} from '../lib/calc'
import { fmtDM, relativeDay, todayISO } from '../lib/date'
import { push } from '../nav'
import { EXERCISE_BY_ID } from '../seed'
import { useApp } from '../store'
import type { DayId } from '../types'

export default function Workout() {
  const d = useApp()
  const today = todayISO()
  const suggested = d.activeSession?.day ?? nextDay(d.sessions)
  const [day, setDay] = useState<DayId>(suggested)
  const slots = slotsFor(day, today)
  const active = d.activeSession
  const history = [...d.sessions].filter((s) => s.endedAt).sort((a, b) => b.startedAt - a.startedAt)

  return (
    <div className="wrap">
      <div className="topbar">
        <h1>Treino</h1>
      </div>

      <Segmented
        value={day}
        onChange={setDay}
        options={(['A', 'B', 'C'] as DayId[]).map((x) => ({
          value: x,
          label: `Dia ${x}`,
        }))}
      />

      <div className="row between" style={{ marginTop: 14, marginBottom: 8 }}>
        <span className="eyebrow">{programTitle(day)}</span>
        {day === suggested && <span className="chip on">sugerido</span>}
      </div>

      <div className="list">
        {slots.map((sl) => {
          const ex = EXERCISE_BY_ID[sl.exerciseId]
          const last = lastPerformance(d.sessions, sl.exerciseId)
          const unit = ex.unit === 'seg' ? 's' : 'kg'
          return (
            <button
              key={sl.exerciseId + sl.sets}
              className="list-item"
              onClick={() => push({ t: 'exercise', id: sl.exerciseId })}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 550, fontSize: 15 }}>{ex.name}</div>
                <div className="tiny muted" style={{ marginTop: 2 }}>
                  {sl.sets} × {sl.reps}
                  {ex.unit === 'seg' ? ' s' : ''}
                  {sl.note ? ` · ${sl.note}` : ''}
                  {last
                    ? ` · ultima ${
                        ex.unit === 'seg'
                          ? `${last.best.reps} s`
                          : `${fmtNum(last.best.weight)} ${unit}`
                      } em ${fmtDM(last.date)}`
                    : ' · sem historico'}
                </div>
              </div>
              <span className="chev">›</span>
            </button>
          )
        })}
      </div>

      <div className="stack" style={{ marginTop: 18 }}>
        <button
          className="btn btn-primary"
          onClick={() => {
            if (!active) startSession(day, today)
            push({ t: 'session' })
          }}
        >
          {active
            ? active.day === day
              ? `▶ Continuar treino ${day}`
              : `▶ Voltar ao treino ${active.day} em andamento`
            : `▶ Iniciar treino ${day}`}
        </button>
        {active && active.day !== day && (
          <p className="tiny muted" style={{ textAlign: 'center' }}>
            Ha uma sessao do dia {active.day} aberta. Termine ou descarte antes de comecar outra.
          </p>
        )}
      </div>

      <div className="section">
        <span className="eyebrow">historico</span>
        {history.length === 0 ? (
          <div className="card empty">Nenhum treino registrado ainda.</div>
        ) : (
          <div className="list">
            {history.slice(0, 30).map((s) => {
              return (
                <button
                  key={s.id}
                  className="list-item"
                  onClick={() => push({ t: 'sessionDetail', id: s.id })}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 550 }}>
                      Dia {s.day} <span className="muted">· {programTitle(s.day)}</span>
                    </div>
                    <div className="tiny muted" style={{ marginTop: 2 }}>
                      {fmtDM(s.date)} · {relativeDay(s.date, today)} ·{' '}
                      {Math.round(sessionVolume(s)).toLocaleString('pt-BR')} kg de volume
                    </div>
                  </div>
                  <span className="chev">›</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',')
}
