import { photoDel, photoSet } from './db'
import { lastPerformance, slotsFor, uid } from './lib/calc'
import { todayISO } from './lib/date'
import { compressImage } from './lib/photos'
import { EXERCISE_BY_ID } from './seed'
import { getState, update } from './store'
import type {
  Angle,
  DayId,
  FoodItem,
  ISODate,
  Measurement,
  Session,
  SessionExercise,
  SetEntry,
} from './types'

// ---------------------------------------------------------------- treino

function buildExercise(
  sessions: Session[],
  exerciseId: string,
  slot: number,
  nSets: number,
  targetReps: number,
): SessionExercise {
  const last = lastPerformance(sessions, exerciseId)
  const sets: SetEntry[] = []
  for (let i = 0; i < nSets; i++) {
    const ref = last?.sets[Math.min(i, last.sets.length - 1)]
    sets.push({
      weight: ref?.weight ?? 0,
      reps: ref?.reps ?? targetReps,
      done: false,
    })
  }
  return { slot, exerciseId, sets }
}

export function startSession(day: DayId, date: ISODate = todayISO()): void {
  update((d) => {
    const slots = slotsFor(day, date)
    const s: Session = {
      id: uid('s'),
      date,
      day,
      startedAt: Date.now(),
      exercises: slots.map((sl, i) =>
        buildExercise(d.sessions, sl.exerciseId, i, sl.sets, sl.reps),
      ),
    }
    d.activeSession = s
  })
}

export function ateBefore(v: boolean) {
  update((d) => {
    if (d.activeSession) d.activeSession.ateBefore = v
  })
}

function withActive(fn: (s: Session) => void) {
  update((d) => {
    if (d.activeSession) fn(d.activeSession)
  })
}

export function setSetField(slot: number, idx: number, field: 'weight' | 'reps', value: number) {
  withActive((s) => {
    const ex = s.exercises.find((e) => e.slot === slot)
    if (!ex) return
    ex.sets[idx][field] = value
    // Ajustar uma serie ainda nao feita propaga para as seguintes:
    // na pratica voce quase sempre repete a carga que acabou de escolher.
    if (!ex.sets[idx].done && field === 'weight')
      for (let i = idx + 1; i < ex.sets.length; i++)
        if (!ex.sets[i].done) ex.sets[i].weight = value
  })
}

export function toggleSet(slot: number, idx: number, restSeconds: number) {
  withActive((s) => {
    const ex = s.exercises.find((e) => e.slot === slot)
    if (!ex) return
    const now = !ex.sets[idx].done
    ex.sets[idx].done = now
    if (now) {
      s.restUntil = Date.now() + restSeconds * 1000
      s.restTotal = restSeconds
    }
  })
}

export function addSet(slot: number) {
  withActive((s) => {
    const ex = s.exercises.find((e) => e.slot === slot)
    if (!ex) return
    const last = ex.sets[ex.sets.length - 1]
    ex.sets.push({ weight: last?.weight ?? 0, reps: last?.reps ?? 10, done: false })
  })
}

export function removeSet(slot: number) {
  withActive((s) => {
    const ex = s.exercises.find((e) => e.slot === slot)
    if (ex && ex.sets.length > 1) ex.sets.pop()
  })
}

export function replaceExercise(slot: number, newExerciseId: string) {
  update((d) => {
    const s = d.activeSession
    if (!s) return
    const ex = s.exercises.find((e) => e.slot === slot)
    if (!ex || ex.exerciseId === newExerciseId) return
    const original = ex.replacedId ?? ex.exerciseId
    const rebuilt = buildExercise(
      d.sessions,
      newExerciseId,
      slot,
      ex.sets.length,
      ex.sets[0]?.reps ?? 10,
    )
    rebuilt.replacedId = original === newExerciseId ? undefined : original
    s.exercises[s.exercises.indexOf(ex)] = rebuilt
  })
}

export function toggleSkip(slot: number) {
  withActive((s) => {
    const ex = s.exercises.find((e) => e.slot === slot)
    if (ex) ex.skipped = !ex.skipped
  })
}

export function clearRest() {
  withActive((s) => {
    s.restUntil = undefined
    s.restTotal = undefined
  })
}

export function bumpRest(seconds: number) {
  withActive((s) => {
    if (s.restUntil) s.restUntil += seconds * 1000
  })
}

export function finishSession(): string | null {
  let id: string | null = null
  update((d) => {
    const s = d.activeSession
    if (!s) return
    s.endedAt = Date.now()
    s.restUntil = undefined
    s.restTotal = undefined
    // series nao marcadas nao entram no historico
    for (const ex of s.exercises) ex.sets = ex.sets.filter((x) => x.done)
    d.sessions.push(s)
    d.activeSession = null
    id = s.id
  })
  return id
}

export function cancelSession() {
  update((d) => {
    d.activeSession = null
  })
}

export function deleteSession(id: string) {
  update((d) => {
    d.sessions = d.sessions.filter((s) => s.id !== id)
  })
}

export function restFor(exerciseId: string): number {
  const s = getState().settings
  return EXERCISE_BY_ID[exerciseId]?.kind === 'composto' ? s.restCompound : s.restIsolation
}

// ---------------------------------------------------------------- comida

export function addFood(item: FoodItem, mult = 1, useVariant = false) {
  const src = useVariant && item.variant ? item.variant : item
  update((d) => {
    d.foodLog.push({
      id: uid('f'),
      date: todayISO(),
      at: Date.now(),
      name: src.name,
      mult,
      kcal: Math.round(src.kcal * mult),
      protein: Math.round(src.protein * mult * 10) / 10,
    })
  })
}

export function addCustomFood(name: string, kcal: number, protein: number) {
  update((d) => {
    d.foodLog.push({
      id: uid('f'),
      date: todayISO(),
      at: Date.now(),
      name: name || 'Avulso',
      mult: 1,
      kcal: Math.round(kcal),
      protein: Math.round(protein * 10) / 10,
    })
  })
}

export function removeFood(id: string) {
  update((d) => {
    d.foodLog = d.foodLog.filter((f) => f.id !== id)
  })
}

export function saveFoodItem(item: FoodItem) {
  update((d) => {
    const i = d.foodItems.findIndex((f) => f.id === item.id)
    if (i >= 0) d.foodItems[i] = item
    else d.foodItems.push(item)
  })
}

export function deleteFoodItem(id: string) {
  update((d) => {
    d.foodItems = d.foodItems.filter((f) => f.id !== id)
  })
}

export function toggleCreatine(date: ISODate = todayISO()) {
  update((d) => {
    d.creatine = d.creatine.includes(date)
      ? d.creatine.filter((x) => x !== date)
      : [...d.creatine, date]
  })
}

// ---------------------------------------------------------------- corpo

export function saveWeight(kg: number, date: ISODate = todayISO()) {
  update((d) => {
    const i = d.weights.findIndex((w) => w.date === date)
    if (i >= 0) d.weights[i].kg = kg
    else d.weights.push({ date, kg })
  })
}

export function deleteWeight(date: ISODate) {
  update((d) => {
    d.weights = d.weights.filter((w) => w.date !== date)
  })
}

export function saveMeasurement(m: Measurement) {
  update((d) => {
    const i = d.measurements.findIndex((x) => x.date === m.date)
    if (i >= 0) d.measurements[i] = m
    else d.measurements.push(m)
  })
}

export function deleteMeasurement(date: ISODate) {
  update((d) => {
    d.measurements = d.measurements.filter((x) => x.date !== date)
  })
}

export async function addPhoto(file: File, angle: Angle, date: ISODate = todayISO()) {
  const { blob, w, h } = await compressImage(file)
  const id = uid('p')
  await photoSet(id, blob)
  update((d) => {
    // um registro por data+angulo: refazer a foto substitui a anterior
    const prev = d.photos.find((p) => p.date === date && p.angle === angle)
    if (prev) {
      void photoDel(prev.id)
      d.photos = d.photos.filter((p) => p.id !== prev.id)
    }
    d.photos.push({ id, date, angle, bytes: blob.size, w, h })
  })
  return id
}

export async function deletePhoto(id: string) {
  await photoDel(id).catch(() => undefined)
  update((d) => {
    d.photos = d.photos.filter((p) => p.id !== id)
  })
}

// ---------------------------------------------------------------- ajustes

export function patchSettings(patch: Partial<import('./types').Settings>) {
  update((d) => {
    d.settings = { ...d.settings, ...patch }
  })
}

export function dismissCard(id: string, until: ISODate) {
  update((d) => {
    d.settings.dismissed = { ...d.settings.dismissed, [id]: until }
  })
}

export function setStepOverride(exerciseId: string, step: number) {
  update((d) => {
    d.stepOverrides = { ...d.stepOverrides, [exerciseId]: step }
  })
}
