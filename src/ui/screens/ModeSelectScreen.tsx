import { useState } from 'react'
import { useGameStore } from '../../state/gameStore'
import { ControlsHelp } from '../components/ControlsHelp'
import { AmbientBackground } from '../components/AmbientBackground'
import type { GameMode } from '../../game/types'

type SelectableMode = GameMode | 'tannenbaum'

export function ModeSelectScreen() {
  const goTo = useGameStore((s) => s.goTo)
  const startGame = useGameStore((s) => s.startGame)
  const startTannenbaum = useGameStore((s) => s.startTannenbaum)
  const [mode, setMode] = useState<SelectableMode>('hoch')

  function handleStart() {
    if (mode === 'tannenbaum') startTannenbaum()
    else startGame(mode)
  }

  return (
    <div className="screen">
      <AmbientBackground />
      <button className="btn secondary screen-nav" onClick={() => goTo('start')}>
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
        <button className={`mode-card ${mode === 'tannenbaum' ? 'selected' : ''}`} onClick={() => setMode('tannenbaum')}>
          <h3>🎄 Tannenbaum</h3>
          <p>Hake alle Zahlen 2 bis 7 ab. Ziel: möglichst wenige Würfe.</p>
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.8rem' }}>
        <button className="btn" onClick={handleStart}>
          Spiel starten
        </button>
        <ControlsHelp />
      </div>
    </div>
  )
}
