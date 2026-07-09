import { useState } from 'react'
import { useGameStore } from '../../state/gameStore'
import type { GameMode } from '../../game/types'

export function ModeSelectScreen() {
  const goTo = useGameStore((s) => s.goTo)
  const startGame = useGameStore((s) => s.startGame)
  const settings = useGameStore((s) => s.settings)
  const [mode, setMode] = useState<GameMode>('hoch')
  const [rounds, setRounds] = useState(settings.defaultRounds)
  const [showInfo, setShowInfo] = useState(false)

  return (
    <div className="screen">
      <button className="btn secondary screen-nav" onClick={() => goTo('playerSelect')}>
        ← Zurück
      </button>
      <h2 style={{ margin: 0 }}>Spielmodus</h2>
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

      <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <label htmlFor="rounds">Runden: {rounds}</label>
        <input
          id="rounds"
          type="range"
          min={1}
          max={5}
          value={rounds}
          onChange={(e) => setRounds(Number(e.target.value))}
        />
        <button className="btn secondary" onClick={() => setShowInfo(true)}>
          ℹ Regeln
        </button>
      </div>

      <button className="btn" onClick={() => startGame(mode, rounds)}>
        Spiel starten
      </button>

      {showInfo && (
        <div className="round-result-overlay" onClick={() => setShowInfo(false)}>
          <div className="panel" style={{ maxWidth: '28rem' }}>
            <h3>Hausnummer-Regeln</h3>
            <p>
              Jeder Spieler wirft drei Mal pro Runde. Nach jedem Wurf wird die Anzahl gefallener Kegel (0–9) als
              Ziffer gewertet und frei auf Hunderter-, Zehner- oder Einerstelle verteilt. Eine Rinne zählt je nach
              Modus als 0 (Hoch) oder 9 (Niedrig).
            </p>
            <button className="btn secondary" onClick={() => setShowInfo(false)}>
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
