import type { AppData, ISODate } from '../types'
import { avgKcal, completedWeeks, goalKcalFor, isTravel, movingAvg, totalsFor } from './calc'
import { addDays, diffDays, fmtDM, todayISO } from './date'

export type CardTone = 'info' | 'warn' | 'danger'

export interface AlertCard {
  id: string
  tone: CardTone
  title: string
  body: string
  /** se definido, o card ganha um botao de dispensar por 7 dias */
  dismissible?: boolean
}

const DISMISS_DAYS = 7

function active(d: AppData, id: string, today: ISODate): boolean {
  const until = d.settings.dismissed[id]
  return !until || diffDays(today, until) > 0
}

export function buildCards(d: AppData, today: ISODate = todayISO()): AlertCard[] {
  const cards: AlertCard[] = []
  const goal = goalKcalFor(d.settings, today)

  // R5 — modo viagem
  if (isTravel(d.settings, today)) {
    cards.push({
      id: 'travel',
      tone: 'info',
      title: 'Modo viagem ativo',
      body: `Meta em ${goal.toLocaleString('pt-BR')} kcal (manutencao) ate ${fmtDM(
        d.settings.travelTo,
      )}. Objetivo do mes: nao perder peso.`,
    })
  }

  // R1 — duas semanas seguidas abaixo de 85% da meta
  const weeks = completedWeeks(d, 2, today)
  const hasLogs = d.foodLog.length > 0
  if (hasLogs && weeks.length === 2 && weeks.every((w) => w.avg > 0 && w.avg < w.goal * 0.85)) {
    const media = Math.round((weeks[0].avg + weeks[1].avg) / 2)
    cards.push({
      id: 'two-weeks-low',
      tone: 'warn',
      title: 'Duas semanas abaixo da meta',
      body: `Media de ${media.toLocaleString('pt-BR')} kcal/dia contra meta de ${goal.toLocaleString(
        'pt-BR',
      )}. Sugestao: cair para 2 treinos/semana ate a comida voltar. Treinar sem comer e pior que nao treinar.`,
      dismissible: true,
    })
  }

  // R2 — peso parado com a meta batida: a manutencao foi subestimada
  const ma = movingAvg(d.weights, 7)
  if (ma.length >= 4) {
    const last = ma[ma.length - 1]
    const ref = [...ma].reverse().find((p) => diffDays(last.date, p.date) >= 21)
    if (ref) {
      const delta = last.kg - ref.kg
      const avg21 = avgKcal(d, ref.date, last.date)
      if (delta < 0.15 && avg21 >= goal * 0.95 && !isTravel(d.settings, today)) {
        cards.push({
          id: 'plateau',
          tone: 'warn',
          title: 'Peso parado com a meta batida',
          body: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} kg em 3 semanas comendo ~${Math.round(
            avg21,
          ).toLocaleString('pt-BR')} kcal/dia. A manutencao esta acima do estimado: suba a meta para ${(
            goal + 200
          ).toLocaleString('pt-BR')} kcal.`,
          dismissible: true,
        })
      }
    }
  }

  // R3 — treino proximo sem nada registrado
  const t = totalsFor(d, today)
  const hour = new Date().getHours()
  const isTrainingDay = d.settings.trainingDays.includes(new Date().getDay())
  const nearWorkout = hour >= d.settings.trainingHour - 3 && hour <= d.settings.trainingHour + 1
  if (isTrainingDay && nearWorkout && t.kcal < 300 && !d.sessions.some((s) => s.date === today)) {
    cards.push({
      id: 'fasted',
      tone: 'danger',
      title: 'Coma antes de treinar',
      body: 'Nada registrado hoje e o treino e daqui a pouco. Ja passou mal treinando em jejum — nao repita.',
    })
  }

  // R4 — backup
  const hasData = d.sessions.length + d.weights.length + d.foodLog.length > 12
  const lastExport = d.settings.lastExportAt
  if (hasData && (!lastExport || Date.now() - lastExport > 30 * 86400000)) {
    cards.push({
      id: 'backup',
      tone: 'info',
      title: 'Exporte um backup',
      body: lastExport
        ? `Ultimo backup ha ${Math.round((Date.now() - lastExport) / 86400000)} dias. Ajustes > Exportar JSON.`
        : 'Voce ainda nao exportou nenhum backup. Ajustes > Exportar JSON.',
      dismissible: true,
    })
  }

  return cards.filter((c) => active(d, c.id, today))
}

export function dismissUntil(today: ISODate = todayISO()): ISODate {
  return addDays(today, DISMISS_DAYS)
}
