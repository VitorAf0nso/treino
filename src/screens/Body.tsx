import { useRef, useState } from 'react'
import { addPhoto, deletePhoto, deleteWeight, saveWeight } from '../actions'
import { WeightChart } from '../components/charts'
import { IconCamera } from '../components/icons'
import { ConfirmSheet, Segmented, Sheet, Stepper, toast } from '../components/ui'
import {
  currentRate,
  goalWeightAt,
  latestMA,
  latestWeight,
  movingAvg,
  projectedWeight,
  sortedWeights,
} from '../lib/calc'
import { addDays, fmtDM, fmtDMY, fmtMonth, todayISO } from '../lib/date'
import { fmtBytes, usePhotoUrl } from '../lib/photos'
import { push, replaceTop } from '../nav'
import { useApp } from '../store'
import { MEASURE_KEYS, type Angle, type ISODate, type MeasureKey } from '../types'

type Tab = 'peso' | 'medidas' | 'fotos'

export default function Body({ tab = 'peso' }: { tab?: Tab }) {
  return (
    <div className="wrap">
      <div className="topbar">
        <h1>Corpo</h1>
      </div>
      <Segmented
        value={tab}
        onChange={(v) => replaceTop({ t: 'body', tab: v })}
        options={[
          { value: 'peso', label: 'Peso' },
          { value: 'medidas', label: 'Medidas' },
          { value: 'fotos', label: 'Fotos' },
        ]}
      />
      <div style={{ marginTop: 16 }}>
        {tab === 'peso' && <WeightTab />}
        {tab === 'medidas' && <MeasureTab />}
        {tab === 'fotos' && <PhotosTab />}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- peso

function WeightTab() {
  const d = useApp()
  const today = todayISO()
  const [open, setOpen] = useState(false)
  const [delDate, setDelDate] = useState<ISODate | null>(null)

  const ws = sortedWeights(d.weights)
  const last = latestWeight(d.weights)
  const ma = latestMA(d.weights)
  const rate = currentRate(d.weights)
  const proj = projectedWeight(d.settings, d.weights)
  const target = goalWeightAt(d.settings, today)

  return (
    <>
      <div className="card">
        <div className="row between" style={{ alignItems: 'flex-end' }}>
          <div>
            <span className="big-num">
              {last ? last.kg.toFixed(1).replace('.', ',') : '—'}
            </span>
            <span className="muted"> kg</span>
            <div className="tiny muted" style={{ marginTop: 2 }}>
              {ma != null ? `media 7 dias ${ma.toFixed(1).replace('.', ',')}` : 'sem media ainda'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="tiny muted">meta hoje</div>
            <div style={{ fontWeight: 600 }}>{target.toFixed(1).replace('.', ',')} kg</div>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <WeightChart
            raw={ws.map((w) => ({ date: w.date, v: w.kg }))}
            ma={movingAvg(d.weights, 7).map((p) => ({ date: p.date, v: p.kg }))}
            goalAt={(x) => goalWeightAt(d.settings, x)}
            goalDate={d.settings.goalWeightDate}
          />
        </div>

        <div className="small muted" style={{ marginTop: 12, lineHeight: 1.6 }}>
          {rate != null ? (
            <>
              ritmo real{' '}
              <span
                className={rate >= d.settings.weeklyGain * 0.75 ? 'accent' : 'warn'}
                style={{ fontWeight: 600 }}
              >
                {rate >= 0 ? '+' : ''}
                {rate.toFixed(2).replace('.', ',')} kg/semana
              </span>{' '}
              contra meta de {d.settings.weeklyGain.toFixed(2).replace('.', ',')}
              <br />
            </>
          ) : (
            <>registre pelo menos 3 pesagens para calcular o ritmo.<br /></>
          )}
          {proj != null && (
            <>
              projecao para {fmtMonth(d.settings.goalWeightDate)}:{' '}
              <strong style={{ color: 'var(--text)' }}>
                {proj.toFixed(1).replace('.', ',')} kg
              </strong>{' '}
              (meta {d.settings.goalWeight} kg)
            </>
          )}
        </div>
      </div>

      <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => setOpen(true)}>
        + Registrar peso
      </button>

      <div className="section">
        <span className="eyebrow">pesagens</span>
        <div className="card">
          {ws.length === 0 ? (
            <div className="empty">Nenhuma pesagem.</div>
          ) : (
            [...ws].reverse().slice(0, 40).map((w) => (
              <div className="log-row" key={w.date}>
                <span style={{ flex: 1 }}>{fmtDMY(w.date)}</span>
                <span className="mono" style={{ fontWeight: 600 }}>
                  {w.kg.toFixed(1).replace('.', ',')} kg
                </span>
                <button
                  className="dim"
                  style={{ padding: '4px 2px 4px 12px', fontSize: 17 }}
                  onClick={() => setDelDate(w.date)}
                  aria-label="apagar"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <WeighSheet open={open} onClose={() => setOpen(false)} initial={last?.kg ?? 64} />
      <ConfirmSheet
        open={!!delDate}
        title="Apagar pesagem?"
        confirmLabel="Apagar"
        danger
        onCancel={() => setDelDate(null)}
        onConfirm={() => {
          if (delDate) deleteWeight(delDate)
          setDelDate(null)
        }}
      />
    </>
  )
}

function WeighSheet({
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
      <div className="stack">
        <Stepper value={kg} onChange={setKg} step={0.1} min={30} max={200} unit="kg" />
        <div className="segmented">
          {[0, -1, -2].map((n) => {
            const dd = addDays(todayISO(), n)
            return (
              <button key={n} className={date === dd ? 'on' : ''} onClick={() => setDate(dd)}>
                {n === 0 ? 'hoje' : fmtDM(dd)}
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

// ---------------------------------------------------------------- medidas

const LABELS: Record<MeasureKey, string> = {
  ombros: 'Ombros',
  peito: 'Peito',
  braco: 'Braco (D)',
  cintura: 'Cintura',
  quadril: 'Quadril',
  coxa: 'Coxa (D)',
  panturrilha: 'Panturrilha (D)',
}

function MeasureTab() {
  const d = useApp()
  const ms = [...d.measurements].sort((a, b) => (a.date < b.date ? 1 : -1))
  const last = ms[0]
  const prev = ms[1]
  const first = ms[ms.length - 1]

  return (
    <>
      <button className="btn btn-primary" onClick={() => push({ t: 'measure' })}>
        + Nova medicao
      </button>

      {ms.length === 0 ? (
        <div className="card empty" style={{ marginTop: 14 }}>
          Nenhuma medicao. Meca 1x por mes, de manha, em jejum, relaxado — sempre no mesmo ponto.
        </div>
      ) : (
        <div className="card" style={{ marginTop: 14 }}>
          <table className="data">
            <thead>
              <tr>
                <th></th>
                <th className="num">{fmtDM(last.date)}</th>
                {prev && <th className="num">vs {fmtDM(prev.date)}</th>}
                {first && first !== last && first !== prev && (
                  <th className="num">vs inicio</th>
                )}
              </tr>
            </thead>
            <tbody>
              {MEASURE_KEYS.map((k) => {
                const v = last[k]
                const p = prev?.[k]
                const f = first?.[k]
                return (
                  <tr key={k}>
                    <td className="muted">{LABELS[k]}</td>
                    <td className="num" style={{ fontWeight: 600 }}>
                      {v != null ? `${v.toFixed(1).replace('.', ',')}` : '—'}
                    </td>
                    {prev && <td className="num">{delta(v, p)}</td>}
                    {first && first !== last && first !== prev && (
                      <td className="num">{delta(v, f)}</td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="tiny muted" style={{ marginTop: 10 }}>
            valores em cm
          </div>
        </div>
      )}

      <div className="section">
        <span className="eyebrow">medicoes</span>
        <div className="list">
          {ms.map((m) => (
            <button
              key={m.date}
              className="list-item"
              onClick={() => push({ t: 'measure', date: m.date })}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 550 }}>{fmtDMY(m.date)}</div>
                <div className="tiny muted">
                  {MEASURE_KEYS.filter((k) => m[k] != null).length} de {MEASURE_KEYS.length} medidas
                </div>
              </div>
              <span className="chev">›</span>
            </button>
          ))}
          {ms.length === 0 && <div className="empty">—</div>}
        </div>
      </div>
    </>
  )
}

function delta(a?: number, b?: number) {
  if (a == null || b == null) return <span className="dim">—</span>
  const v = a - b
  if (Math.abs(v) < 0.05) return <span className="dim">=</span>
  return (
    <span className={v > 0 ? 'accent' : 'muted'} style={{ fontWeight: 600 }}>
      {v > 0 ? '+' : ''}
      {v.toFixed(1).replace('.', ',')}
    </span>
  )
}

// ---------------------------------------------------------------- fotos

const ANGLES: Angle[] = ['frente', 'lado', 'costas']

function PhotosTab() {
  const d = useApp()
  const dates = [...new Set(d.photos.map((p) => p.date))].sort().reverse()
  const today = todayISO()
  const allDates = dates.includes(today) ? dates : [today, ...dates]
  const totalBytes = d.photos.reduce((n, p) => n + p.bytes, 0)

  return (
    <>
      <div className="row" style={{ gap: 10 }}>
        <button
          className="btn btn-primary"
          onClick={() => push({ t: 'photoCompare' })}
          disabled={dates.length < 2}
        >
          Comparar datas
        </button>
      </div>
      {dates.length < 2 && (
        <p className="tiny muted" style={{ marginTop: 8 }}>
          Precisa de pelo menos duas datas com foto para comparar.
        </p>
      )}

      {allDates.map((date) => (
        <div className="section" key={date}>
          <span className="eyebrow">
            {date === today ? `hoje · ${fmtDM(date)}` : fmtDMY(date)}
          </span>
          <div className="grid-3">
            {ANGLES.map((a) => (
              <PhotoSlot key={a} date={date} angle={a} />
            ))}
          </div>
        </div>
      ))}

      <p className="tiny muted" style={{ marginTop: 22, lineHeight: 1.6 }}>
        {d.photos.length} fotos · {fmtBytes(totalBytes)} no aparelho. As imagens sao reduzidas para
        1080 px antes de salvar. Tire tambem pelo app Camera se quiser o original no album.
      </p>
    </>
  )
}

function PhotoSlot({ date, angle }: { date: ISODate; angle: Angle }) {
  const d = useApp()
  const meta = d.photos.find((p) => p.date === date && p.angle === angle)
  const url = usePhotoUrl(meta?.id)
  const [sheet, setSheet] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const camRef = useRef<HTMLInputElement>(null)
  const libRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const handle = async (file?: File) => {
    if (!file) return
    setBusy(true)
    try {
      await addPhoto(file, angle, date)
      toast('Foto salva')
    } catch {
      toast('Nao consegui ler essa imagem')
    } finally {
      setBusy(false)
      setSheet(false)
    }
  }

  return (
    <>
      <button className="photo-thumb" onClick={() => setSheet(true)}>
        {url ? (
          <img src={url} alt={angle} />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              color: 'var(--muted-2)',
            }}
          >
            {busy ? <span className="tiny">salvando…</span> : <IconCamera />}
            <span className="tiny">{angle}</span>
          </div>
        )}
        {url && (
          <span
            className="tiny"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              padding: '10px 4px 4px',
              background: 'linear-gradient(180deg,transparent,rgba(0,0,0,.75))',
              fontWeight: 600,
            }}
          >
            {angle}
          </span>
        )}
      </button>

      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => void handle(e.target.files?.[0])}
      />
      <input
        ref={libRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => void handle(e.target.files?.[0])}
      />

      <Sheet open={sheet} onClose={() => setSheet(false)} title={`${angle} · ${fmtDM(date)}`}>
        <div className="stack">
          <button className="btn btn-primary" onClick={() => camRef.current?.click()}>
            Tirar foto
          </button>
          <button className="btn" onClick={() => libRef.current?.click()}>
            Escolher do album
          </button>
          {meta && (
            <button className="btn btn-danger" onClick={() => setConfirmDel(true)}>
              Apagar foto
            </button>
          )}
          {meta && (
            <p className="tiny muted" style={{ textAlign: 'center' }}>
              {meta.w}×{meta.h} · {fmtBytes(meta.bytes)}
            </p>
          )}
        </div>
      </Sheet>

      <ConfirmSheet
        open={confirmDel}
        title="Apagar foto?"
        confirmLabel="Apagar"
        danger
        onCancel={() => setConfirmDel(false)}
        onConfirm={() => {
          if (meta) void deletePhoto(meta.id)
          setConfirmDel(false)
          setSheet(false)
        }}
      />
    </>
  )
}
