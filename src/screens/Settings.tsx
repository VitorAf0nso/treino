import { useEffect, useRef, useState } from 'react'
import { patchSettings } from '../actions'
import { ConfirmSheet, Segmented, Sheet, Stepper, TopBar, toast } from '../components/ui'
import { requestPersistence, storageEstimate } from '../db'
import { goalKcalFor, isTravel } from '../lib/calc'
import { fmtDMY, todayISO } from '../lib/date'
import { exportBackup, importBackup } from '../lib/backup'
import { fmtBytes } from '../lib/photos'
import { pop, push } from '../nav'
import { useApp } from '../store'

export default function Settings() {
  const d = useApp()
  const s = d.settings
  const today = todayISO()
  const [sheet, setSheet] = useState<null | 'kcal' | 'protein' | 'weight' | 'rest' | 'days'>(null)
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [confirmImport, setConfirmImport] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void storageEstimate().then(setUsage)
    void navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null))
  }, [])

  const photoBytes = d.photos.reduce((n, p) => n + p.bytes, 0)

  return (
    <div className="wrap">
      <TopBar title="Ajustes" onBack={pop} />

      <div className="section" style={{ marginTop: 0 }}>
        <span className="eyebrow">metas</span>
        <div className="list">
          <button className="list-item" onClick={() => setSheet('kcal')}>
            <span style={{ flex: 1 }}>Calorias</span>
            <span className="muted">{s.goalKcal.toLocaleString('pt-BR')} kcal</span>
            <span className="chev">›</span>
          </button>
          <button className="list-item" onClick={() => setSheet('protein')}>
            <span style={{ flex: 1 }}>Proteina</span>
            <span className="muted">
              {s.goalProtein} g · piso {s.proteinFloor}
            </span>
            <span className="chev">›</span>
          </button>
          <button className="list-item" onClick={() => setSheet('weight')}>
            <span style={{ flex: 1 }}>Peso-alvo</span>
            <span className="muted">
              {s.goalWeight} kg · {fmtDMY(s.goalWeightDate)}
            </span>
            <span className="chev">›</span>
          </button>
        </div>
      </div>

      <div className="section">
        <span className="eyebrow">modo viagem</span>
        <div className="card stack">
          <Segmented
            value={s.travelMode}
            onChange={(v) => patchSettings({ travelMode: v })}
            options={[
              { value: 'auto', label: 'Automatico' },
              { value: 'on', label: 'Ligado' },
              { value: 'off', label: 'Desligado' },
            ]}
          />
          <div className="small muted" style={{ lineHeight: 1.6 }}>
            {fmtDMY(s.travelFrom)} a {fmtDMY(s.travelTo)} · meta cai para{' '}
            {s.travelKcal.toLocaleString('pt-BR')} kcal (manutencao). Objetivo do periodo: nao
            perder peso.
            <br />
            <strong style={{ color: 'var(--text)' }}>
              {isTravel(s, today)
                ? `ativo agora — meta de hoje ${goalKcalFor(s, today).toLocaleString('pt-BR')} kcal`
                : 'inativo hoje'}
            </strong>
          </div>
        </div>
      </div>

      <div className="section">
        <span className="eyebrow">treino</span>
        <div className="list">
          <button className="list-item" onClick={() => push({ t: 'program' })}>
            <span style={{ flex: 1 }}>Programa A / B / C</span>
            <span className="chev">›</span>
          </button>
          <button className="list-item" onClick={() => setSheet('days')}>
            <span style={{ flex: 1 }}>Dias e horario</span>
            <span className="muted small">
              {s.trainingDays.map((i) => ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][i]).join('/')}{' '}
              · {s.trainingHour}h
            </span>
            <span className="chev">›</span>
          </button>
          <button className="list-item" onClick={() => setSheet('rest')}>
            <span style={{ flex: 1 }}>Descanso</span>
            <span className="muted small">
              {s.restCompound}s / {s.restIsolation}s
            </span>
            <span className="chev">›</span>
          </button>
        </div>
      </div>

      <div className="section">
        <span className="eyebrow">dados</span>
        <div className="card stack">
          <div className="small muted" style={{ lineHeight: 1.6 }}>
            {d.sessions.length} treinos · {d.weights.length} pesagens · {d.foodLog.length} registros
            de comida · {d.photos.length} fotos ({fmtBytes(photoBytes)})
            {usage && (
              <>
                <br />
                {fmtBytes(usage.usage)} usados
                {usage.quota > 0 && ` de ~${fmtBytes(usage.quota)} disponiveis`}
              </>
            )}
            <br />
            ultimo backup:{' '}
            {s.lastExportAt
              ? `${Math.round((Date.now() - s.lastExportAt) / 86400000)} dias atras`
              : 'nunca'}
          </div>

          <button
            className="btn btn-primary"
            onClick={() =>
              exportBackup(false)
                .then((r) =>
                  toast(r === 'shared' ? 'Backup compartilhado' : 'Backup baixado'),
                )
                .catch(() => toast('Export cancelado'))
            }
          >
            Exportar JSON
          </button>
          <button
            className="btn"
            onClick={() =>
              exportBackup(true)
                .then(() => toast('Backup com fotos gerado'))
                .catch(() => toast('Export cancelado'))
            }
          >
            Exportar com fotos ({fmtBytes(Math.round(photoBytes * 1.37))})
          </button>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            Importar JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) setConfirmImport(f)
              e.target.value = ''
            }}
          />

          {persisted === false && (
            <button
              className="btn btn-ghost"
              onClick={() =>
                requestPersistence().then((ok) => {
                  setPersisted(ok)
                  toast(ok ? 'Armazenamento persistente concedido' : 'O navegador recusou')
                })
              }
            >
              Pedir armazenamento persistente
            </button>
          )}
          {persisted === true && (
            <div className="tiny accent" style={{ textAlign: 'center' }}>
              armazenamento persistente concedido
            </div>
          )}
        </div>
        <p className="tiny muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
          Exporte uma vez por mes. Os dados vivem so neste aparelho — se voce limpar os dados do
          Safari ou trocar de celular sem backup, some tudo.
        </p>
      </div>

      <p className="tiny dim" style={{ marginTop: 30, textAlign: 'center', lineHeight: 1.6 }}>
        Abra sempre pelo icone da tela de inicio.
        <br />O Safari e o app instalado guardam dados separados.
      </p>

      <GoalSheets sheet={sheet} onClose={() => setSheet(null)} />

      <ConfirmSheet
        open={!!confirmImport}
        title="Importar e substituir tudo?"
        body="Todos os dados atuais deste aparelho serao trocados pelos do arquivo. Exporte um backup antes se tiver duvida."
        confirmLabel="Importar"
        danger
        onCancel={() => setConfirmImport(null)}
        onConfirm={() => {
          const f = confirmImport
          setConfirmImport(null)
          if (!f) return
          importBackup(f)
            .then((r) =>
              toast(
                `Importado: ${r.sessions} treinos, ${r.weights} pesagens, ${r.photosRestored} fotos`,
              ),
            )
            .catch(() => toast('Arquivo invalido'))
        }}
      />
    </div>
  )
}

function GoalSheets({
  sheet,
  onClose,
}: {
  sheet: null | 'kcal' | 'protein' | 'weight' | 'rest' | 'days'
  onClose: () => void
}) {
  const d = useApp()
  const s = d.settings

  return (
    <>
      <Sheet open={sheet === 'kcal'} onClose={onClose} title="Meta de calorias">
        <div className="stack">
          <Stepper
            value={s.goalKcal}
            onChange={(v) => patchSettings({ goalKcal: v })}
            step={50}
            min={1500}
            max={6000}
            decimals={0}
            unit="kcal"
          />
          <div className="eyebrow">meta no modo viagem</div>
          <Stepper
            value={s.travelKcal}
            onChange={(v) => patchSettings({ travelKcal: v })}
            step={50}
            min={1500}
            max={6000}
            decimals={0}
            unit="kcal"
          />
          <p className="tiny muted" style={{ lineHeight: 1.6 }}>
            Se o peso nao subir por 3 semanas comendo a meta, o app avisa para subir 200 kcal. A
            balanca e o arbitro, nao a planilha.
          </p>
          <button className="btn btn-primary" onClick={onClose}>
            Pronto
          </button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'protein'} onClose={onClose} title="Meta de proteina">
        <div className="stack">
          <Stepper
            value={s.goalProtein}
            onChange={(v) => patchSettings({ goalProtein: v })}
            step={5}
            min={50}
            max={300}
            decimals={0}
            unit="g"
          />
          <div className="eyebrow">piso aceitavel</div>
          <Stepper
            value={s.proteinFloor}
            onChange={(v) => patchSettings({ proteinFloor: v })}
            step={2}
            min={40}
            max={250}
            decimals={0}
            unit="g"
          />
          <button className="btn btn-primary" onClick={onClose}>
            Pronto
          </button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'weight'} onClose={onClose} title="Peso-alvo">
        <div className="stack">
          <div className="eyebrow">peso-alvo</div>
          <Stepper
            value={s.goalWeight}
            onChange={(v) => patchSettings({ goalWeight: v })}
            step={0.5}
            min={40}
            max={150}
            unit="kg"
          />
          <div className="eyebrow">ganho por semana</div>
          <Stepper
            value={s.weeklyGain}
            onChange={(v) => patchSettings({ weeklyGain: Math.round(v * 100) / 100 })}
            step={0.05}
            min={0}
            max={2}
            decimals={2}
            unit="kg/sem"
          />
          <div className="eyebrow">data-alvo</div>
          <input
            type="date"
            value={s.goalWeightDate}
            onChange={(e) => patchSettings({ goalWeightDate: e.target.value })}
          />
          <div className="eyebrow">inicio da contagem</div>
          <div className="grid-2">
            <Stepper
              value={s.startWeight}
              onChange={(v) => patchSettings({ startWeight: v })}
              step={0.1}
              min={30}
              max={150}
              unit="kg"
            />
            <input
              type="date"
              value={s.startDate}
              onChange={(e) => patchSettings({ startDate: e.target.value })}
            />
          </div>
          <button className="btn btn-primary" onClick={onClose}>
            Pronto
          </button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'rest'} onClose={onClose} title="Tempo de descanso">
        <div className="stack">
          <div className="eyebrow">exercicios compostos</div>
          <Stepper
            value={s.restCompound}
            onChange={(v) => patchSettings({ restCompound: v })}
            step={15}
            min={30}
            max={300}
            decimals={0}
            unit="s"
          />
          <div className="eyebrow">exercicios isolados</div>
          <Stepper
            value={s.restIsolation}
            onChange={(v) => patchSettings({ restIsolation: v })}
            step={15}
            min={30}
            max={300}
            decimals={0}
            unit="s"
          />
          <button className="btn btn-primary" onClick={onClose}>
            Pronto
          </button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'days'} onClose={onClose} title="Dias e horario">
        <div className="stack">
          <div className="eyebrow">dias de treino</div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'].map((label, i) => {
              const on = s.trainingDays.includes(i)
              return (
                <button
                  key={i}
                  className={on ? 'chip on' : 'chip'}
                  onClick={() =>
                    patchSettings({
                      trainingDays: on
                        ? s.trainingDays.filter((x) => x !== i)
                        : [...s.trainingDays, i].sort(),
                    })
                  }
                >
                  {label}
                </button>
              )
            })}
          </div>
          <div className="eyebrow">horario habitual</div>
          <Stepper
            value={s.trainingHour}
            onChange={(v) => patchSettings({ trainingHour: v })}
            step={1}
            min={5}
            max={23}
            decimals={0}
            unit="h"
          />
          <p className="tiny muted" style={{ lineHeight: 1.6 }}>
            Serve so para o aviso de comer antes de treinar. O app nao cobra presenca: se voce
            treinar em outro dia, e so comecar a sessao normalmente.
          </p>
          <button className="btn btn-primary" onClick={onClose}>
            Pronto
          </button>
        </div>
      </Sheet>
    </>
  )
}
