import { useGameStore } from '../../state/gameStore'
import { FullscreenButton } from '../components/FullscreenButton'
import { useFullscreen } from '../hooks/useFullscreen'

export function StartScreen() {
  const goTo = useGameStore((s) => s.goTo)
  const openSettings = useGameStore((s) => s.openSettings)
  const { isFullscreen, supported, isStandalone, isIOS } = useFullscreen()

  return (
    <div className="screen">
      <img className="title-logo-img" src={`${import.meta.env.BASE_URL}icons/logo.png`} alt="Die Umwerfenden" />
      <p className="subtitle">Die originalgetreue Outdoor-Kegelbahn aus Lembeck.</p>
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
      {!isStandalone && isIOS && (
        <p className="subtitle" style={{ fontSize: '0.8rem', opacity: 0.7 }}>
          📲 iPhone/iPad-Tipp: Safari kann hier leider kein echtes Vollbild anzeigen. Für die beste Ansicht ohne
          Browserleiste unten auf „Teilen” tippen und „Zum Home-Bildschirm” wählen.
        </p>
      )}
      {!isStandalone && !isIOS && supported && !isFullscreen && (
        <p className="subtitle" style={{ fontSize: '0.8rem', opacity: 0.7 }}>
          Tipp: Für die beste Ansicht ohne Browserleiste „Vollbild” antippen oder die Seite über
          „Zum Home-Bildschirm” installieren.
        </p>
      )}
    </div>
  )
}
