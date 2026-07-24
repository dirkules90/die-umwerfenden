import { useState } from 'react'
import { useGameStore } from '../../state/gameStore'
import { ControlsHelp } from '../components/ControlsHelp'
import type { GameMode } from '../../game/types'

export function ModeSelectScreen() {
  const goTo = useGameStore((s) => s.goTo)
  const startGame = useGameStore((s) => s.startGame)
  const [mode, setMode] = useState<GameMode>('hoch')

  return (
    <div className="screen">
      <button className="btn secondary screen-nav" onClick={() => goTo('playerSelect')}>
        ← Zurück
      </button>
      <h2 style={{ margin: 0 }}>Spielmodus</h2>
      <p className="subtitle">
        Drei Würfe, drei Ziffern – nach jedem Wurf entscheidest du, ob sie an die Hunderter-, Zehner- oder
        Einerstelle kommt.
      </p>
      <div className="mode-grid">
        <button className={`mode-card ${mode === 'hoch' ? 'selected' : ''}`} onClick={() => setMode('hoch')}>
          <h3>↑ Hohe Hausnummer</h3>
          <p>Rinne zählt als 0. Ziel: möglichst hohe Zahl.</p>
        </button>
        <button className={`mode-card ${mode === 'niedrig' ? 'selected' : ''}`} onClick={() => setMode('niedrig')}>
          <h3>↓ Niedrige Hausnummer</h3>
          <p>Rinne zählt als 9. Ziel: möglichst niedrige Zahl.</p>
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.8rem' }}>
        <button className="btn" onClick={() => startGame(mode)}>
          Spiel starten
        </button>
        <ControlsHelp />
      </div>
    </div>
  )
}
