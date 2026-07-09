import { useGameStore } from '../../state/gameStore'

export function StartScreen() {
  const goTo = useGameStore((s) => s.goTo)
  const openSettings = useGameStore((s) => s.openSettings)

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
      </div>
    </div>
  )
}
