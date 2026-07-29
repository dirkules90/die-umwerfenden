import { useEffect, useRef } from 'react'
import { drawFace, type Mood } from '../../characters/faceArt'

const SIZE = 128

/** Zeigt dieselbe bemalte Mimik wie der 3D-Charakter (siehe characters/faceArt.ts) als flaches
 * 2D-Badge neben dem Wurfergebnis - die kurze Reaktions-Kameraeinstellung in der 3D-Szene ist leicht
 * zu verpassen, dieses Badge bleibt dagegen so lange sichtbar wie das Ergebnis-Panel selbst. */
export function MoodFace({ mood, skinColor }: { mood: Mood; skinColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    drawFace(ctx, mood, skinColor, SIZE, SIZE)
  }, [mood, skinColor])

  return (
    <canvas
      ref={canvasRef}
      width={SIZE}
      height={SIZE}
      className="mood-face"
      aria-label={mood === 'happy' ? 'Freude' : mood === 'sad' ? 'Enttäuschung' : mood === 'meh' ? 'Naja' : 'Neutral'}
    />
  )
}
