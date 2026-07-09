import { useFullscreen } from '../hooks/useFullscreen'

/**
 * Vollbild-Umschalter gegen die persistente Browser-Leiste im mobilen Querformat (v. a. iOS
 * Safari). Wird ausgeblendet, wenn die App bereits als installierte PWA (standalone) läuft oder
 * die Fullscreen API nicht unterstützt wird.
 */
export function FullscreenButton({ className = 'btn secondary' }: { className?: string }) {
  const { isFullscreen, toggle, supported, isStandalone } = useFullscreen()

  if (isStandalone || !supported) return null

  return (
    <button className={className} onClick={toggle}>
      {isFullscreen ? '⤢ Vollbild verlassen' : '⛶ Vollbild'}
    </button>
  )
}
