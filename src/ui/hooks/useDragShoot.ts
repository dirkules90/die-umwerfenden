import { useCallback, useRef, useState } from 'react'

// Steuerungsparameter gemäß Teil 7.3.
const MAX_PULL_FRACTION_OF_EDGE = 0.35
const DEADZONE_FRACTION_OF_EDGE = 0.05
const MAX_ANGLE_DEG = 20
// Laterale Geschwindigkeit (px/ms) beim Loslassen, die vollen Spin (±1) ergibt - ein schneller
// seitlicher "Flick" am Ende der Zuggeste, unabhängig von der (statischen) Zielrichtung.
const FLICK_SPEED_FOR_MAX_SPIN = 1.4
const SPIN_HISTORY_WINDOW_MS = 120

export interface AimState {
  active: boolean
  pullFraction: number
  angleDeg: number
}

interface PointerSample {
  x: number
  t: number
}

interface UseDragShootOptions {
  onAimStart?: () => void
  onAimUpdate?: (pullFraction: number, angleDeg: number) => void
  /** spin: -1 (Linksdrall) bis 1 (Rechtsdrall), aus der seitlichen Schwunggeschwindigkeit beim Loslassen. */
  onRelease?: (power: number, angleDeg: number, spin: number) => void
  onCancel?: () => void
  disabled?: boolean
}

export function useDragShoot(options: UseDragShootOptions) {
  const [aim, setAim] = useState<AimState>({ active: false, pullFraction: 0, angleDeg: 0 })
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const shortEdgeRef = useRef(400)
  const historyRef = useRef<PointerSample[]>([])

  const computeFromPoint = useCallback((x: number, y: number) => {
    const start = startRef.current
    if (!start) return { pullFraction: 0, angleDeg: 0, rawDy: 0 }
    const shortEdge = shortEdgeRef.current
    const maxPull = shortEdge * MAX_PULL_FRACTION_OF_EDGE
    const deadzone = shortEdge * DEADZONE_FRACTION_OF_EDGE
    const dy = Math.max(0, y - start.y)
    const dx = x - start.x

    const usable = Math.max(1, maxPull - deadzone)
    const linear = Math.min(Math.max(0, dy - deadzone) / usable, 1)
    const eased = Math.pow(linear, 1.6)

    const angleRaw = (dx / maxPull) * MAX_ANGLE_DEG
    const angleDeg = Math.max(-MAX_ANGLE_DEG, Math.min(MAX_ANGLE_DEG, angleRaw))

    return { pullFraction: eased, angleDeg, rawDy: dy }
  }, [])

  const computeSpin = useCallback(() => {
    const history = historyRef.current
    if (history.length < 2) return 0
    const last = history[history.length - 1]
    let reference = history[0]
    for (const sample of history) {
      if (last.t - sample.t <= SPIN_HISTORY_WINDOW_MS) {
        reference = sample
        break
      }
    }
    const dtMs = last.t - reference.t
    if (dtMs < 8) return 0
    const velocity = (last.x - reference.x) / dtMs
    return Math.max(-1, Math.min(1, velocity / FLICK_SPEED_FOR_MAX_SPIN))
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent, containerEl: HTMLElement) => {
      if (options.disabled) return
      const rect = containerEl.getBoundingClientRect()
      shortEdgeRef.current = Math.min(rect.width, rect.height)
      startRef.current = { x: e.clientX, y: e.clientY }
      historyRef.current = [{ x: e.clientX, t: performance.now() }]
      setAim({ active: true, pullFraction: 0, angleDeg: 0 })
      options.onAimStart?.()
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    },
    [options],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startRef.current) return
      const { pullFraction, angleDeg } = computeFromPoint(e.clientX, e.clientY)
      setAim({ active: true, pullFraction, angleDeg })
      options.onAimUpdate?.(pullFraction, angleDeg)

      const history = historyRef.current
      history.push({ x: e.clientX, t: performance.now() })
      const cutoff = performance.now() - SPIN_HISTORY_WINDOW_MS * 2
      historyRef.current = history.filter((s) => s.t >= cutoff)
    },
    [computeFromPoint, options],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!startRef.current) return
      const { pullFraction, angleDeg } = computeFromPoint(e.clientX, e.clientY)
      const spin = computeSpin()
      startRef.current = null
      setAim({ active: false, pullFraction: 0, angleDeg: 0 })
      if (pullFraction > 0) {
        options.onRelease?.(pullFraction, angleDeg, spin)
      } else {
        options.onCancel?.()
      }
    },
    [computeFromPoint, computeSpin, options],
  )

  return { aim, onPointerDown, onPointerMove, onPointerUp }
}
