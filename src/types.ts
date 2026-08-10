export type ISODate = string // "2026-08-10"
export type DayId = 'A' | 'B' | 'C'
export type Angle = 'frente' | 'lado' | 'costas'

export interface Exercise {
  id: string
  name: string
  kind: 'composto' | 'isolado'
  /** 'kg' = carga; 'seg' = isometria (a "rep" e o tempo em segundos) */
  unit: 'kg' | 'seg'
  /** incremento do stepper de carga */
  step: number
  /** ids sugeridos como substituicao */
  alts?: string[]
}

export interface ProgramSlot {
  exerciseId: string
  sets: number
  reps: number
  /** slot so entra no programa a partir desta data */
  from?: ISODate
  note?: string
}

export interface Program {
  id: DayId
  title: string
  slots: ProgramSlot[]
}

export interface SetEntry {
  weight: number
  reps: number
  done: boolean
}

export interface SessionExercise {
  slot: number
  exerciseId: string
  /** preenchido quando houve troca: id do exercicio original do programa */
  replacedId?: string
  sets: SetEntry[]
  skipped?: boolean
}

export interface Session {
  id: string
  date: ISODate
  day: DayId
  startedAt: number
  endedAt?: number
  ateBefore?: boolean
  exercises: SessionExercise[]
  /** timestamp de fim do descanso em andamento */
  restUntil?: number
  restTotal?: number
}

export interface FoodItem {
  id: string
  name: string
  portion: string
  kcal: number
  protein: number
  /** aparece como card grande (o shake) */
  hero?: boolean
  /** variacao acessivel por toque longo */
  variant?: { name: string; portion: string; kcal: number; protein: number }
}

export interface FoodEntry {
  id: string
  date: ISODate
  at: number
  name: string
  mult: number
  kcal: number
  protein: number
}

export interface WeightEntry {
  date: ISODate
  kg: number
}

export const MEASURE_KEYS = [
  'ombros',
  'peito',
  'braco',
  'cintura',
  'quadril',
  'coxa',
  'panturrilha',
] as const
export type MeasureKey = (typeof MEASURE_KEYS)[number]

export interface Measurement extends Partial<Record<MeasureKey, number>> {
  date: ISODate
}

export interface PhotoMeta {
  id: string
  date: ISODate
  angle: Angle
  bytes: number
  w: number
  h: number
}

export interface Settings {
  goalKcal: number
  goalProtein: number
  proteinFloor: number
  goalWeight: number
  goalWeightDate: ISODate
  startWeight: number
  startDate: ISODate
  weeklyGain: number
  trainingDays: number[] // 0=dom ... 6=sab
  trainingHour: number
  travelMode: 'auto' | 'on' | 'off'
  travelFrom: ISODate
  travelTo: ISODate
  travelKcal: number
  restCompound: number
  restIsolation: number
  lastExportAt: number | null
  dismissed: Record<string, string>
}

export interface AppData {
  version: number
  settings: Settings
  foodItems: FoodItem[]
  foodLog: FoodEntry[]
  creatine: ISODate[]
  weights: WeightEntry[]
  measurements: Measurement[]
  photos: PhotoMeta[]
  sessions: Session[]
  activeSession: Session | null
  /** overrides de step por exercicio, editaveis nos ajustes */
  stepOverrides: Record<string, number>
}
