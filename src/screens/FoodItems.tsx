import { useState } from 'react'
import { deleteFoodItem, saveFoodItem } from '../actions'
import { ConfirmSheet, Sheet, Stepper, TopBar, toast } from '../components/ui'
import { uid } from '../lib/calc'
import { pop } from '../nav'
import { useApp } from '../store'
import type { FoodItem } from '../types'

export default function FoodItems() {
  const d = useApp()
  const [editing, setEditing] = useState<FoodItem | null>(null)

  return (
    <div className="wrap">
      <TopBar title="Alimentos" onBack={pop} />
      <p className="small muted" style={{ marginTop: -6, marginBottom: 16, lineHeight: 1.5 }}>
        Sao os unicos alimentos que o app conhece — de proposito. Ajuste os valores para o que voce
        realmente come; nao precisa ser exato, precisa ser constante.
      </p>

      <div className="list">
        {d.foodItems.map((f) => (
          <button key={f.id} className="list-item" onClick={() => setEditing(f)}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 550, fontSize: 15 }}>
                {f.name}
                {f.hero && <span className="chip on" style={{ marginLeft: 8, height: 22 }}>shake</span>}
              </div>
              <div className="tiny muted" style={{ marginTop: 2 }}>
                {f.portion} · {f.kcal} kcal · {f.protein} g
              </div>
            </div>
            <span className="chev">›</span>
          </button>
        ))}
      </div>

      <button
        className="btn"
        style={{ marginTop: 14 }}
        onClick={() =>
          setEditing({ id: uid('i'), name: '', portion: '', kcal: 200, protein: 10 })
        }
      >
        + Novo alimento
      </button>

      <EditSheet item={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function EditSheet({ item, onClose }: { item: FoodItem | null; onClose: () => void }) {
  const [draft, setDraft] = useState<FoodItem | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const cur = draft && item && draft.id === item.id ? draft : item
  if (!cur) return null

  const set = (patch: Partial<FoodItem>) => setDraft({ ...cur, ...patch })

  return (
    <>
      <Sheet open={!!item} onClose={onClose} title={item?.name || 'Novo alimento'}>
        <div className="stack">
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              nome
            </div>
            <input value={cur.name} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              porcao
            </div>
            <input
              value={cur.portion}
              placeholder="ex: 150 g, 1 unidade, prato"
              onChange={(e) => set({ portion: e.target.value })}
            />
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              calorias por porcao
            </div>
            <Stepper
              value={cur.kcal}
              onChange={(v) => set({ kcal: v })}
              step={10}
              max={4000}
              decimals={0}
              unit="kcal"
            />
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              proteina por porcao
            </div>
            <Stepper
              value={cur.protein}
              onChange={(v) => set({ protein: v })}
              step={1}
              max={200}
              decimals={1}
              unit="g"
            />
          </div>

          {cur.variant && (
            <div className="card" style={{ background: 'var(--surface-2)' }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                variacao (toque longo)
              </div>
              <div className="small" style={{ marginBottom: 10 }}>
                {cur.variant.name}
              </div>
              <div className="grid-2">
                <Stepper
                  value={cur.variant.kcal}
                  onChange={(v) => set({ variant: { ...cur.variant!, kcal: v } })}
                  step={10}
                  max={4000}
                  decimals={0}
                  unit="kcal"
                />
                <Stepper
                  value={cur.variant.protein}
                  onChange={(v) => set({ variant: { ...cur.variant!, protein: v } })}
                  step={1}
                  max={200}
                  decimals={0}
                  unit="g"
                />
              </div>
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={() => {
              if (!cur.name.trim()) return toast('Da um nome')
              saveFoodItem({ ...cur, name: cur.name.trim(), portion: cur.portion.trim() })
              setDraft(null)
              onClose()
              toast('Salvo')
            }}
          >
            Salvar
          </button>
          {!cur.hero && (
            <button className="btn btn-danger" onClick={() => setConfirmDel(true)}>
              Apagar
            </button>
          )}
        </div>
      </Sheet>

      <ConfirmSheet
        open={confirmDel}
        title="Apagar alimento?"
        body="Os registros ja feitos com ele continuam no historico."
        confirmLabel="Apagar"
        danger
        onCancel={() => setConfirmDel(false)}
        onConfirm={() => {
          deleteFoodItem(cur.id)
          setConfirmDel(false)
          setDraft(null)
          onClose()
        }}
      />
    </>
  )
}
