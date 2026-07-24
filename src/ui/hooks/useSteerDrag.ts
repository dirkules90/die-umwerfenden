import { useCallback, useRef } from 'react'

// Referenzbreite für volle Lenkstärke: kurze, immer wieder neu angesetzte Wischgesten
// (statt einer einzigen langen Ziehgeste) sollen bereits spürbar wirken.
const FULL_STRENGTH_PX = 70

interface UseSteerDragOptions {
  /** direction: -1 (links) bis 1 (rechts), 0 = kein Input gerade. */
  onSteer: (direction: number) => void
  disabled?: boolean
}

/** Wiederholbare, kurze Wisch-Nachkorrektur während die Kugel rollt (Teil "Spin während des
 * Rollens"): jede neue Berührung setzt den Bezugspunkt neu, sodass mehrere kurze Wischer
 * hintereinander funktionieren statt nur eine einzige lange Zuggeste. */
export function useSteerDrag({ onSteer, disabled }: UseSteerDragOptions) {
  const startX = useRef<number | null>(null)

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return
      startX.current = e.clientX
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    },
    [disabled],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (startX.current === null) return
      const dx = e.clientX - startX.current
      const direction = Math.max(-1, Math.min(1, dx / FULL_STRENGTH_PX))
      onSteer(direction)
    },
    [onSteer],
  )

  const onPointerUp = useCallback(() => {
    if (startX.current === null) return
    startX.current = null
    onSteer(0)
  }, [onSteer])

  return { onPointerDown, onPointerMove, onPointerUp }
}
