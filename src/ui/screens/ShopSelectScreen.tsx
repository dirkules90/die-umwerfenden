import { useState } from 'react'
import { useGameStore } from '../../state/gameStore'
import { AVATAR_CONFIGS, CHARACTER_ORDER } from '../../characters/avatarConfigs'
import { PinGate } from '../components/PinGate'
import { AmbientBackground } from '../components/AmbientBackground'
import type { CharacterId } from '../../game/types'

/** Charakterauswahl vor dem Shop (Teil: Kosmetik-Shop) - eigener Screen statt Wiederverwendung
 * von PlayerSelectScreen, weil das Ziel nach der PIN ein anderes ist (Shop statt Spielmodus) und
 * der Auswahl-Zweck ein anderer Text/Kontext braucht. */
export function ShopSelectScreen() {
  const shopPlayer = useGameStore((s) => s.shopPlayer)
  const selectShopPlayer = useGameStore((s) => s.selectShopPlayer)
  const goTo = useGameStore((s) => s.goTo)
  const [pinFor, setPinFor] = useState<CharacterId | null>(null)

  return (
    <div className="screen">
      <AmbientBackground />
      <button className="btn secondary screen-nav" onClick={() => goTo('start')}>
        ← Zurück
      </button>
      <h2 style={{ margin: 0 }}>Shop – wer bist du?</h2>
      <p className="subtitle">Wähle deinen Charakter und gib deine PIN ein, um deinen Shop zu öffnen.</p>
      <div className="char-grid">
        {CHARACTER_ORDER.map((id) => {
          const config = AVATAR_CONFIGS[id]
          return (
            <button
              key={id}
              className={`char-tile ${shopPlayer === id ? 'selected' : ''}`}
              onClick={() => {
                selectShopPlayer(id)
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
            goTo('shop')
          }}
          onCancel={() => setPinFor(null)}
        />
      )}
    </div>
  )
}
