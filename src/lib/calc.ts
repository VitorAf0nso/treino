import { EXERCISE_BY_ID, PROGRAMS } from '../seed'
import type {
  AppData,
  DayId,
  FoodItem,
  ISODate,
  Program,
  ProgramSlot,
  Session,
  SetEntry,
  Settings,
  WeightEntry,
} from '../types'
import { addDays, diffDays, parseISO, startOfWeek, todayISO } from './date'

// ---------------------------------------------------------------- programa

/** Slots validos na data (o programa cresce em set/2026). */
export function slotsFor(day: DayId, date: ISODate): ProgramSlot[] {
  const p = PROGRAMS.find((x) => x.id === day) as Program
  return p.slots.filter((s) => !s.from || diffDays(date, s.from) >= 0)
}

export function programTitle(day: DayId): string {
  return (PROGRAMS.find((x) => x.id === day) as Program).title
}

const CYCLE: DayId[] = ['A', 'B', 'C']

/** Proximo dia do ciclo A -> B -> C -> A, a partir da ultima sessao concluida. */
export function nextDay(sessions: Session[]): DayId {
  const done = sessions.filter((s) => s.endedAt)
  if (!done.length) return 'A'
  const last = done.reduce((a, b) => (a.startedAt > b.startedAt ? a : b))
  return CYCLE[(CYCLE.indexOf(last.day) + 1) % 3]
}

export function lastSessionOfDay(sessions: Session[], day: DayId): Session | null {
  const list = sessions.filter((s) => s.day === day && s.endedAt)
  if (!list.length) return null
  return list.reduce((a, b) => (a.startedAt > b.startedAt ? a : b))
}

export function stepFor(exerciseId: string, overrides: Record<string, number>): number {
  return overrides[exerciseId] ?? EXERCISE_BY_ID[exerciseId]?.step ?? 5
}

// ---------------------------------------------------------------- cargas

/** 1RM estimado (Epley). Serve so para ordenar series entre si. */
export function e1rm(s: SetEntry): number {
  if (s.reps <= 0) return 0
  return s.weight * (1 + s.reps / 30)
}

export interface ExercisePoint {
  date: ISODate
  sessionId: string
  sets: SetEntry[]
  best: SetEntry
  bestE1rm: number
}

/** Historico de um exercicio, mais antigo primeiro. */
export function exerciseHistory(sessions: Session[], exerciseId: string): ExercisePoint[] {
  const out: ExercisePoint[] = []
  for (const s of sessions) {
    if (!s.endedAt) continue
    for (const ex of s.exercises) {
      if (ex.exerciseId !== exerciseId || ex.skipped) continue
      const done = ex.sets.filter((x) => x.done && x.reps > 0)
      if (!done.length) continue
      const best = done.reduce((a, b) => (e1rm(a) >= e1rm(b) ? a : b))
      out.push({ date: s.date, sessionId: s.id, sets: done, best, bestE1rm: e1rm(best) })
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1))
}

export interface LastPerf {
  date: ISODate
  sets: SetEntry[]
  best: SetEntry
}

export function lastPerformance(sessions: Session[], exerciseId: string): LastPerf | null {
  const h = exerciseHistory(sessions, exerciseId)
  if (!h.length) return null
  const p = h[h.length - 1]
  return { date: p.date, sets: p.sets, best: p.best }
}

export interface Records {
  maxWeight: number
  maxE1rm: number
  maxReps: number
}

export function recordsFor(sessions: Session[], exerciseId: string): Records {
  const h = exerciseHistory(sessions, exerciseId)
  let maxWeight = 0
  let maxE1rm = 0
  let maxReps = 0
  for (const p of h)
    for (const s of p.sets) {
      maxWeight = Math.max(maxWeight, s.weight)
      maxE1rm = Math.max(maxE1rm, e1rm(s))
      maxReps = Math.max(maxReps, s.reps)
    }
  return { maxWeight, maxE1rm, maxReps }
}

/** Recorde considerando so as sessoes anteriores a `exceptSessionId`. */
export function recordsBefore(
  sessions: Session[],
  exerciseId: string,
  exceptSessionId: string,
): Records {
  return recordsFor(
    sessions.filter((s) => s.id !== exceptSessionId),
    exerciseId,
  )
}

export function isPR(set: SetEntry, prev: Records, unit: 'kg' | 'seg'): boolean {
  if (!set.done || set.reps <= 0) return false
  if (unit === 'seg') return set.reps > prev.maxReps
  if (prev.maxE1rm === 0) return false
  return e1rm(set) > prev.maxE1rm + 0.01
}

export function sessionVolume(s: Session): number {
  let v = 0
  for (const ex of s.exercises) {
    if (EXERCISE_BY_ID[ex.exerciseId]?.unit === 'seg') continue
    for (const st of ex.sets) if (st.done) v += st.weight * st.reps
  }
  return v
}

// ---------------------------------------------------------------- comida

export function isTravel(settings: Settings, date: ISODate = todayISO()): boolean {
  if (settings.travelMode === 'on') return true
  if (settings.travelMode === 'off') return false
  return diffDays(date, settings.travelFrom) >= 0 && diffDays(settings.travelTo, date) >= 0
}

export function goalKcalFor(settings: Settings, date: ISODate = todayISO()): number {
  return isTravel(settings, date) ? settings.travelKcal : settings.goalKcal
}

export interface DayTotals {
  kcal: number
  protein: number
}

export function totalsFor(d: AppData, date: ISODate): DayTotals {
  let kcal = 0
  let protein = 0
  for (const e of d.foodLog)
    if (e.date === date) {
      kcal += e.kcal
      protein += e.protein
    }
  return { kcal: Math.round(kcal), protein: Math.round(protein) }
}

/** Media diaria de kcal em [from, to]. Dias sem registro contam como zero. */
export function avgKcal(d: AppData, from: ISODate, to: ISODate): number {
  const days = diffDays(to, from) + 1
  if (days <= 0) return 0
  let sum = 0
  for (const e of d.foodLog) if (e.date >= from && e.date <= to) sum += e.kcal
  return sum / days
}

/** Semanas completas (seg-dom) mais recentes, da mais nova para a mais antiga. */
export function completedWeeks(d: AppData, n: number, today = todayISO()) {
  const thisWeek = startOfWeek(today)
  const out: { from: ISODate; to: ISODate; avg: number; goal: number }[] = []
  for (let i = 1; i <= n; i++) {
    const from = addDays(thisWeek, -7 * i)
    const to = addDays(from, 6)
    out.push({ from, to, avg: avgKcal(d, from, to), goal: goalKcalFor(d.settings, from) })
  }
  return out
}

interface Piece {
  item: FoodItem
  n: number
}

/**
 * Traduz "faltam X kcal e Y g" em comida concreta ("1 shake + 4 ovos").
 * Guloso e limitado a 3 componentes — a intencao e ser acionavel, nao exato.
 */
export function translateGap(
  gapKcal: number,
  gapProtein: number,
  items: FoodItem[],
  alreadyHadShake: boolean,
): string {
  let K = Math.max(0, gapKcal)
  let P = Math.max(0, gapProtein)
  if (K < 120 && P < 8) return ''

  const pool = items.filter((i) => {
    if (i.id === 'azeite') return false
    if (i.hero && alreadyHadShake) return false
    return true
  })
  if (!pool.length) return ''

  const picks: Piece[] = []
  for (let guard = 0; guard < 10 && (K > 120 || P > 8); guard++) {
    let best: FoodItem | null = null
    let bestScore = -Infinity
    for (const it of pool) {
      if (it.kcal <= 0 && it.protein <= 0) continue
      const overshoot = Math.max(0, it.kcal - K - 250) / 1200
      const score =
        Math.min(it.kcal, K) / Math.max(K, 1) +
        1.4 * (Math.min(it.protein, P) / Math.max(P, 1)) -
        overshoot
      const distinct = new Set(picks.map((p) => p.item.id))
      if (!distinct.has(it.id) && distinct.size >= 3) continue
      if (score > bestScore) {
        bestScore = score
        best = it
      }
    }
    if (!best || bestScore <= 0) break
    const found = picks.find((p) => p.item.id === best!.id)
    if (found) found.n++
    else picks.push({ item: best, n: 1 })
    K -= best.kcal
    P -= best.protein
    if (best.hero) pool.splice(pool.indexOf(best), 1) // no maximo 1 shake na sugestao
  }

  if (!picks.length) return ''
  return picks
    .map((p) => {
      const name = p.item.name.toLowerCase()
      if (p.n === 1) return `1 ${name}`
      return `${p.n} ${pluralize(name)}`
    })
    .join(' + ')
}

function pluralize(w: string): string {
  if (w.endsWith('s')) return w
  if (w.endsWith('ao')) return w.slice(0, -2) + 'oes'
  if (w.endsWith('l')) return w.slice(0, -1) + 'is'
  if (/[rz]$/.test(w)) return w + 'es'
  return w + 's'
}

// ---------------------------------------------------------------- peso

export function sortedWeights(w: WeightEntry[]): WeightEntry[] {
  return [...w].sort((a, b) => (a.date < b.date ? -1 : 1))
}

/** Media movel dos ultimos `win` dias (janela por data, nao por indice). */
export function movingAvg(weights: WeightEntry[], win = 7): { date: ISODate; kg: number }[] {
  const ws = sortedWeights(weights)
  return ws.map((w) => {
    const from = addDays(w.date, -(win - 1))
    const inWin = ws.filter((x) => x.date >= from && x.date <= w.date)
    return { date: w.date, kg: inWin.reduce((a, b) => a + b.kg, 0) / inWin.length }
  })
}

export function latestWeight(weights: WeightEntry[]): WeightEntry | null {
  const ws = sortedWeights(weights)
  return ws.length ? ws[ws.length - 1] : null
}

export function latestMA(weights: WeightEntry[], win = 7): number | null {
  const ma = movingAvg(weights, win)
  return ma.length ? ma[ma.length - 1].kg : null
}

/** Linha de meta: sobe `weeklyGain` por semana ate goalWeight, depois estabiliza. */
export function goalWeightAt(s: Settings, date: ISODate): number {
  const weeks = diffDays(date, s.startDate) / 7
  const v = s.startWeight + s.weeklyGain * weeks
  return s.goalWeight >= s.startWeight
    ? Math.min(v, s.goalWeight)
    : Math.max(v, s.goalWeight)
}

/** Ritmo real em kg/semana por minimos quadrados sobre a media movel. */
export function currentRate(weights: WeightEntry[], days = 28): number | null {
  const ma = movingAvg(weights, 7)
  if (ma.length < 3) return null
  const last = ma[ma.length - 1].date
  const pts = ma.filter((p) => diffDays(last, p.date) <= days)
  if (pts.length < 3) return null
  const xs = pts.map((p) => diffDays(p.date, pts[0].date))
  const ys = pts.map((p) => p.kg)
  const n = xs.length
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    den += (xs[i] - mx) ** 2
  }
  if (den === 0) return null
  return (num / den) * 7
}

export function projectedWeight(s: Settings, weights: WeightEntry[]): number | null {
  const ma = latestMA(weights)
  const rate = currentRate(weights)
  const last = latestWeight(weights)
  if (ma == null || rate == null || !last) return null
  const weeks = diffDays(s.goalWeightDate, last.date) / 7
  if (weeks <= 0) return ma
  return ma + rate * weeks
}

// ---------------------------------------------------------------- creatina

export function tookCreatine(d: AppData, date: ISODate): boolean {
  return d.creatine.includes(date)
}

export function creatineStreak(d: AppData, today = todayISO()): number {
  let n = 0
  let cur = today
  while (d.creatine.includes(cur)) {
    n++
    cur = addDays(cur, -1)
  }
  return n
}

// ---------------------------------------------------------------- misc

export function uid(prefix = ''): string {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export function trainedOn(sessions: Session[], date: ISODate): Session | null {
  return sessions.find((s) => s.date === date && s.endedAt) ?? null
}

export function sessionsInWeek(sessions: Session[], weekStart: ISODate): number {
  const end = addDays(weekStart, 6)
  return sessions.filter((s) => s.endedAt && s.date >= weekStart && s.date <= end).length
}

export function monthKey(d: ISODate): string {
  return d.slice(0, 7)
}

export function daysUntilNextTrainingDay(settings: Settings, from = todayISO()): number {
  for (let i = 0; i <= 7; i++) {
    const d = addDays(from, i)
    if (settings.trainingDays.includes(parseISO(d).getDay())) return i
  }
  return 0
}
