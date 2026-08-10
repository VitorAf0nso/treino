import { ToastHost } from './components/ui'
import { IconBody, IconFood, IconToday, IconWorkout } from './components/icons'
import { isFullscreen, push, setRoot, tabOf, useRoute, type TabId } from './nav'
import { useApp, useReady } from './store'
import Body from './screens/Body'
import ExerciseScreen from './screens/ExerciseScreen'
import Food from './screens/Food'
import FoodItems from './screens/FoodItems'
import Measure from './screens/Measure'
import PhotoCompare from './screens/PhotoCompare'
import Program from './screens/Program'
import SessionDetail from './screens/SessionDetail'
import SessionScreen from './screens/Session'
import Settings from './screens/Settings'
import Today from './screens/Today'
import Workout from './screens/Workout'

const TABS: { id: TabId; label: string; icon: () => JSX.Element }[] = [
  { id: 'today', label: 'HOJE', icon: IconToday },
  { id: 'workout', label: 'TREINO', icon: IconWorkout },
  { id: 'food', label: 'COMIDA', icon: IconFood },
  { id: 'body', label: 'CORPO', icon: IconBody },
]

export default function App() {
  const route = useRoute()
  const ready = useReady()
  const d = useApp()
  const full = isFullscreen(route)
  const current = tabOf(route)

  if (!ready)
    return (
      <div className="app no-tabs">
        <div className="wrap empty">carregando…</div>
      </div>
    )

  return (
    <>
      <div className={full ? 'app no-tabs' : 'app'}>{render(route)}</div>

      {!full && (
        <nav className="tabbar">
          {TABS.map((t) => {
            const Icon = t.icon
            const on = current === t.id
            return (
              <button
                key={t.id}
                className={on ? 'on' : ''}
                onClick={() =>
                  setRoot(
                    t.id === 'body'
                      ? { t: 'body', tab: 'peso' }
                      : ({ t: t.id } as never),
                  )
                }
              >
                <Icon />
                <span>{t.label}</span>
              </button>
            )
          })}
        </nav>
      )}

      {!full && d.activeSession && route.t !== 'session' && <ResumeBanner />}
      <ToastHost />
    </>
  )
}

function ResumeBanner() {
  const d = useApp()
  const s = d.activeSession
  if (!s) return null
  return (
    <button
      className="toast"
      style={{
        background: 'var(--accent)',
        color: 'var(--accent-ink)',
        borderColor: 'var(--accent)',
        fontWeight: 650,
      }}
      onClick={() => {
        // root em Treino para o botao voltar da sessao cair num lugar coerente
        setRoot({ t: 'workout' })
        push({ t: 'session' })
      }}
    >
      ▶ Treino {s.day} em andamento — continuar
    </button>
  )
}

function render(route: ReturnType<typeof useRoute>) {
  switch (route.t) {
    case 'today':
      return <Today />
    case 'workout':
      return <Workout />
    case 'session':
      return <SessionScreen />
    case 'exercise':
      return <ExerciseScreen id={route.id} />
    case 'sessionDetail':
      return <SessionDetail id={route.id} />
    case 'food':
      return <Food />
    case 'foodItems':
      return <FoodItems />
    case 'body':
      return <Body tab={route.tab} />
    case 'measure':
      return <Measure date={route.date} />
    case 'photoCompare':
      return <PhotoCompare angle={route.angle} />
    case 'settings':
      return <Settings />
    case 'program':
      return <Program day={route.day} />
  }
}
