const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function IconToday() {
  return (
    <svg className="ico" viewBox="0 0 24 24" {...base}>
      <rect x="3" y="4.5" width="18" height="16" rx="3" />
      <path d="M3 9.5h18M8 3v3M16 3v3" />
      <path d="M8.5 14.5l2.5 2.5 4.5-5" />
    </svg>
  )
}

export function IconWorkout() {
  return (
    <svg className="ico" viewBox="0 0 24 24" {...base}>
      <path d="M4 9v6M7 7.5v9M17 7.5v9M20 9v6M7 12h10" />
    </svg>
  )
}

export function IconFood() {
  return (
    <svg className="ico" viewBox="0 0 24 24" {...base}>
      <path d="M7 3v8a2.5 2.5 0 0 0 5 0V3M9.5 11v10" />
      <path d="M17.5 3c-1.4 1.6-2 3.6-2 5.6 0 1.6.7 2.6 2 2.9V21" />
    </svg>
  )
}

export function IconBody() {
  return (
    <svg className="ico" viewBox="0 0 24 24" {...base}>
      <circle cx="12" cy="5" r="2.2" />
      <path d="M12 7.5v7M12 14.5l-3 6.5M12 14.5l3 6.5M7 10.5l5-1 5 1" />
    </svg>
  )
}

export function IconGear() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...base}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v2.4M12 18.8v2.4M4.5 7.5l2 1.2M17.5 15.3l2 1.2M4.5 16.5l2-1.2M17.5 8.7l2-1.2" />
    </svg>
  )
}

export function IconCamera() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...base}>
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.8l1.2-2h6l1.2 2h1.8A2.5 2.5 0 0 1 20 8.5v9A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5z" />
      <circle cx="12" cy="13" r="3.4" />
    </svg>
  )
}
