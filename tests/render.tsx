/**
 * Renderiza cada tela fora do navegador so para garantir que nenhuma quebra.
 * Nao testa interacao — testa que o app nao explode ao abrir.
 */
import { renderToString } from 'react-dom/server'
import App from '../src/App'
import { setRoot, type Route } from '../src/nav'
import { boot, getState, update } from '../src/store'
import type { Session } from '../src/types'

let failures = 0
function tryRender(name: string) {
  try {
    const html = renderToString(<App />)
    if (!html || html.length < 20) throw new Error('html vazio')
    console.log(`  ok   ${name} (${html.length} chars)`)
  } catch (err) {
    failures++
    console.log(`  FAIL ${name}: ${(err as Error).message}`)
  }
}

async function main() {
  // sem IndexedDB no Node, o boot cai no estado inicial e marca ready
  await boot()

  // dados de exemplo para exercitar caminhos com conteudo
  const session: Session = {
    id: 'demo1',
    date: '2026-08-12',
    day: 'A',
    startedAt: new Date('2026-08-12T15:00:00').getTime(),
    endedAt: new Date('2026-08-12T16:05:00').getTime(),
    exercises: [
      {
        slot: 0,
        exerciseId: 'supino-halteres',
        sets: [
          { weight: 12, reps: 10, done: true },
          { weight: 12, reps: 9, done: true },
        ],
      },
      { slot: 2, exerciseId: 'leg-press', sets: [{ weight: 60, reps: 12, done: true }] },
    ],
  }

  update((d) => {
    d.sessions = [session, { ...session, id: 'demo2', date: '2026-08-19', day: 'B' }]
    d.weights = [
      { date: '2026-08-10', kg: 64 },
      { date: '2026-08-13', kg: 64.3 },
      { date: '2026-08-17', kg: 64.5 },
      { date: '2026-08-20', kg: 64.9 },
    ]
    d.measurements = [
      { date: '2026-08-10', ombros: 105, peito: 88, braco: 27, cintura: 70 },
      { date: '2026-09-10', ombros: 107, peito: 90, braco: 28.5, cintura: 71 },
    ]
    d.foodLog = [
      { id: 'f1', date: '2026-08-10', at: 1, name: 'Shake', mult: 1, kcal: 1030, protein: 30 },
    ]
    d.photos = [
      { id: 'ph1', date: '2026-08-10', angle: 'frente', bytes: 180000, w: 810, h: 1080 },
      { id: 'ph2', date: '2026-09-10', angle: 'frente', bytes: 190000, w: 810, h: 1080 },
    ]
    d.creatine = ['2026-08-10']
  })

  const routes: Route[] = [
    { t: 'today' },
    { t: 'workout' },
    { t: 'exercise', id: 'leg-press' },
    { t: 'exercise', id: 'prancha' },
    { t: 'sessionDetail', id: 'demo1' },
    { t: 'sessionDetail', id: 'inexistente' },
    { t: 'food' },
    { t: 'foodItems' },
    { t: 'body', tab: 'peso' },
    { t: 'body', tab: 'medidas' },
    { t: 'body', tab: 'fotos' },
    { t: 'measure' },
    { t: 'measure', date: '2026-08-10' },
    { t: 'photoCompare' },
    { t: 'settings' },
    { t: 'program' },
    { t: 'session' }, // sem sessao ativa
  ]

  console.log('\n— telas (estado vazio de sessao ativa) —')
  for (const r of routes) {
    setRoot(r)
    tryRender(r.t + ('tab' in r && r.tab ? `/${r.tab}` : '') + ('id' in r ? `/${r.id}` : ''))
  }

  console.log('\n— sessao de treino em andamento —')
  update((d) => {
    d.activeSession = {
      id: 'ativa',
      date: '2026-08-21',
      day: 'C',
      startedAt: Date.now() - 600000,
      ateBefore: true,
      exercises: [
        {
          slot: 0,
          exerciseId: 'agachamento-smith',
          sets: [
            { weight: 30, reps: 10, done: true },
            { weight: 30, reps: 10, done: false },
          ],
        },
        { slot: 1, exerciseId: 'leg-press', sets: [{ weight: 65, reps: 12, done: false }] },
        { slot: 4, exerciseId: 'face-pull', sets: [{ weight: 15, reps: 15, done: false }] },
      ],
      restUntil: Date.now() + 45000,
      restTotal: 120,
    }
  })
  setRoot({ t: 'session' })
  tryRender('session (ativa, com descanso rodando)')
  setRoot({ t: 'today' })
  tryRender('today (com sessao em andamento)')

  console.log('\n— sessao com substituicao e exercicio pulado —')
  update((d) => {
    if (!d.activeSession) return
    d.activeSession.exercises[1] = {
      slot: 1,
      exerciseId: 'hack',
      replacedId: 'leg-press',
      sets: [{ weight: 40, reps: 12, done: false }],
    }
    d.activeSession.exercises[2].skipped = true
  })
  setRoot({ t: 'session' })
  tryRender('session (troca + pulado)')

  console.log('\n— guarda de jejum (nada comido hoje) —')
  update((d) => {
    if (d.activeSession) d.activeSession.ateBefore = undefined
    d.foodLog = []
  })
  setRoot({ t: 'session' })
  tryRender('session (aviso de jejum aberto)')

  console.log('\n— estado completamente vazio —')
  update((d) => {
    d.sessions = []
    d.weights = []
    d.measurements = []
    d.photos = []
    d.foodLog = []
    d.creatine = []
    d.activeSession = null
  })
  for (const r of routes.slice(0, 16)) {
    setRoot(r)
    tryRender('vazio: ' + r.t)
  }

  console.log(`\nestado final tem ${getState().foodItems.length} alimentos`)
  console.log(failures === 0 ? 'TUDO OK\n' : `${failures} FALHA(S)\n`)
  process.exit(failures === 0 ? 0 : 1)

}

void main()
