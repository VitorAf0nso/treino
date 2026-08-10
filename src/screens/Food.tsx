import { useState } from 'react'
import { addCustomFood, addFood, removeFood, toggleCreatine } from '../actions'
import { WeeklyBars } from '../components/charts'
import { Metric, Sheet, Stepper, Toggle, toast, useLongPress } from '../components/ui'
import {
  completedWeeks,
  goalKcalFor,
  isTravel,
  totalsFor,
  tookCreatine,
  translateGap,
} from '../lib/calc'
import { fmtDM, fmtTime, todayISO } from '../lib/date'
import { push } from '../nav'
import { useApp } from '../store'
import type { FoodItem } from '../types'

export default function Food() {
  const d = useApp()
  const today = todayISO()
  const goal = goalKcalFor(d.settings, today)
  const t = totalsFor(d, today)
  const log = d.foodLog.filter((f) => f.date === today).sort((a, b) => b.at - a.at)
  const [multFor, setMultFor] = useState<FoodItem | null>(null)
  const [customOpen, setCustomOpen] = useState(false)

  const hero = d.foodItems.find((f) => f.hero)
  const rest = d.foodItems.filter((f) => !f.hero)
  const gapK = goal - t.kcal
  const gapP = d.settings.goalProtein - t.protein
  const hadShake = hero ? log.some((f) => f.name === hero.name) : false
  const suggestion = translateGap(gapK, gapP, d.foodItems, hadShake)

  const weeks = completedWeeks(d, 6, today).reverse()

  return (
    <div className="wrap">
      <div className="topbar">
        <h1>Comida</h1>
        <div className="spacer" />
        {isTravel(d.settings, today) && <span className="chip on">viagem</span>}
      </div>

      <div className="card stack" style={{ gap: 16 }}>
        <Metric label="calorias" value={t.kcal} goal={goal} low={t.kcal < goal * 0.6} />
        <Metric
          label="proteina"
          value={t.protein}
          goal={d.settings.goalProtein}
          unit="g"
          low={t.protein < d.settings.proteinFloor}
        />
        {suggestion && gapK > 100 && (
          <div className="small muted">
            faltam {Math.max(0, gapK).toLocaleString('pt-BR')} kcal ·{' '}
            <span className="accent" style={{ fontWeight: 600 }}>
              ≈ {suggestion}
            </span>
          </div>
        )}
      </div>

      {hero && (
        <div style={{ marginTop: 16 }}>
          <HeroButton item={hero} />
        </div>
      )}

      <div className="section">
        <span className="eyebrow">rapidos · toque longo para multiplicar</span>
        <div className="grid-3">
          {rest.map((f) => (
            <FoodTile key={f.id} item={f} onLong={() => setMultFor(f)} />
          ))}
          <button className="food-tile" onClick={() => setCustomOpen(true)}>
            <div className="n">+ Avulso</div>
            <div className="p">kcal e proteina</div>
            <div className="v">manual</div>
          </button>
        </div>
        <button className="link" style={{ marginTop: 12 }} onClick={() => push({ t: 'foodItems' })}>
          editar alimentos ›
        </button>
      </div>

      <div className="section">
        <div className="card row between">
          <div>
            <div style={{ fontWeight: 600 }}>Creatina hoje</div>
            <div className="tiny muted">3-5 g, todo dia</div>
          </div>
          <Toggle on={tookCreatine(d, today)} onChange={() => toggleCreatine(today)} />
        </div>
      </div>

      <div className="section">
        <span className="eyebrow">registrado hoje</span>
        <div className="card">
          {log.length === 0 ? (
            <div className="empty">Nada registrado ainda hoje.</div>
          ) : (
            log.map((f) => (
              <div className="log-row" key={f.id}>
                <span className="tiny dim" style={{ width: 38 }}>
                  {fmtTime(f.at)}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  {f.name}
                  {f.mult !== 1 && <span className="muted"> ×{f.mult}</span>}
                </span>
                <span className="mono" style={{ width: 62, textAlign: 'right' }}>
                  {f.kcal.toLocaleString('pt-BR')}
                </span>
                <span className="mono muted small" style={{ width: 42, textAlign: 'right' }}>
                  {Math.round(f.protein)}g
                </span>
                <button
                  className="dim"
                  style={{ padding: '4px 2px 4px 8px', fontSize: 17 }}
                  aria-label="remover"
                  onClick={() => removeFood(f.id)}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="section">
        <span className="eyebrow">media diaria por semana</span>
        <div className="card">
          <WeeklyBars
            bars={weeks.map((w) => ({
              label: fmtDM(w.from).slice(0, 5),
              value: Math.round(w.avg),
              goal: w.goal,
            }))}
          />
          <div className="tiny muted" style={{ marginTop: 6 }}>
            barra cheia = 95% ou mais da meta da semana. tracejado = meta.
          </div>
        </div>
      </div>

      <MultiplierSheet item={multFor} onClose={() => setMultFor(null)} />
      <CustomSheet open={customOpen} onClose={() => setCustomOpen(false)} />
    </div>
  )
}

function HeroButton({ item }: { item: FoodItem }) {
  const handlers = useLongPress(
    () => {
      addFood(item, 1)
      toast(`${item.name} · ${item.kcal} kcal`)
    },
    () => {
      if (!item.variant) return
      addFood(item, 1, true)
      toast(`${item.variant.name} · ${item.variant.kcal} kcal`)
    },
  )
  return (
    <button className="hero-btn" {...handlers}>
      <div className="t">+ {item.name.toUpperCase()}</div>
      <div className="s">
        {item.kcal.toLocaleString('pt-BR')} kcal · {item.protein} g proteina
      </div>
      {item.variant && <div className="s">segure para a versao com leite</div>}
    </button>
  )
}

function FoodTile({ item, onLong }: { item: FoodItem; onLong: () => void }) {
  const handlers = useLongPress(() => {
    addFood(item, 1)
    toast(`${item.name} · +${item.kcal} kcal`)
  }, onLong)
  return (
    <button className="food-tile" {...handlers}>
      <div className="n">{item.name}</div>
      <div className="p">{item.portion}</div>
      <div className="v">
        {item.kcal} · {item.protein}g
      </div>
    </button>
  )
}

function MultiplierSheet({ item, onClose }: { item: FoodItem | null; onClose: () => void }) {
  const opts = [0.5, 2, 3, 4]
  return (
    <Sheet open={!!item} onClose={onClose} title={item ? `${item.name} · ${item.portion}` : ''}>
      <div className="grid-2">
        {opts.map((m) => (
          <button
            key={m}
            className="btn"
            onClick={() => {
              if (!item) return
              addFood(item, m)
              toast(`${item.name} ×${m} · +${Math.round(item.kcal * m)} kcal`)
              onClose()
            }}
          >
            ×{String(m).replace('.', ',')}
            <span className="muted small">{item ? Math.round(item.kcal * m) : 0} kcal</span>
          </button>
        ))}
      </div>
      {item?.variant && (
        <button
          className="btn"
          style={{ marginTop: 10 }}
          onClick={() => {
            addFood(item, 1, true)
            toast(item.variant!.name)
            onClose()
          }}
        >
          {item.variant.name} · {item.variant.kcal} kcal
        </button>
      )}
    </Sheet>
  )
}

function CustomSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState(300)
  const [protein, setProtein] = useState(10)
  return (
    <Sheet open={open} onClose={onClose} title="Item avulso">
      <div className="stack">
        <input placeholder="o que foi" value={name} onChange={(e) => setName(e.target.value)} />
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            calorias
          </div>
          <Stepper value={kcal} onChange={setKcal} step={50} max={4000} decimals={0} unit="kcal" />
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            proteina
          </div>
          <Stepper value={protein} onChange={setProtein} step={1} max={200} decimals={0} unit="g" />
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            addCustomFood(name.trim(), kcal, protein)
            setName('')
            onClose()
            toast('Registrado')
          }}
        >
          Adicionar
        </button>
      </div>
    </Sheet>
  )
}
