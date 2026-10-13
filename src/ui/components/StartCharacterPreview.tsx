import { useEffect, useRef } from 'react'
import { CharacterPreviewScene, FULL_BODY_PREVIEW_CAMERA } from '../../characters/CharacterPreviewScene'
import { AVATAR_CONFIGS } from '../../characters/avatarConfigs'
import { cosmeticsFor, useGameStore } from '../../state/gameStore'
import type { CharacterId } from '../../game/types'

/**
 * 3D-Vorschau des eingeloggten Charakters auf dem Startbildschirm (Nutzer-Wunsch: "dann sieht man
 * auch was man gekauft hat und wie der Charakter aussieht") - dieselbe leichtgewichtige
 * CharacterPreviewScene wie im Shop, nur mit einer volleren Körper-Kamera statt der engen
 * Oberkörper-Nahaufnahme dort. Wird von StartScreen nur lazy geladen und nur gerendert, solange
 * wirklich jemand eingeloggt ist - der Start-Bildschirm selbst bleibt dadurch beim allerersten
 * App-Start weiterhin sofort da, ganz ohne WebGL-Overhead.
 */
export function StartCharacterPreview({ playerId }: { playerId: CharacterId }) {
  const cosmetics = useGameStore((s) => s.cosmetics)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<CharacterPreviewScene | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const preview = new CharacterPreviewScene(canvasRef.current, FULL_BODY_PREVIEW_CAMERA)
    previewRef.current = preview
    const el = containerRef.current
    if (el) preview.resize(el.clientWidth, el.clientHeight)
    return () => {
      preview.dispose()
      previewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(() => previewRef.current?.resize(el.clientWidth, el.clientHeight))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    previewRef.current?.setCharacter(AVATAR_CONFIGS[playerId], cosmeticsFor(cosmetics, playerId).loadout)
  }, [playerId, cosmetics])

  return (
    <div ref={containerRef} className="start-character-preview">
      <canvas ref={canvasRef} className="start-character-preview-canvas" />
      <div className="start-character-preview-hint">Antippen für eine Reaktion, ziehen zum Drehen</div>
    </div>
  )
}
