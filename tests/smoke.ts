/**
 * Teste de fumaca da logica pura (sem DOM). Rodar com: npm run test
 */
import {
  currentRate,
  e1rm,
  exerciseHistory,
  goalWeightAt,
  isPR,
  lastPerformance,
  movingAvg,
  nextDay,
  recordsFor,
  slotsFor,
  totalsFor,
  translateGap,
} from '../src/lib/calc'
import { addDays } from '../src/lib/date'
import { buildCards } from '../src/lib/rules'
import { DEFAULT_FOODS, DEFAULT_SETTINGS, emptyData } from '../src/seed'
import type { AppData, Session, SetEntry } from '../src/types'

let failures = 0
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    console.log(`  ok   ${name}`)
  } else {
    failures++
    console.log(`  FAIL ${name}`, detail ?? '')
  }
}
function near(a: number, b: number, tol = 0.02) {
  return Math.abs(a - b) <= tol
}

console.log('\n— programa —')
check('Dia A tem 6 exercicios em agosto', slotsFor('A', '2026-08-12').length === 6)
check('Dia B tem 6 exercicios em agosto', slotsFor('B', '2026-08-12').length === 6)
check('Dia B ganha encolhimento em setembro', slotsFor('B', '2026-09-02').length === 7)
check('Dia C ganha stiff em setembro', slotsFor('C', '2026-09-02').length === 7)
check(
  'stiff so aparece a partir de 01/09',
  slotsFor('C', '2026-08-31').every((s) => s.exerciseId !== 'stiff'),
)

console.log('\n— ciclo A/B/C —')
const mkSession = (day: 'A' | 'B' | 'C', date: string, sets: SetEntry[]): Session => ({
  id: 's' + date + day,
  date,
  day,
  startedAt: new Date(date + 'T15:00:00').getTime(),
  endedAt: new Date(date + 'T16:00:00').getTime(),
  exercises: [{ slot: 0, exerciseId: 'leg-press', sets }],
})
check('sem historico, comeca no A', nextDay([]) === 'A')
check('depois de A vem B', nextDay([mkSession('A', '2026-08-10', [])]) === 'B')
check(
  'depois de C volta para A',
  nextDay([mkSession('A', '2026-08-10', []), mkSession('C', '2026-08-14', [])]) === 'A',
)

console.log('\n— cargas e recordes —')
const s1 = mkSession('A', '2026-08-10', [
  { weight: 60, reps: 12, done: true },
  { weight: 60, reps: 11, done: true },
])
const s2 = mkSession('A', '2026-08-17', [
  { weight: 62.5, reps: 12, done: true },
  { weight: 62.5, reps: 10, done: true },
])
const sessions = [s1, s2]
const hist = exerciseHistory(sessions, 'leg-press')
check('historico tem 2 pontos', hist.length === 2)
check('ordem cronologica', hist[0].date < hist[1].date)
check('melhor serie de 17/08 e 62,5x12', hist[1].best.weight === 62.5 && hist[1].best.reps === 12)
const last = lastPerformance(sessions, 'leg-press')
check('ultima performance e a mais recente', last?.date === '2026-08-17')
const rec = recordsFor([s1], 'leg-press')
check('recorde anterior = 60 kg', rec.maxWeight === 60)
check('62,5x12 e recorde sobre 60x12', isPR({ weight: 62.5, reps: 12, done: true }, rec, 'kg'))
check('60x11 nao e recorde sobre 60x12', !isPR({ weight: 60, reps: 11, done: true }, rec, 'kg'))
check(
  'mais reps com menos carga pode ser recorde (e1RM)',
  isPR({ weight: 57.5, reps: 20, done: true }, rec, 'kg'),
)
check('1RM estimado de 60x12 ~ 84', near(e1rm({ weight: 60, reps: 12, done: true }), 84, 0.1))
check(
  'sem historico anterior nao marca recorde',
  !isPR({ weight: 40, reps: 10, done: true }, { maxWeight: 0, maxE1rm: 0, maxReps: 0 }, 'kg'),
)
check(
  'prancha: recorde e por segundos',
  isPR({ weight: 0, reps: 45, done: true }, { maxWeight: 0, maxE1rm: 0, maxReps: 30 }, 'seg'),
)

console.log('\n— peso —')
const s = { ...DEFAULT_SETTINGS }
check('meta na data inicial = peso inicial', near(goalWeightAt(s, s.startDate), 64))
check('meta 10 semanas depois = 68 kg', near(goalWeightAt(s, addDays(s.startDate, 70)), 68))
check('meta nunca passa de 72 kg', near(goalWeightAt(s, '2027-06-01'), 72))
check('meta em 28/12/2026 chega a 72', near(goalWeightAt(s, '2026-12-28'), 72, 0.15))

const weights = [
  { date: '2026-08-10', kg: 64.0 },
  { date: '2026-08-12', kg: 63.8 },
  { date: '2026-08-14', kg: 64.4 },
  { date: '2026-08-17', kg: 64.3 },
  { date: '2026-08-19', kg: 64.6 },
  { date: '2026-08-21', kg: 64.9 },
]
const ma = movingAvg(weights, 7)
check('media movel tem um ponto por pesagem', ma.length === weights.length)
check(
  'media movel suaviza (primeiro ponto = valor cru)',
  near(ma[0].kg, 64.0) && ma[ma.length - 1].kg < 64.9 && ma[ma.length - 1].kg > 64.2,
)
const rate = currentRate(weights)
check('ritmo positivo detectado', rate !== null && rate > 0.2 && rate < 1.2, rate)
check('ritmo exige 3+ pontos', currentRate(weights.slice(0, 2)) === null)

console.log('\n— comida —')
const d: AppData = emptyData()
d.foodLog = [
  { id: 'a', date: '2026-08-10', at: 1, name: 'Shake', mult: 1, kcal: 1030, protein: 30 },
  { id: 'b', date: '2026-08-10', at: 2, name: 'Frango', mult: 1, kcal: 240, protein: 46 },
  { id: 'c', date: '2026-08-09', at: 3, name: 'Ovo', mult: 4, kcal: 288, protein: 25 },
]
const t = totalsFor(d, '2026-08-10')
check('totais do dia somam so o dia', t.kcal === 1270 && t.protein === 76)

const sug1 = translateGap(1760, 77, DEFAULT_FOODS, false)
check('sugere shake quando falta muito', sug1.includes('shake'), sug1)
const sug2 = translateGap(1760, 77, DEFAULT_FOODS, true)
check('nao sugere segundo shake se ja tomou', !sug2.includes('shake'), sug2)
const sug3 = translateGap(80, 3, DEFAULT_FOODS, false)
check('nao sugere nada quando a meta esta batida', sug3 === '', sug3)
const sug4 = translateGap(300, 40, DEFAULT_FOODS, true)
check('gap so de proteina puxa item proteico', /frango|ovo/.test(sug4), sug4)

console.log('\n— modo viagem —')
check('01/09 esta no modo viagem', buildCards(d, '2026-09-05').some((c) => c.id === 'travel'))
check('10/08 nao esta', !buildCards(d, '2026-08-10').some((c) => c.id === 'travel'))
check('01/10 ja saiu', !buildCards(d, '2026-10-01').some((c) => c.id === 'travel'))

console.log('\n— regra das 2 semanas —')
const low: AppData = emptyData()
// duas semanas completas antes de 24/08 (seg): 10-16 e 17-23
for (const base of ['2026-08-10', '2026-08-17']) {
  for (let i = 0; i < 7; i++) {
    low.foodLog.push({
      id: base + i,
      date: addDays(base, i),
      at: i,
      name: 'x',
      mult: 1,
      kcal: 2000, // ~67% da meta
      protein: 80,
    })
  }
}
const cards = buildCards(low, '2026-08-24')
check('dispara card de 2 semanas abaixo', cards.some((c) => c.id === 'two-weeks-low'))
check(
  'card sugere cair para 2 treinos',
  cards.find((c) => c.id === 'two-weeks-low')?.body.includes('2 treinos') ?? false,
)

const okWeeks: AppData = emptyData()
for (const base of ['2026-08-10', '2026-08-17'])
  for (let i = 0; i < 7; i++)
    okWeeks.foodLog.push({
      id: base + i,
      date: addDays(base, i),
      at: i,
      name: 'x',
      mult: 1,
      kcal: 3000,
      protein: 130,
    })
check(
  'nao dispara quando come a meta',
  !buildCards(okWeeks, '2026-08-24').some((c) => c.id === 'two-weeks-low'),
)

console.log('\n— regra do plato —')
const flat: AppData = emptyData()
flat.weights = []
for (let i = 0; i <= 26; i += 2) flat.weights.push({ date: addDays('2026-08-05', i), kg: 64 + (i % 4) * 0.05 })
for (let i = 0; i <= 26; i++)
  flat.foodLog.push({
    id: 'p' + i,
    date: addDays('2026-08-05', i),
    at: i,
    name: 'x',
    mult: 1,
    kcal: 3000,
    protein: 130,
  })
check(
  'peso parado + meta batida sugere subir 200 kcal',
  buildCards(flat, '2026-08-31').some((c) => c.id === 'plateau'),
)
check(
  'no modo viagem o plato nao alerta (manutencao e o objetivo)',
  !buildCards(flat, '2026-09-05').some((c) => c.id === 'plateau'),
)

const rising: AppData = emptyData()
rising.weights = []
for (let i = 0; i <= 26; i += 2)
  rising.weights.push({ date: addDays('2026-08-05', i), kg: 64 + i * 0.06 })
rising.foodLog = flat.foodLog
check(
  'peso subindo nao dispara plato',
  !buildCards(rising, '2026-08-31').some((c) => c.id === 'plateau'),
)

console.log(failures === 0 ? '\nTUDO OK\n' : `\n${failures} FALHA(S)\n`)
process.exit(failures === 0 ? 0 : 1)
