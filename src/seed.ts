import type { AppData, Exercise, FoodItem, Program, Settings } from './types'

/**
 * Catalogo e programa NAO sao dados do usuario: vivem aqui e sao recarregados a
 * cada boot. Assim da para corrigir/estender o programa sem migrar nada — as
 * sessoes gravadas referenciam ids, que nunca mudam.
 */
export const EXERCISES: Exercise[] = [
  // --- Dia A
  {
    id: 'supino-halteres',
    name: 'Supino reto com halteres',
    kind: 'composto',
    unit: 'kg',
    step: 2,
    alts: ['supino-barra', 'supino-maquina', 'crucifixo', 'flexao'],
  },
  {
    id: 'desenvolvimento-ombro',
    name: 'Desenvolvimento de ombro sentado',
    kind: 'composto',
    unit: 'kg',
    step: 2,
    alts: ['desenvolvimento-maquina', 'desenvolvimento-barra', 'elevacao-frontal'],
  },
  {
    id: 'leg-press',
    name: 'Leg press',
    kind: 'composto',
    unit: 'kg',
    step: 5,
    alts: ['agachamento-smith', 'hack', 'afundo'],
  },
  {
    id: 'cadeira-extensora',
    name: 'Cadeira extensora',
    kind: 'isolado',
    unit: 'kg',
    step: 5,
    alts: ['leg-press', 'afundo'],
  },
  {
    id: 'triceps-corda',
    name: 'Triceps na polia com corda',
    kind: 'isolado',
    unit: 'kg',
    step: 5,
    alts: ['triceps-testa', 'triceps-frances', 'mergulho-banco'],
  },
  {
    id: 'prancha',
    name: 'Prancha',
    kind: 'isolado',
    unit: 'seg',
    step: 5,
    alts: ['abdominal-solo', 'prancha-lateral'],
  },

  // --- Dia B
  {
    id: 'puxada-alta',
    name: 'Puxada alta',
    kind: 'composto',
    unit: 'kg',
    step: 5,
    alts: ['puxada-triangulo', 'barra-assistida', 'remada-maquina'],
  },
  {
    id: 'remada-baixa',
    name: 'Remada baixa',
    kind: 'composto',
    unit: 'kg',
    step: 5,
    alts: ['remada-curvada', 'remada-maquina', 'remada-serrote'],
  },
  {
    id: 'mesa-flexora',
    name: 'Mesa flexora',
    kind: 'isolado',
    unit: 'kg',
    step: 5,
    alts: ['cadeira-flexora', 'stiff'],
  },
  {
    id: 'elevacao-lateral',
    name: 'Elevacao lateral',
    kind: 'isolado',
    unit: 'kg',
    step: 1,
    alts: ['elevacao-lateral-maquina', 'elevacao-frontal'],
  },
  {
    id: 'rosca-direta',
    name: 'Rosca direta',
    kind: 'isolado',
    unit: 'kg',
    step: 2,
    alts: ['rosca-halteres', 'rosca-scott', 'rosca-martelo'],
  },
  {
    id: 'panturrilha-pe',
    name: 'Panturrilha em pe',
    kind: 'isolado',
    unit: 'kg',
    step: 5,
    alts: ['panturrilha-sentado', 'panturrilha-leg-press'],
  },
  {
    id: 'encolhimento',
    name: 'Encolhimento com halteres',
    kind: 'isolado',
    unit: 'kg',
    step: 2,
    alts: ['encolhimento-barra'],
  },

  // --- Dia C
  {
    id: 'agachamento-smith',
    name: 'Agachamento no Smith',
    kind: 'composto',
    unit: 'kg',
    step: 5,
    alts: ['agachamento-livre', 'leg-press', 'hack'],
  },
  {
    id: 'supino-inclinado',
    name: 'Supino inclinado com halteres',
    kind: 'composto',
    unit: 'kg',
    step: 2,
    alts: ['supino-inclinado-maquina', 'crucifixo-inclinado', 'supino-halteres'],
  },
  {
    id: 'remada-serrote',
    name: 'Remada serrote',
    kind: 'composto',
    unit: 'kg',
    step: 2,
    alts: ['remada-baixa', 'remada-maquina', 'remada-curvada'],
  },
  {
    id: 'face-pull',
    name: 'Face pull',
    kind: 'isolado',
    unit: 'kg',
    step: 5,
    alts: ['crucifixo-inverso', 'elevacao-lateral'],
  },
  {
    id: 'rosca-martelo',
    name: 'Rosca martelo',
    kind: 'isolado',
    unit: 'kg',
    step: 2,
    alts: ['rosca-direta', 'rosca-halteres'],
  },
  {
    id: 'stiff',
    name: 'Stiff com halteres',
    kind: 'composto',
    unit: 'kg',
    step: 2,
    alts: ['mesa-flexora', 'levantamento-terra'],
  },

  // --- Substitutos (nao estao no programa, existem para troca)
  { id: 'supino-barra', name: 'Supino reto com barra', kind: 'composto', unit: 'kg', step: 5 },
  { id: 'supino-maquina', name: 'Supino na maquina', kind: 'composto', unit: 'kg', step: 5 },
  { id: 'crucifixo', name: 'Crucifixo', kind: 'isolado', unit: 'kg', step: 2 },
  { id: 'crucifixo-inclinado', name: 'Crucifixo inclinado', kind: 'isolado', unit: 'kg', step: 2 },
  {
    id: 'supino-inclinado-maquina',
    name: 'Supino inclinado na maquina',
    kind: 'composto',
    unit: 'kg',
    step: 5,
  },
  { id: 'flexao', name: 'Flexao de braco', kind: 'composto', unit: 'seg', step: 1 },
  {
    id: 'desenvolvimento-maquina',
    name: 'Desenvolvimento na maquina',
    kind: 'composto',
    unit: 'kg',
    step: 5,
  },
  {
    id: 'desenvolvimento-barra',
    name: 'Desenvolvimento com barra',
    kind: 'composto',
    unit: 'kg',
    step: 5,
  },
  { id: 'elevacao-frontal', name: 'Elevacao frontal', kind: 'isolado', unit: 'kg', step: 1 },
  {
    id: 'elevacao-lateral-maquina',
    name: 'Elevacao lateral na maquina',
    kind: 'isolado',
    unit: 'kg',
    step: 5,
  },
  { id: 'crucifixo-inverso', name: 'Crucifixo inverso', kind: 'isolado', unit: 'kg', step: 5 },
  { id: 'hack', name: 'Hack machine', kind: 'composto', unit: 'kg', step: 5 },
  { id: 'agachamento-livre', name: 'Agachamento livre', kind: 'composto', unit: 'kg', step: 5 },
  { id: 'afundo', name: 'Afundo / passada', kind: 'composto', unit: 'kg', step: 2 },
  { id: 'cadeira-flexora', name: 'Cadeira flexora', kind: 'isolado', unit: 'kg', step: 5 },
  {
    id: 'levantamento-terra',
    name: 'Levantamento terra',
    kind: 'composto',
    unit: 'kg',
    step: 5,
  },
  { id: 'panturrilha-sentado', name: 'Panturrilha sentado', kind: 'isolado', unit: 'kg', step: 5 },
  {
    id: 'panturrilha-leg-press',
    name: 'Panturrilha no leg press',
    kind: 'isolado',
    unit: 'kg',
    step: 5,
  },
  { id: 'puxada-triangulo', name: 'Puxada com triangulo', kind: 'composto', unit: 'kg', step: 5 },
  { id: 'barra-assistida', name: 'Barra fixa assistida', kind: 'composto', unit: 'kg', step: 5 },
  { id: 'remada-maquina', name: 'Remada na maquina', kind: 'composto', unit: 'kg', step: 5 },
  { id: 'remada-curvada', name: 'Remada curvada', kind: 'composto', unit: 'kg', step: 5 },
  { id: 'triceps-testa', name: 'Triceps testa', kind: 'isolado', unit: 'kg', step: 2 },
  { id: 'triceps-frances', name: 'Triceps frances', kind: 'isolado', unit: 'kg', step: 2 },
  { id: 'mergulho-banco', name: 'Mergulho no banco', kind: 'isolado', unit: 'seg', step: 1 },
  { id: 'rosca-halteres', name: 'Rosca alternada com halteres', kind: 'isolado', unit: 'kg', step: 2 },
  { id: 'rosca-scott', name: 'Rosca scott', kind: 'isolado', unit: 'kg', step: 2 },
  { id: 'encolhimento-barra', name: 'Encolhimento com barra', kind: 'isolado', unit: 'kg', step: 5 },
  { id: 'abdominal-solo', name: 'Abdominal no solo', kind: 'isolado', unit: 'seg', step: 5 },
  { id: 'prancha-lateral', name: 'Prancha lateral', kind: 'isolado', unit: 'seg', step: 5 },
]

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e]),
)

/** Data em que entram encolhimento (B) e stiff (C). */
export const PHASE2_FROM = '2026-09-01'

export const PROGRAMS: Program[] = [
  {
    id: 'A',
    title: 'Peito e Ombro',
    slots: [
      { exerciseId: 'supino-halteres', sets: 3, reps: 10 },
      { exerciseId: 'desenvolvimento-ombro', sets: 3, reps: 10 },
      { exerciseId: 'leg-press', sets: 3, reps: 12 },
      { exerciseId: 'cadeira-extensora', sets: 2, reps: 12 },
      { exerciseId: 'triceps-corda', sets: 3, reps: 12 },
      { exerciseId: 'prancha', sets: 3, reps: 30 },
    ],
  },
  {
    id: 'B',
    title: 'Costas',
    slots: [
      { exerciseId: 'puxada-alta', sets: 3, reps: 10 },
      { exerciseId: 'remada-baixa', sets: 3, reps: 10 },
      { exerciseId: 'mesa-flexora', sets: 3, reps: 12 },
      { exerciseId: 'elevacao-lateral', sets: 3, reps: 12 },
      { exerciseId: 'rosca-direta', sets: 3, reps: 12 },
      { exerciseId: 'panturrilha-pe', sets: 3, reps: 15 },
      { exerciseId: 'encolhimento', sets: 3, reps: 15, from: PHASE2_FROM },
    ],
  },
  {
    id: 'C',
    title: 'Perna',
    slots: [
      { exerciseId: 'agachamento-smith', sets: 3, reps: 10 },
      { exerciseId: 'leg-press', sets: 2, reps: 12 },
      { exerciseId: 'supino-inclinado', sets: 3, reps: 10 },
      { exerciseId: 'remada-serrote', sets: 3, reps: 10, note: 'cada lado' },
      { exerciseId: 'face-pull', sets: 3, reps: 15 },
      { exerciseId: 'rosca-martelo', sets: 2, reps: 12 },
      { exerciseId: 'stiff', sets: 3, reps: 12, from: PHASE2_FROM },
    ],
  },
]

export const DEFAULT_FOODS: FoodItem[] = [
  {
    id: 'shake',
    name: 'Shake',
    portion: 'agua + aveia 100g + banana 150g + amendoim 60g + acucar 40g',
    kcal: 1030,
    protein: 30,
    hero: true,
    variant: {
      name: 'Shake com leite',
      portion: 'leite 500ml + aveia 80g + banana 130g + amendoim 60g + mel 30g + nescau 30g',
      kcal: 1300,
      protein: 45,
    },
  },
  { id: 'ovo', name: 'Ovo', portion: '1 unidade', kcal: 72, protein: 6.3 },
  { id: 'frango', name: 'Frango', portion: '150 g', kcal: 240, protein: 46 },
  { id: 'arroz-feijao', name: 'Arroz + feijao', portion: 'prato', kcal: 440, protein: 14 },
  { id: 'pao-manteiga', name: 'Pao c/ manteiga', portion: '1 unidade', kcal: 212, protein: 5 },
  { id: 'pasta-amendoim', name: 'Pasta de amendoim', portion: '30 g', kcal: 180, protein: 7 },
  { id: 'leite', name: 'Leite integral', portion: '300 ml', kcal: 190, protein: 9.6 },
  { id: 'banana', name: 'Banana', portion: '130 g', kcal: 116, protein: 1.4 },
  { id: 'macarrao', name: 'Macarrao', portion: 'prato', kcal: 320, protein: 11 },
  { id: 'azeite', name: 'Azeite', portion: 'fio (10 ml)', kcal: 90, protein: 0 },
]

export const DEFAULT_SETTINGS: Settings = {
  goalKcal: 3000,
  goalProtein: 125,
  proteinFloor: 102,
  goalWeight: 72,
  goalWeightDate: '2026-12-28',
  startWeight: 64,
  startDate: '2026-08-10',
  weeklyGain: 0.4,
  trainingDays: [1, 3, 5], // seg, qua, sex
  trainingHour: 15,
  travelMode: 'auto',
  travelFrom: '2026-09-01',
  travelTo: '2026-09-30',
  travelKcal: 2600,
  restCompound: 120,
  restIsolation: 75,
  lastExportAt: null,
  dismissed: {},
}

export const DATA_VERSION = 1

export function emptyData(): AppData {
  return {
    version: DATA_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    foodItems: DEFAULT_FOODS.map((f) => ({ ...f })),
    foodLog: [],
    creatine: [],
    weights: [{ date: '2026-08-10', kg: 64 }],
    measurements: [],
    photos: [],
    sessions: [],
    activeSession: null,
    stepOverrides: {},
  }
}
