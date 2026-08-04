import { useState } from 'react'
import { useGameStore } from '../../state/gameStore'
import { AVATAR_CONFIGS, CHARACTER_ORDER } from '../../characters/avatarConfigs'
import { PinGate } from '../components/PinGate'
import { AmbientBackground } from '../components/AmbientBackground'
import type { CharacterId } from '../../game/types'

/** Charakterauswahl vor den Duellen (Teil: Online-Duelle) - analog zu ShopSelectScreen, weil Duelle
 * genau wie der Shop personenbezogene Daten (Münzen, Einladungen) betreffen und daher denselben
 * PIN-Schutz brauchen. */
export function DuelsSelectScreen() {
  const duelsPlayer = useGameStore((s) => s.duelsPlayer)
  const selectDuelsPlayer = useGameStore((s) => s.selectDuelsPlayer)
  const goTo = useGameStore((s) => s.goTo)
  const [pinFor, setPinFor] = useState<CharacterId | null>(null)

  return (
    <div className="screen">
      <AmbientBackground />
      <button className="btn secondary screen-nav" onClick={() => goTo('start')}>
        ← Zurück
      </button>
      <h2 style={{ margin: 0 }}>Duelle – wer bist du?</h2>
      <p className="subtitle">Wähle deinen Charakter und gib deine PIN ein, um deine Duelle zu öffnen.</p>
      <div className="char-grid">
        {CHARACTER_ORDER.map((id) => {
          const config = AVATAR_CONFIGS[id]
          return (
            <button
              key={id}
              className={`char-tile ${duelsPlayer === id ? 'selected' : ''}`}
              onClick={() => {
                selectDuelsPlayer(id)
                setPinFor(id)
              }}
            >
              <img src={config.photoUrl} alt={config.name} />
              <span className="name">{config.name}</span>
            </button>
          )
        })}
      </div>

      {pinFor && (
        <PinGate
          characterId={pinFor}
          characterName={AVATAR_CONFIGS[pinFor].name}
          onSuccess={() => {
            setPinFor(null)
            goTo('duels')
          }}
          onCancel={() => setPinFor(null)}
        />
      )}
    </div>
  )
}
