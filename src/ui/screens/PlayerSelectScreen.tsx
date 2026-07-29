import { useState } from 'react'
import { useGameStore } from '../../state/gameStore'
import { AVATAR_CONFIGS, CHARACTER_ORDER } from '../../characters/avatarConfigs'
import { PinGate } from '../components/PinGate'
import { AmbientBackground } from '../components/AmbientBackground'

export function PlayerSelectScreen() {
  const selectedPlayer = useGameStore((s) => s.selectedPlayer)
  const selectPlayer = useGameStore((s) => s.selectPlayer)
  const goTo = useGameStore((s) => s.goTo)
  const [pinGateOpen, setPinGateOpen] = useState(false)

  return (
    <div className="screen">
      <AmbientBackground />
      <button className="btn secondary screen-nav" onClick={() => goTo('start')}>
        ← Zurück
      </button>
      <h2 style={{ margin: 0 }}>Wer bist du?</h2>
      <p className="subtitle">Wähle deinen Charakter, um deine eigene Hausnummer zu spielen.</p>
      <div className="char-grid">
        {CHARACTER_ORDER.map((id) => {
          const config = AVATAR_CONFIGS[id]
          const selected = selectedPlayer === id
          return (
            <button
              key={id}
              className={`char-tile ${selected ? 'selected' : ''}`}
              onClick={() => selectPlayer(id)}
            >
              <img src={config.photoUrl} alt={config.name} />
              <span className="name">{config.name}</span>
            </button>
          )
        })}
      </div>
      <button className="btn" disabled={!selectedPlayer} onClick={() => setPinGateOpen(true)}>
        Los geht&apos;s
      </button>

      {pinGateOpen && selectedPlayer && (
        <PinGate
          characterId={selectedPlayer}
          characterName={AVATAR_CONFIGS[selectedPlayer].name}
          onSuccess={() => {
            setPinGateOpen(false)
            goTo('modeSelect')
          }}
          onCancel={() => setPinGateOpen(false)}
        />
      )}
    </div>
  )
}
