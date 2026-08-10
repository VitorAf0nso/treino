/**
 * Bip curto no fim do descanso. O AudioContext precisa nascer dentro de um
 * gesto do usuario (o toque que marca a serie), por isso o `arm()`.
 */
let ctx: AudioContext | null = null

export function armAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AC) ctx = new AC()
    }
    if (ctx?.state === 'suspended') void ctx.resume()
  } catch {
    /* sem audio, sem problema */
  }
}

export function beep(times = 2) {
  if (!ctx || ctx.state !== 'running') return
  const now = ctx.currentTime
  for (let i = 0; i < times; i++) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    const t0 = now + i * 0.22
    gain.gain.setValueAtTime(0, t0)
    gain.gain.linearRampToValueAtTime(0.18, t0 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + 0.2)
  }
}

export function buzz(pattern: number | number[] = [60, 60, 120]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* iOS ignora */
  }
}
