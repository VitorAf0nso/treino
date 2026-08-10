import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addSet,
  ateBefore,
  bumpRest,
  cancelSession,
  clearRest,
  finishSession,
  removeSet,
  replaceExercise,
  restFor,
  setSetField,
  toggleSet,
  toggleSkip,
} from '../actions'
import { ConfirmSheet, Sheet, Stepper, toast } from '../components/ui'
import {
  isPR,
  lastPerformance,
  programTitle,
  recordsFor,
  slotsFor,
  stepFor,
  totalsFor,
} from '../lib/calc'
import { fmtDM, fmtDuration, todayISO } from '../lib/date'
import { armAudio, beep, buzz } from '../lib/sound'
import { pop, push, replaceTop } from '../nav'
import { EXERCISES, EXERCISE_BY_ID } from '../seed'
import { useApp } from '../store'
import type { SessionExercise, SetEntry } from '../types'
import { fmtNum } from './Workout'

export default function SessionScreen() {
  const d = useApp()
  const s = d.activeSession
  const [openSlot, setOpen] = useState<number | null>(null)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [swapSlot, setSwapSlot] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const beeped = useRef(false)

  const restLeft = s?.restUntil ? s.restUntil - now : 0
  const resting = !!s?.restUntil

  useEffect(() => {
    if (!resting) return
    const i = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(i)
  }, [resting])

  useEffect(() => {
    if (!resting) {
      beeped.current = false
      return
    }
    if (restLeft <= 0 && !beeped.current) {
      beeped.current = true
      beep(2)
      buzz()
    }
  }, [restLeft, resting])

  const firstIncomplete = useMemo(() => {
    if (!s) return null
    const x = s.exercises.find((e) => !e.skipped && e.sets.some((st) => !st.done))
    return x ? x.slot : null
  }, [s])

  const active = openSlot ?? firstIncomplete

  if (!s) {
    return (
      <div className="wrap">
        <div className="topbar">
          <button className="back" onClick={pop}>
            ‹
          </button>
          <h1>Treino</h1>
        </div>
        <div className="card empty">Nenhuma sessao em andamento.</div>
      </div>
    )
  }

  const totalSets = s.exercises.filter((e) => !e.skipped).reduce((n, e) => n + e.sets.length, 0)
  const doneSets = s.exercises.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0)
  const slots = slotsFor(s.day, s.date)

  const onToggle = (ex: SessionExercise, idx: number) => {
    armAudio()
    const willBeDone = !ex.sets[idx].done
    toggleSet(ex.slot, idx, restFor(ex.exerciseId))
    if (willBeDone) {
      const remaining = ex.sets.filter((x, i) => i !== idx && !x.done).length
      if (remaining === 0) {
        const next = s.exercises.find(
          (e) => e.slot > ex.slot && !e.skipped && e.sets.some((x) => !x.done),
        )
        setOpen(next ? next.slot : null)
      }
    }
  }

  return (
    <div className="wrap" style={{ paddingBottom: resting ? 96 : 24 }}>
      <div className="topbar" style={{ paddingBottom: 8 }}>
        <button className="back" onClick={() => setConfirmCancel(true)} aria-label="fechar">
          ✕
        </button>
        <div>
          <h1 style={{ fontSize: 17 }}>
            Dia {s.day} <span className="muted">· {programTitle(s.day)}</span>
          </h1>
        </div>
        <div className="spacer" />
        <span className="small muted mono">{fmtDuration(now - s.startedAt)}</span>
      </div>

      <div className="row" style={{ gap: 4, marginBottom: 16 }}>
        <div className="bar-track" style={{ flex: 1, height: 6 }}>
          <div
            className="bar-fill"
            style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%` }}
          />
        </div>
        <span className="tiny muted" style={{ width: 46, textAlign: 'right' }}>
          {doneSets}/{totalSets}
        </span>
      </div>

      <div className="stack">
        {s.exercises.map((ex) => {
          const meta = EXERCISE_BY_ID[ex.exerciseId]
          const slot = slots[ex.slot]
          const isActive = ex.slot === active
          const allDone = ex.sets.every((x) => x.done)
          if (ex.skipped)
            return (
              <button
                key={ex.slot}
                className="ex-card upcoming"
                onClick={() => toggleSkip(ex.slot)}
                style={{ textDecoration: 'line-through' }}
              >
                <span>{meta.name}</span>
                <span className="tiny">pulado</span>
              </button>
            )
          if (!isActive)
            return (
              <button
                key={ex.slot}
                className="ex-card"
                style={{ width: '100%' }}
                onClick={() => setOpen(ex.slot)}
              >
                <div className="ex-head">
                  <span className="tick">{allDone ? '✓' : ''}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={allDone ? 'name' : 'name muted'}>{meta.name}</div>
                    <div className="tiny dim" style={{ marginTop: 2 }}>
                      {allDone
                        ? summarize(ex.sets, meta.unit)
                        : `${ex.sets.length} × ${slot?.reps ?? ex.sets[0]?.reps ?? ''}${
                            meta.unit === 'seg' ? ' s' : ''
                          }`}
                    </div>
                  </div>
                </div>
              </button>
            )

          return (
            <ExerciseCard
              key={ex.slot}
              ex={ex}
              note={slot?.note}
              onToggle={onToggle}
              onSwap={() => setSwapSlot(ex.slot)}
            />
          )
        })}
      </div>

      <div className="stack" style={{ marginTop: 22 }}>
        <button className="btn btn-primary" onClick={() => setConfirmFinish(true)}>
          Terminar treino
        </button>
      </div>

      {resting && (
        <div className={restLeft <= 0 ? 'rest-bar done' : 'rest-bar'}>
          <div className="row between" style={{ marginBottom: 8 }}>
            <span className="t mono">
              {restLeft > 0 ? fmtDuration(restLeft) : 'pode ir'}
            </span>
            <span className="small muted">descanso</span>
          </div>
          <div className="bar-track" style={{ height: 5, marginBottom: 10 }}>
            <div
              className="bar-fill"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(100, (restLeft / ((s.restTotal ?? 90) * 1000)) * 100),
                )}%`,
              }}
            />
          </div>
          <div className="grid-2">
            <button className="btn btn-sm btn-ghost" onClick={() => bumpRest(30)}>
              +30 s
            </button>
            <button className="btn btn-sm btn-ghost" onClick={clearRest}>
              Pular
            </button>
          </div>
        </div>
      )}

      <SwapSheet
        slot={swapSlot}
        currentId={swapSlot != null ? s.exercises.find((e) => e.slot === swapSlot)?.exerciseId : undefined}
        onClose={() => setSwapSlot(null)}
      />

      <FastingGuard />

      <ConfirmSheet
        open={confirmFinish}
        title="Terminar treino?"
        body={
          doneSets < totalSets
            ? `${totalSets - doneSets} series nao foram marcadas e nao entram no historico.`
            : 'Todas as series marcadas entram no historico.'
        }
        confirmLabel="Terminar"
        onCancel={() => setConfirmFinish(false)}
        onConfirm={() => {
          const id = finishSession()
          setConfirmFinish(false)
          if (id) replaceTop({ t: 'sessionDetail', id })
          else pop()
        }}
      />

      <Sheet open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Sair do treino">
        <p className="small muted" style={{ marginTop: -6, marginBottom: 18, lineHeight: 1.5 }}>
          Sair mantem a sessao aberta: da para voltar e continuar de onde parou, inclusive depois de
          fechar o app. Descartar apaga o que foi marcado.
        </p>
        <div className="stack">
          <button
            className="btn btn-primary"
            onClick={() => {
              setConfirmCancel(false)
              pop()
            }}
          >
            Sair e continuar depois
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              cancelSession()
              setConfirmCancel(false)
              pop()
            }}
          >
            Descartar sessao
          </button>
          <button className="btn btn-ghost" onClick={() => setConfirmCancel(false)}>
            Voltar ao treino
          </button>
        </div>
      </Sheet>
    </div>
  )
}

function summarize(sets: SetEntry[], unit: 'kg' | 'seg'): string {
  const done = sets.filter((s) => s.done)
  if (!done.length) return 'nenhuma serie marcada'
  if (unit === 'seg') return done.map((s) => `${s.reps}s`).join(' · ')
  const w = done[0].weight
  const same = done.every((s) => s.weight === w)
  return same
    ? `${fmtNum(w)} kg · ${done.map((s) => s.reps).join('/')}`
    : done.map((s) => `${fmtNum(s.weight)}×${s.reps}`).join(' · ')
}

function ExerciseCard({
  ex,
  note,
  onToggle,
  onSwap,
}: {
  ex: SessionExercise
  note?: string
  onToggle: (ex: SessionExercise, i: number) => void
  onSwap: () => void
}) {
  const d = useApp()
  const meta = EXERCISE_BY_ID[ex.exerciseId]
  const last = lastPerformance(d.sessions, ex.exerciseId)
  const prev = recordsFor(d.sessions, ex.exerciseId)
  const step = stepFor(ex.exerciseId, d.stepOverrides)
  const isTime = meta.unit === 'seg'

  return (
    <div className="ex-card active">
      <div className="ex-head">
        <span className="tick" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="name">
            {meta.name}
            {ex.replacedId && (
              <span className="tiny muted" style={{ fontWeight: 400 }}>
                {'  '}
                (no lugar de {EXERCISE_BY_ID[ex.replacedId]?.name.toLowerCase()})
              </span>
            )}
          </div>
        </div>
        <button className="tiny muted" onClick={() => toggleSkip(ex.slot)} style={{ padding: 6 }}>
          pular
        </button>
      </div>

      <div className="ex-body">
        <div className="last-line">
          {last ? (
            <>
              ultima:{' '}
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                {isTime
                  ? last.sets.map((x) => `${x.reps}s`).join(' / ')
                  : `${fmtNum(last.best.weight)} kg · ${last.sets.map((x) => x.reps).join('/')}`}
              </span>{' '}
              em {fmtDM(last.date)}
              {!isTime && prev.maxE1rm > 0 && (
                <>
                  {' '}
                  · recorde {fmtNum(prev.maxWeight)} kg
                </>
              )}
            </>
          ) : (
            <>primeira vez neste exercicio — comece leve e anote</>
          )}
          {note && <> · {note}</>}
        </div>

        {ex.sets.map((st, i) => {
          const pr = isPR({ ...st, done: true }, prev, meta.unit)
          return (
            <div className="set-row" key={i}>
              <span className="sn">S{i + 1}</span>
              {!isTime && (
                <div className="w">
                  <Stepper
                    value={st.weight}
                    step={step}
                    max={500}
                    unit="kg"
                    onChange={(v) => setSetField(ex.slot, i, 'weight', v)}
                  />
                </div>
              )}
              <div className={isTime ? 'w' : 'r'}>
                <Stepper
                  value={st.reps}
                  step={isTime ? 5 : 1}
                  min={0}
                  max={isTime ? 600 : 100}
                  unit={isTime ? 's' : 'reps'}
                  decimals={0}
                  onChange={(v) => setSetField(ex.slot, i, 'reps', v)}
                />
              </div>
              <button
                className={st.done ? 'set-check on' : 'set-check'}
                aria-label={`marcar serie ${i + 1}`}
                onClick={() => onToggle(ex, i)}
              >
                ✓
              </button>
              {pr && (
                <span className="pr-badge" style={{ marginLeft: -4 }}>
                  ▲
                </span>
              )}
            </div>
          )
        })}

        <div className="row" style={{ marginTop: 10, gap: 8 }}>
          <button className="btn btn-sm btn-ghost" onClick={onSwap}>
            ↻ trocar
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => addSet(ex.slot)}>
            + serie
          </button>
          {ex.sets.length > 1 && (
            <button className="btn btn-sm btn-ghost" onClick={() => removeSet(ex.slot)}>
              − serie
            </button>
          )}
        </div>
        {ex.sets.some((x) => x.done && isPR(x, prev, meta.unit)) && (
          <div className="tiny accent" style={{ marginTop: 10, fontWeight: 600 }}>
            ▲ recorde batido neste exercicio
          </div>
        )}
        <button
          className="tiny muted"
          style={{ marginTop: 10 }}
          onClick={() => push({ t: 'exercise', id: ex.exerciseId })}
        >
          ver historico e grafico ›
        </button>
      </div>
    </div>
  )
}

function SwapSheet({
  slot,
  currentId,
  onClose,
}: {
  slot: number | null
  currentId?: string
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const meta = currentId ? EXERCISE_BY_ID[currentId] : undefined
  const alts = (meta?.alts ?? []).map((id) => EXERCISE_BY_ID[id]).filter(Boolean)
  const norm = (x: string) =>
    x
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
  const results = q.trim()
    ? EXERCISES.filter((e) => norm(e.name).includes(norm(q.trim()))).slice(0, 12)
    : alts

  return (
    <Sheet open={slot != null} onClose={onClose} title="Trocar exercicio">
      <p className="small muted" style={{ marginTop: -8, marginBottom: 14, lineHeight: 1.5 }}>
        O historico fica preso ao exercicio, nao ao lugar dele na ficha. Trocar aqui nao mistura as
        cargas de um com as do outro.
      </p>
      <input
        placeholder="buscar exercicio"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      <div className="list">
        {results.map((e) => (
          <button
            key={e.id}
            className="list-item"
            onClick={() => {
              if (slot != null) replaceExercise(slot, e.id)
              onClose()
              setQ('')
              toast(`Trocado para ${e.name.toLowerCase()}`)
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 550, fontSize: 15 }}>{e.name}</div>
              <div className="tiny muted">{e.kind}</div>
            </div>
            <span className="chev">›</span>
          </button>
        ))}
        {results.length === 0 && <div className="empty">Nada encontrado.</div>}
      </div>
    </Sheet>
  )
}

/** Aviso de seguranca: nao comecar o treino sem ter comido. */
function FastingGuard() {
  const d = useApp()
  const s = d.activeSession
  const t = totalsFor(d, todayISO())
  const show = !!s && s.ateBefore === undefined && t.kcal < 300

  if (!show) return null
  return (
    <Sheet open onClose={() => ateBefore(true)} title="Voce comeu antes de treinar?">
      <div className="alert alert-danger" style={{ marginBottom: 16 }}>
        <span className="bar" />
        <p style={{ color: 'var(--text)' }}>
          Nada registrado hoje. Voce ja passou mal treinando em jejum — tontura, visao turva,
          nausea. Nem que seja uma banana e um pao com manteiga: coma antes.
        </p>
      </div>
      <div className="stack">
        <button
          className="btn btn-primary"
          onClick={() => {
            ateBefore(false)
            pop()
            push({ t: 'food' })
          }}
        >
          Vou comer agora
        </button>
        <button className="btn btn-ghost" onClick={() => ateBefore(true)}>
          Ja comi, so nao registrei
        </button>
      </div>
    </Sheet>
  )
}
