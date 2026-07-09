import { useGameStore } from '../../state/gameStore'
import { FullscreenButton } from '../components/FullscreenButton'
import { useFullscreen } from '../hooks/useFullscreen'

export function StartScreen() {
  const goTo = useGameStore((s) => s.goTo)
  const openSettings = useGameStore((s) => s.openSettings)
  const { isFullscreen, supported, isStandalone } = useFullscreen()

  return (
    <div className="screen">
      <div className="title-logo">🎳 Kegeln in Lembeck</div>
      <p className="subtitle">
        Die originalgetreue Outdoor-Kegelbahn aus Lembeck – mit echter Physik und dem legendären Hebel.
      </p>
      <button className="btn" onClick={() => goTo('playerSelect')}>
        Neues Spiel
      </button>
      <div style={{ display: 'flex', gap: '0.8rem' }}>
        <button className="btn secondary" onClick={() => goTo('leaderboard')}>
          Bestenliste
        </button>
        <button className="btn secondary" onClick={() => openSettings('start')}>
          Einstellungen
        </button>
        <FullscreenButton />
      </div>
      {supported && !isStandalone && !isFullscreen && (
        <p className="subtitle" style={{ fontSize: '0.8rem', opacity: 0.7 }}>
          Tipp: Für die beste Ansicht ohne Browserleiste „Vollbild” antippen oder die Seite über
          „Zum Home-Bildschirm” installieren.
        </p>
      )}
    </div>
  )
}
