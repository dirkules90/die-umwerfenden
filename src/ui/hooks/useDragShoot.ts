import { useCallback, useRef, useState } from 'react'

// Steuerungsparameter gemäß Teil 7.3.
const MAX_PULL_FRACTION_OF_EDGE = 0.35
const DEADZONE_FRACTION_OF_EDGE = 0.05
const MAX_ANGLE_DEG = 20

export interface AimState {
  active: boolean
  pullFraction: number
  angleDeg: number
}

interface UseDragShootOptions {
  onAimStart?: () => void
  onAimUpdate?: (pullFraction: number, angleDeg: number) => void
  onRelease?: (power: number, angleDeg: number, spin: number) => void
  onCancel?: () => void
  disabled?: boolean
}

export function useDragShoot(options: UseDragShootOptions) {
  const [aim, setAim] = useState<AimState>({ active: false, pullFraction: 0, angleDeg: 0 })
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const shortEdgeRef = useRef(400)

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

  const onPointerDown = useCallback(
    (e: React.PointerEvent, containerEl: HTMLElement) => {
      if (options.disabled) return
      const rect = containerEl.getBoundingClientRect()
      shortEdgeRef.current = Math.min(rect.width, rect.height)
      startRef.current = { x: e.clientX, y: e.clientY }
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
    },
    [computeFromPoint, options],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!startRef.current) return
      const { pullFraction, angleDeg } = computeFromPoint(e.clientX, e.clientY)
      startRef.current = null
      setAim({ active: false, pullFraction: 0, angleDeg: 0 })
      if (pullFraction > 0) {
        const spin = angleDeg / MAX_ANGLE_DEG
        options.onRelease?.(pullFraction, angleDeg, spin)
      } else {
        options.onCancel?.()
      }
    },
    [computeFromPoint, options],
  )

  return { aim, onPointerDown, onPointerMove, onPointerUp }
}
