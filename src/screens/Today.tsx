import { useState } from 'react'
import { addFood, dismissCard, saveWeight, startSession, toggleCreatine } from '../actions'
import { Sparkline } from '../components/charts'
import { IconGear } from '../components/icons'
import { Metric, Sheet, Stepper, Toggle, toast } from '../components/ui'
import {
  creatineStreak,
  currentRate,
  goalKcalFor,
  goalWeightAt,
  latestMA,
  latestWeight,
  movingAvg,
  nextDay,
  programTitle,
  projectedWeight,
  slotsFor,
  tookCreatine,
  totalsFor,
  trainedOn,
  translateGap,
} from '../lib/calc'
import { addDays, diffDays, fmtHeader, fmtMonth, relativeDay, todayISO } from '../lib/date'
import { buildCards, dismissUntil } from '../lib/rules'
import { push } from '../nav'
import { useApp } from '../store'

export default function Today() {
  const d = useApp()
  const today = todayISO()
  const [weighOpen, setWeighOpen] = useState(false)

  const goal = goalKcalFor(d.settings, today)
  const t = totalsFor(d, today)
  const cards = buildCards(d, today)
  const done = trainedOn(d.sessions, today)
  const day = d.activeSession?.day ?? nextDay(d.sessions)
  const nSlots = slotsFor(day, today).length

  const shake = d.foodItems.find((f) => f.hero)
  const gapKcal = goal - t.kcal
  const gapProtein = d.settings.goalProtein - t.protein
  const hadShake = shake ? d.foodLog.some((f) => f.date === today && f.name === shake.name) : false
  const suggestion = translateGap(gapKcal, gapProtein, d.foodItems, hadShake)

  const last = latestWeight(d.weights)
  const ma = latestMA(d.weights)
  const target = goalWeightAt(d.settings, today)
  const rate = currentRate(d.weights)
  const proj = projectedWeight(d.settings, d.weights)
  const spark = movingAvg(d.weights, 7).filter((p) => diffDays(today, p.date) <= 56)

  return (
    <div className="wrap">
      <div className="row between" style={{ padding: '4px 0 16px' }}>
        <div>
          <div className="eyebrow">{fmtHeader(today)}</div>
        </div>
        <button aria-label="ajustes" onClick={() => push({ t: 'settings' })} className="muted">
          <IconGear />
        </button>
      </div>

      {cards.length > 0 && (
        <div className="stack" style={{ marginBottom: 20 }}>
          {cards.map((c) => (
            <div key={c.id} className={`alert alert-${c.tone}`}>
              <span className="bar" />
              <div style={{ flex: 1 }}>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </div>
              {c.dismissible && (
                <button
                  className="x"
                  aria-label="dispensar"
                  onClick={() => dismissCard(c.id, dismissUntil(today))}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="section" style={{ marginTop: 0 }}>
        <span className="eyebrow">{done ? 'treino de hoje' : 'proximo treino'}</span>
        <button
          className="card"
          style={{ width: '100%', textAlign: 'left' }}
          onClick={() => push({ t: 'workout' })}
        >
          <div className="row between">
            <div>
              <div style={{ fontSize: 20, fontWeight: 650, letterSpacing: '-0.01em' }}>
                {done ? `Dia ${done.day}` : `Dia ${day}`}
                <span className="muted" style={{ fontWeight: 400, fontSize: 16 }}>
                  {'  '}
                  {programTitle(done?.day ?? day)}
                </span>
              </div>
              <div className="small muted" style={{ marginTop: 4 }}>
                {done
                  ? `concluido · ${done.exercises.filter((e) => e.sets.length).length} exercicios`
                  : `${nSlots} exercicios${
                      d.activeSession ? ' · sessao em andamento' : ''
                    }`}
              </div>
            </div>
            <span className="chev muted" style={{ fontSize: 22 }}>
              ›
            </span>
          </div>
        </button>
      </div>

      <div className="section">
        <span className="eyebrow">hoje</span>
        <div className="card stack" style={{ gap: 16 }}>
          <Metric label="calorias" value={t.kcal} goal={goal} low={t.kcal < goal * 0.6} />
          <Metric
            label="proteina"
            value={t.protein}
            goal={d.settings.goalProtein}
            unit="g"
            low={t.protein < d.settings.proteinFloor}
          />
          {suggestion && gapKcal > 100 && (
            <div
              style={{
                background: 'var(--surface-2)',
                borderRadius: 10,
                padding: '11px 12px',
                fontSize: 14,
                lineHeight: 1.45,
              }}
            >
              faltam <strong>{Math.max(0, gapKcal).toLocaleString('pt-BR')} kcal</strong>
              {gapProtein > 5 && (
                <>
                  {' '}
                  e <strong>{Math.round(gapProtein)} g</strong>
                </>
              )}
              <br />
              <span className="accent" style={{ fontWeight: 600 }}>
                ≈ {suggestion}
              </span>
            </div>
          )}
          {gapKcal <= 100 && (
            <div className="small accent" style={{ fontWeight: 600 }}>
              Meta de calorias batida.
            </div>
          )}
        </div>
      </div>

      <div className="section">
        <div className="card row between">
          <div>
            <div style={{ fontWeight: 600 }}>Creatina</div>
            <div className="tiny muted">
              {tookCreatine(d, today)
                ? `${creatineStreak(d, today)} dia${creatineStreak(d, today) > 1 ? 's' : ''} seguidos`
                : '3-5 g, todo dia, inclusive sem treino'}
            </div>
          </div>
          <Toggle on={tookCreatine(d, today)} onChange={() => toggleCreatine(today)} />
        </div>
      </div>

      <div className="section">
        <span className="eyebrow">peso</span>
        <button
          className="card"
          style={{ width: '100%', textAlign: 'left' }}
          onClick={() => push({ t: 'body', tab: 'peso' })}
        >
          {last ? (
            <>
              <div className="row between" style={{ alignItems: 'flex-end' }}>
                <div>
                  <span className="big-num">{last.kg.toFixed(1).replace('.', ',')}</span>
                  <span className="muted"> kg</span>
                  <div className="tiny muted" style={{ marginTop: 2 }}>
                    {relativeDay(last.date, today)}
                    {ma != null && ` · media 7d ${ma.toFixed(1).replace('.', ',')}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="tiny muted">meta hoje</div>
                  <div style={{ fontWeight: 600 }}>
                    {target.toFixed(1).replace('.', ',')} kg
                  </div>
                  {ma != null && (
                    <div
                      className={`tiny ${ma >= target ? 'accent' : 'warn'}`}
                      style={{ fontWeight: 600 }}
                    >
                      {ma >= target ? '▲' : '▼'} {Math.abs(ma - target).toFixed(1).replace('.', ',')}
                    </div>
                  )}
                </div>
              </div>
              {spark.length > 1 && (
                <div style={{ marginTop: 10 }}>
                  <Sparkline points={spark.map((p) => ({ date: p.date, v: p.kg }))} />
                </div>
              )}
              <div className="tiny muted" style={{ marginTop: 8 }}>
                {rate != null
                  ? `${rate >= 0 ? '+' : ''}${rate.toFixed(2).replace('.', ',')} kg/semana (meta ${d.settings.weeklyGain
                      .toFixed(2)
                      .replace('.', ',')})`
                  : 'registre 3+ pesagens para ver o ritmo'}
                {proj != null &&
                  ` · projecao ${proj.toFixed(1).replace('.', ',')} kg em ${fmtMonth(
                    d.settings.goalWeightDate,
                  )}`}
              </div>
            </>
          ) : (
            <div className="muted small">Nenhuma pesagem registrada.</div>
          )}
        </button>
      </div>

      <div className="section stack" style={{ marginTop: 26 }}>
        {!done && (
          <button
            className="btn btn-primary"
            onClick={() => {
              if (!d.activeSession) startSession(day)
              push({ t: 'session' })
            }}
          >
            {d.activeSession ? `▶ Continuar treino ${d.activeSession.day}` : `▶ Iniciar treino ${day}`}
          </button>
        )}
        <div className="grid-2">
          <button
            className="btn"
            onClick={() => {
              if (!shake) return
              addFood(shake, 1)
              toast(`Shake registrado · ${shake.kcal} kcal`)
            }}
          >
            + Shake
          </button>
          <button className="btn" onClick={() => setWeighOpen(true)}>
            + Peso
          </button>
        </div>
      </div>

      <QuickWeigh
        open={weighOpen}
        onClose={() => setWeighOpen(false)}
        initial={last?.kg ?? d.settings.startWeight}
      />
    </div>
  )
}

function QuickWeigh({
  open,
  onClose,
  initial,
}: {
  open: boolean
  onClose: () => void
  initial: number
}) {
  const [kg, setKg] = useState(initial)
  const [date, setDate] = useState(todayISO())
  return (
    <Sheet open={open} onClose={onClose} title="Registrar peso">
      <p className="small muted" style={{ marginTop: -8, marginBottom: 16 }}>
        De manha, em jejum, depois do banheiro. O valor isolado oscila — o que importa e a media.
      </p>
      <div className="stack">
        <Stepper value={kg} onChange={setKg} step={0.1} min={30} max={200} unit="kg" decimals={1} />
        <div className="segmented">
          {[0, -1, -2].map((n) => {
            const dd = addDays(todayISO(), n)
            return (
              <button key={n} className={date === dd ? 'on' : ''} onClick={() => setDate(dd)}>
                {n === 0 ? 'hoje' : n === -1 ? 'ontem' : 'anteontem'}
              </button>
            )
          })}
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            saveWeight(Math.round(kg * 10) / 10, date)
            onClose()
            toast('Peso registrado')
          }}
        >
          Salvar
        </button>
      </div>
    </Sheet>
  )
}
