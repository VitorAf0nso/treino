import { useState } from 'react'
import { deleteMeasurement, saveMeasurement } from '../actions'
import { ConfirmSheet, Stepper, TopBar, toast } from '../components/ui'
import { fmtDMY, todayISO } from '../lib/date'
import { pop } from '../nav'
import { useApp } from '../store'
import { MEASURE_KEYS, type Measurement, type MeasureKey } from '../types'

const LABELS: Record<MeasureKey, string> = {
  ombros: 'Ombros',
  peito: 'Peito',
  braco: 'Braco (direito, contraido)',
  cintura: 'Cintura (na altura do umbigo)',
  quadril: 'Quadril',
  coxa: 'Coxa (direita)',
  panturrilha: 'Panturrilha (direita)',
}

const DEFAULTS: Record<MeasureKey, number> = {
  ombros: 105,
  peito: 88,
  braco: 27,
  cintura: 70,
  quadril: 88,
  coxa: 48,
  panturrilha: 32,
}

export default function Measure({ date }: { date?: string }) {
  const d = useApp()
  const target = date ?? todayISO()
  const existing = d.measurements.find((m) => m.date === target)
  const [draft, setDraft] = useState<Measurement>(existing ?? { date: target })
  const [confirmDel, setConfirmDel] = useState(false)
  // So entra no historico o que voce realmente encostou: o stepper mostra um
  // ponto de partida (a medida do mes passado), mas partida nao e medicao.
  const [touched, setTouched] = useState<Set<MeasureKey>>(
    () => new Set(MEASURE_KEYS.filter((k) => existing?.[k] != null)),
  )

  const prev = [...d.measurements]
    .filter((m) => m.date < target)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0]

  const set = (k: MeasureKey, v: number) => {
    setDraft({ ...draft, [k]: v })
    if (!touched.has(k)) setTouched(new Set(touched).add(k))
  }

  return (
    <div className="wrap">
      <TopBar title={existing ? fmtDMY(target) : 'Nova medicao'} onBack={pop} />
      <p className="small muted" style={{ marginTop: -6, marginBottom: 18, lineHeight: 1.5 }}>
        De manha, em jejum, relaxado, sempre no mesmo ponto. O que importa e a diferenca entre
        medicoes, nao o numero absoluto.
      </p>

      <div className="stack">
        {MEASURE_KEYS.map((k) => (
          <div key={k} style={touched.has(k) ? undefined : { opacity: 0.55 }}>
            <div className="row between" style={{ marginBottom: 6 }}>
              <span className="small">{LABELS[k]}</span>
              {prev?.[k] != null ? (
                <span className="tiny muted">
                  anterior {prev[k]!.toFixed(1).replace('.', ',')} cm
                </span>
              ) : (
                !touched.has(k) && <span className="tiny dim">nao medido</span>
              )}
            </div>
            <Stepper
              value={draft[k] ?? prev?.[k] ?? DEFAULTS[k]}
              onChange={(v) => set(k, v)}
              step={0.5}
              min={10}
              max={200}
              unit="cm"
            />
          </div>
        ))}
      </div>

      <div className="stack" style={{ marginTop: 22 }}>
        <button
          className="btn btn-primary"
          onClick={() => {
            const filled: Measurement = { date: target }
            for (const k of MEASURE_KEYS) {
              if (!touched.has(k)) continue
              const v = draft[k] ?? prev?.[k] ?? DEFAULTS[k]
              filled[k] = v
            }
            if (touched.size === 0) return toast('Ajuste ao menos uma medida')
            saveMeasurement(filled)
            toast(`Medicao salva · ${touched.size} de ${MEASURE_KEYS.length}`)
            pop()
          }}
        >
          Salvar {touched.size > 0 ? `${touched.size} medida${touched.size > 1 ? 's' : ''}` : 'medicao'}
        </button>
        {existing && (
          <button className="btn btn-danger" onClick={() => setConfirmDel(true)}>
            Apagar medicao
          </button>
        )}
      </div>

      <ConfirmSheet
        open={confirmDel}
        title="Apagar medicao?"
        confirmLabel="Apagar"
        danger
        onCancel={() => setConfirmDel(false)}
        onConfirm={() => {
          deleteMeasurement(target)
          setConfirmDel(false)
          pop()
        }}
      />
    </div>
  )
}
