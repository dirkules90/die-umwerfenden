import { useGameStore } from '../../state/gameStore'
import { AVATAR_CONFIGS, CHARACTER_ORDER } from '../../characters/avatarConfigs'
import type { CharacterId } from '../../game/types'

export function PlayerSelectScreen() {
  const selectedPlayers = useGameStore((s) => s.selectedPlayers)
  const togglePlayer = useGameStore((s) => s.togglePlayer)
  const reorderPlayers = useGameStore((s) => s.reorderPlayers)
  const goTo = useGameStore((s) => s.goTo)

  function moveUp(id: CharacterId) {
    const idx = selectedPlayers.indexOf(id)
    if (idx <= 0) return
    const next = [...selectedPlayers]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    reorderPlayers(next)
  }

  return (
    <div className="screen">
      <button className="btn secondary screen-nav" onClick={() => goTo('start')}>
        ← Zurück
      </button>
      <h2 style={{ margin: 0 }}>Spieler auswählen</h2>
      <p className="subtitle">1 bis 6 Spieler, Hotseat-Prinzip – ein Gerät wird reihum genutzt.</p>
      <div className="char-grid">
        {CHARACTER_ORDER.map((id) => {
          const config = AVATAR_CONFIGS[id]
          const selected = selectedPlayers.includes(id)
          const order = selectedPlayers.indexOf(id)
          return (
            <button
              key={id}
              className={`char-tile ${selected ? 'selected' : ''}`}
              onClick={() => togglePlayer(id)}
            >
              <img src={config.photoUrl} alt={config.name} />
              <span className="name">{config.name}</span>
              {selected && (
                <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                  #{order + 1}
                  {order > 0 && (
                    <button
                      className="btn secondary"
                      style={{ padding: '2px 8px', marginLeft: 6, fontSize: '0.7rem' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        moveUp(id)
                      }}
                    >
                      ↑
                    </button>
                  )}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <button className="btn" disabled={selectedPlayers.length === 0} onClick={() => goTo('modeSelect')}>
        Los geht&apos;s
      </button>
    </div>
  )
}
