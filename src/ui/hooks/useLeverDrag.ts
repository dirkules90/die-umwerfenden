import { useCallback, useRef, useState } from 'react'

interface UseLeverDragOptions {
  onProgress: (progress: number) => void
  onComplete: () => void
  onSnapBack: () => void
}

/** Vertikale Zuggeste für den Hebel (Teil 9.3): muss bis zum Anschlag gezogen werden. */
export function useLeverDrag({ onProgress, onComplete, onSnapBack }: UseLeverDragOptions) {
  const [dragging, setDragging] = useState(false)
  const startY = useRef<number | null>(null)
  const completed = useRef(false)
  const range = useRef(180)

  const onPointerDown = useCallback((e: React.PointerEvent, containerEl: HTMLElement) => {
    const rect = containerEl.getBoundingClientRect()
    range.current = Math.max(120, rect.height * 0.8)
    startY.current = e.clientY
    completed.current = false
    setDragging(true)
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }, [])

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (startY.current === null || completed.current) return
      const dy = Math.max(0, e.clientY - startY.current)
      const progress = Math.min(dy / range.current, 1)
      onProgress(progress)
      if (progress >= 1) {
        completed.current = true
        setDragging(false)
        onComplete()
      }
    },
    [onProgress, onComplete],
  )

  const onPointerUp = useCallback(() => {
    if (startY.current === null) return
    startY.current = null
    setDragging(false)
    if (!completed.current) {
      onProgress(0)
      onSnapBack()
    }
  }, [onProgress, onSnapBack])

  return { dragging, onPointerDown, onPointerMove, onPointerUp }
}
