import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from 'react'

// ------------------------------------------------------------------ toast

let toastSetter: ((v: string | null) => void) | null = null
let toastTimer: number | undefined

export function toast(msg: string) {
  toastSetter?.(msg)
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toastSetter?.(null), 2200) as unknown as number
}

export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    toastSetter = setMsg
    return () => {
      toastSetter = null
    }
  }, [])
  if (!msg) return null
  return <div className="toast">{msg}</div>
}

// ------------------------------------------------------------------ barra

export function ProgressBar({
  value,
  goal,
  low,
}: {
  value: number
  goal: number
  low?: boolean
}) {
  const pct = goal > 0 ? (value / goal) * 100 : 0
  const cls = pct >= 100 ? 'bar-fill over' : low ? 'bar-fill low' : 'bar-fill'
  return (
    <div className="bar-track">
      <div className={cls} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  )
}

export function Metric({
  label,
  value,
  goal,
  unit,
  low,
}: {
  label: string
  value: number
  goal: number
  unit?: string
  low?: boolean
}) {
  return (
    <div>
      <div className="row between" style={{ marginBottom: 6 }}>
        <span className="small muted">{label}</span>
        <span className="small">
          <strong>{value.toLocaleString('pt-BR')}</strong>
          <span className="muted">
            {' '}
            / {goal.toLocaleString('pt-BR')}
            {unit ? ` ${unit}` : ''}
          </span>
        </span>
      </div>
      <ProgressBar value={value} goal={goal} low={low} />
    </div>
  )
}

// ------------------------------------------------------------------ stepper

interface StepperProps {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  unit?: string
  decimals?: number
  editable?: boolean
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  unit,
  decimals = 1,
  editable = true,
}: StepperProps) {
  const [text, setText] = useState<string | null>(null)
  const hold = useRef<{ t?: number; i?: number }>({})

  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100))

  const bump = useCallback(
    (dir: number) => {
      onChange(clamp(value + dir * step))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, step, min, max, onChange],
  )

  // press-and-hold acelera: segurar 450ms passa a repetir a cada 90ms
  const start = (dir: number) => {
    bump(dir)
    hold.current.t = setTimeout(() => {
      hold.current.i = setInterval(() => bump(dir), 90) as unknown as number
    }, 450) as unknown as number
  }
  const stop = () => {
    clearTimeout(hold.current.t)
    clearInterval(hold.current.i)
  }
  useEffect(() => stop, [])

  const shown =
    text ?? (Number.isInteger(value) ? String(value) : value.toFixed(decimals).replace('.', ','))

  return (
    <div className="stepper">
      <button
        aria-label="diminuir"
        onPointerDown={() => start(-1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
      >
        −
      </button>
      <div className="val">
        {editable ? (
          <input
            inputMode="decimal"
            value={shown}
            onFocus={(e) => {
              setText(shown)
              e.currentTarget.select()
            }}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => {
              const v = parseFloat((text ?? '').replace(',', '.'))
              if (!Number.isNaN(v)) onChange(clamp(v))
              setText(null)
            }}
          />
        ) : (
          <span>{shown}</span>
        )}
        {unit && <span className="unit">{unit}</span>}
      </div>
      <button
        aria-label="aumentar"
        onPointerDown={() => start(1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
      >
        +
      </button>
    </div>
  )
}

// ------------------------------------------------------------------ toggle

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className={on ? 'toggle on' : 'toggle'}
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
    >
      <span className="knob" />
    </button>
  )
}

// ------------------------------------------------------------------ sheet

export function Sheet({
  open,
  onClose,
  title,
  children,
}: PropsWithChildren<{ open: boolean; onClose: () => void; title?: string }>) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])
  if (!open) return null
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="handle" />
        {title && (
          <h2 style={{ marginBottom: 14 }}>
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ topbar

export function TopBar({
  title,
  onBack,
  right,
}: {
  title: string
  onBack?: () => void
  right?: ReactNode
}) {
  return (
    <div className="topbar">
      {onBack && (
        <button className="back" onClick={onBack} aria-label="voltar">
          ‹
        </button>
      )}
      <h1>{title}</h1>
      <div className="spacer" />
      {right}
    </div>
  )
}

// ------------------------------------------------------------------ segmented

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button
          key={o.value}
          className={o.value === value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------ long press

/** Toque curto vs toque longo, com o mesmo alvo. */
export function useLongPress(onPress: () => void, onLong: () => void, ms = 480) {
  const fired = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  return {
    onPointerDown: () => {
      fired.current = false
      timer.current = setTimeout(() => {
        fired.current = true
        onLong()
      }, ms) as unknown as number
    },
    onPointerUp: () => {
      clearTimeout(timer.current)
      if (!fired.current) onPress()
    },
    onPointerLeave: () => clearTimeout(timer.current),
    onPointerCancel: () => clearTimeout(timer.current),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  }
}

// ------------------------------------------------------------------ confirm

export function ConfirmSheet({
  open,
  title,
  body,
  confirmLabel = 'Confirmar',
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  body?: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      {body && (
        <p className="muted small" style={{ marginTop: -6, marginBottom: 18, lineHeight: 1.5 }}>
          {body}
        </p>
      )}
      <div className="stack">
        <button className={danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button className="btn btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </Sheet>
  )
}
