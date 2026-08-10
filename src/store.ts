import { useSyncExternalStore } from 'react'
import { kvGet, kvSet } from './db'
import { DATA_VERSION, DEFAULT_FOODS, DEFAULT_SETTINGS, emptyData } from './seed'
import type { AppData } from './types'

const KEY = 'app'
const MIRROR = 'treino:mirror'

let state: AppData = emptyData()
let ready = false
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function getState() {
  return state
}

/** Toda a arvore le o estado inteiro. O app e pequeno; simplicidade > memoizacao. */
export function useApp(): AppData {
  return useSyncExternalStore(subscribe, getState, getState)
}

export function useReady(): boolean {
  return useSyncExternalStore(subscribe, () => ready, () => ready)
}

let timer: number | undefined
function schedulePersist() {
  clearTimeout(timer)
  timer = setTimeout(persistNow, 400) as unknown as number
}

export async function persistNow() {
  const snapshot = state
  try {
    await kvSet(KEY, snapshot)
  } catch (err) {
    console.error('IndexedDB falhou, usando espelho em localStorage', err)
  }
  // Espelho barato: se o IndexedDB corromper, ainda da para recuperar.
  try {
    localStorage.setItem(MIRROR, JSON.stringify(snapshot))
  } catch {
    /* quota — ignoravel, o IDB e a fonte principal */
  }
}

export function update(fn: (d: AppData) => AppData | void) {
  const draft = structuredClone(state) as AppData
  const out = fn(draft)
  state = (out ?? draft) as AppData
  emit()
  schedulePersist()
}

/** Substitui tudo (usado pelo import de JSON). */
export function replaceAll(next: AppData) {
  state = migrate(next)
  emit()
  void persistNow()
}

function migrate(raw: Partial<AppData> | null | undefined): AppData {
  const base = emptyData()
  if (!raw || typeof raw !== 'object') return base
  const merged: AppData = {
    ...base,
    ...raw,
    version: DATA_VERSION,
    settings: { ...DEFAULT_SETTINGS, ...(raw.settings ?? {}) },
    foodItems: raw.foodItems?.length ? raw.foodItems : base.foodItems,
    foodLog: raw.foodLog ?? [],
    creatine: raw.creatine ?? [],
    weights: raw.weights ?? [],
    measurements: raw.measurements ?? [],
    photos: raw.photos ?? [],
    sessions: raw.sessions ?? [],
    activeSession: raw.activeSession ?? null,
    stepOverrides: raw.stepOverrides ?? {},
  }
  merged.settings.dismissed = merged.settings.dismissed ?? {}
  // Alimentos novos do seed entram sem apagar as edicoes do usuario.
  const have = new Set(merged.foodItems.map((f) => f.id))
  for (const f of DEFAULT_FOODS) if (!have.has(f.id)) merged.foodItems.push({ ...f })
  return merged
}

export async function boot() {
  let loaded: AppData | undefined
  try {
    loaded = await kvGet<AppData>(KEY)
  } catch (err) {
    console.error('falha ao ler IndexedDB', err)
  }
  if (!loaded) {
    try {
      const mirror = localStorage.getItem(MIRROR)
      if (mirror) loaded = JSON.parse(mirror) as AppData
    } catch {
      /* ignora */
    }
  }
  state = migrate(loaded)
  ready = true
  emit()
  if (!loaded) void persistNow()
}
