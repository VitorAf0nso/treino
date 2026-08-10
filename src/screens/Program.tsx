import { useState } from 'react'
import { setStepOverride } from '../actions'
import { Segmented, Sheet, Stepper, TopBar } from '../components/ui'
import { programTitle, stepFor } from '../lib/calc'
import { diffDays, fmtDMY, todayISO } from '../lib/date'
import { pop } from '../nav'
import { EXERCISE_BY_ID, PHASE2_FROM, PROGRAMS } from '../seed'
import { useApp } from '../store'
import type { DayId } from '../types'

export default function Program({ day: initial = 'A' }: { day?: DayId }) {
  const d = useApp()
  const [day, setDay] = useState<DayId>(initial)
  const [editing, setEditing] = useState<string | null>(null)
  const today = todayISO()
  const program = PROGRAMS.find((p) => p.id === day)!

  return (
    <div className="wrap">
      <TopBar title="Programa" onBack={pop} />
      <p className="small muted" style={{ marginTop: -6, marginBottom: 16, lineHeight: 1.5 }}>
        Fixo ate novembro/2026 — de proposito. Trocar de programa a cada opiniao nova impede
        acumular progressao de carga. O que da para ajustar aqui e o incremento dos botoes +/− de
        cada exercicio.
      </p>

      <Segmented
        value={day}
        onChange={setDay}
        options={(['A', 'B', 'C'] as DayId[]).map((x) => ({ value: x, label: `Dia ${x}` }))}
      />

      <div className="row between" style={{ marginTop: 14, marginBottom: 8 }}>
        <span className="eyebrow">{programTitle(day)}</span>
      </div>

      <div className="list">
        {program.slots.map((sl) => {
          const ex = EXERCISE_BY_ID[sl.exerciseId]
          const future = sl.from && diffDays(today, sl.from) < 0
          return (
            <button
              key={sl.exerciseId + sl.sets}
              className="list-item"
              onClick={() => setEditing(sl.exerciseId)}
              style={future ? { opacity: 0.55 } : undefined}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 550, fontSize: 15 }}>{ex.name}</div>
                <div className="tiny muted" style={{ marginTop: 2 }}>
                  {sl.sets} × {sl.reps}
                  {ex.unit === 'seg' ? ' s' : ''} · {ex.kind} · passo{' '}
                  {stepFor(sl.exerciseId, d.stepOverrides)}
                  {ex.unit === 'seg' ? ' s' : ' kg'}
                  {future && ` · entra em ${fmtDMY(sl.from!)}`}
                </div>
              </div>
              <span className="chev">›</span>
            </button>
          )
        })}
      </div>

      <p className="tiny muted" style={{ marginTop: 16, lineHeight: 1.6 }}>
        A partir de {fmtDMY(PHASE2_FROM)} entram encolhimento com halteres (dia B) e stiff com
        halteres (dia C). Nao precisa fazer nada: eles aparecem sozinhos na sessao.
      </p>

      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? EXERCISE_BY_ID[editing]?.name : ''}
      >
        {editing && (
          <div className="stack">
            <p className="small muted" style={{ marginTop: -8, lineHeight: 1.5 }}>
              Quanto cada toque em +/− soma. Halteres normalmente vao de 2 em 2 kg; maquinas e
              polias, de 5 em 5.
            </p>
            <Stepper
              value={stepFor(editing, d.stepOverrides)}
              onChange={(v) => setStepOverride(editing, v)}
              step={0.5}
              min={0.5}
              max={20}
              unit={EXERCISE_BY_ID[editing]?.unit === 'seg' ? 's' : 'kg'}
            />
            <button className="btn btn-primary" onClick={() => setEditing(null)}>
              Pronto
            </button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
