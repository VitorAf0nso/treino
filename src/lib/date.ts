import type { ISODate } from '../types'

const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
const WD_LONG = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
const MON = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** Meio-dia local: imune a fuso e horario de verao ao fazer aritmetica de dias. */
export function parseISO(d: ISODate): Date {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day, 12, 0, 0, 0)
}

export function toISO(d: Date): ISODate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): ISODate {
  return toISO(new Date())
}

export function addDays(d: ISODate, n: number): ISODate {
  const x = parseISO(d)
  x.setDate(x.getDate() + n)
  return toISO(x)
}

export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((parseISO(a).getTime() - parseISO(b).getTime()) / 86400000)
}

export function weekdayIndex(d: ISODate): number {
  return parseISO(d).getDay()
}

/** Segunda-feira da semana de `d`. */
export function startOfWeek(d: ISODate): ISODate {
  const wd = weekdayIndex(d)
  return addDays(d, wd === 0 ? -6 : 1 - wd)
}

export const fmtDM = (d: ISODate) => {
  const x = parseISO(d)
  return `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}`
}

export const fmtDMY = (d: ISODate) => `${fmtDM(d)}/${parseISO(d).getFullYear()}`

export const fmtHeader = (d: ISODate) => {
  const x = parseISO(d)
  return `${WD[x.getDay()].toUpperCase()} · ${x.getDate()} ${MON[x.getMonth()].toUpperCase()}`
}

export const fmtMonth = (d: ISODate) => {
  const x = parseISO(d)
  return `${MON[x.getMonth()]}/${String(x.getFullYear()).slice(2)}`
}

export const weekdayName = (i: number) => WD_LONG[i]
export const weekdayShort = (i: number) => WD[i]

export function fmtTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** "hoje", "ontem", "6 dias atras" */
export function relativeDay(d: ISODate, from: ISODate = todayISO()): string {
  const n = diffDays(from, d)
  if (n === 0) return 'hoje'
  if (n === 1) return 'ontem'
  if (n < 0) return `em ${-n} dia${-n > 1 ? 's' : ''}`
  return `${n} dias atras`
}
