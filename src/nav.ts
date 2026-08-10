import { useSyncExternalStore } from 'react'
import type { Angle, DayId } from './types'

export type Route =
  | { t: 'today' }
  | { t: 'workout' }
  | { t: 'session' }
  | { t: 'exercise'; id: string }
  | { t: 'sessionDetail'; id: string }
  | { t: 'food' }
  | { t: 'foodItems' }
  | { t: 'body'; tab?: 'peso' | 'medidas' | 'fotos' }
  | { t: 'measure'; date?: string }
  | { t: 'photoCompare'; angle?: Angle }
  | { t: 'settings' }
  | { t: 'program'; day?: DayId }

export type TabId = 'today' | 'workout' | 'food' | 'body'

let stack: Route[] = [{ t: 'today' }]
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

const snapshot = () => stack
export function useStack(): Route[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

export function useRoute(): Route {
  const s = useStack()
  return s[s.length - 1]
}

export function push(r: Route) {
  stack = [...stack, r]
  try {
    history.pushState({ depth: stack.length }, '')
  } catch {
    /* ignora */
  }
  emit()
}

export function pop() {
  if (stack.length <= 1) return
  // deixa o popstate fazer o trabalho, para o gesto de voltar do iOS ficar coerente
  try {
    history.back()
  } catch {
    stack = stack.slice(0, -1)
    emit()
  }
}

export function replaceTop(r: Route) {
  stack = [...stack.slice(0, -1), r]
  emit()
}

export function setRoot(r: Route) {
  stack = [r]
  emit()
}

export function tabOf(r: Route): TabId {
  switch (r.t) {
    case 'workout':
    case 'session':
    case 'exercise':
    case 'sessionDetail':
    case 'program':
      return 'workout'
    case 'food':
    case 'foodItems':
      return 'food'
    case 'body':
    case 'measure':
    case 'photoCompare':
      return 'body'
    default:
      return 'today'
  }
}

/** Telas que ocupam a tela inteira (sem tab bar). */
export function isFullscreen(r: Route): boolean {
  return r.t === 'session' || r.t === 'photoCompare'
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (stack.length > 1) {
      stack = stack.slice(0, -1)
      emit()
    }
  })
}
