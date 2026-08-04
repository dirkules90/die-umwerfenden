import { useState } from 'react'
import { useGameStore } from '../../state/gameStore'
import { AVATAR_CONFIGS, CHARACTER_ORDER } from '../../characters/avatarConfigs'
import { PinGate } from '../components/PinGate'
import { AmbientBackground } from '../components/AmbientBackground'
import type { CharacterId } from '../../game/types'

/** Zentraler Login-Bildschirm (Teil: Zentrales Login) - ersetzt die früher getrennten PIN-Abfragen
 * vor Spielen/Shop/Duelle. Einmal hier eingeloggt, gilt currentPlayer geräteweit weiter (siehe
 * requireLogin/completeLogin in state/gameStore.ts), bis explizit gewechselt wird (StartScreen
 * "Wechseln"). Erreicht wird dieser Screen ausschließlich über requireLogin. */
export function LoginScreen() {
  const goTo = useGameStore((s) => s.goTo)
  const statistics = useGameStore((s) => s.statistics)
  const completeLogin = useGameStore((s) => s.completeLogin)
  const [selected, setSelected] = useState<CharacterId | null>(null)
  const [pinFor, setPinFor] = useState<CharacterId | null>(null)

  return (
    <div className="screen">
      <AmbientBackground />
      <button className="btn secondary screen-nav" onClick={() => goTo('start')}>
        ← Zurück
      </button>
      <h2 style={{ margin: 0 }}>Wer bist du?</h2>
      <p className="subtitle">Einmal einloggen reicht - danach geht's direkt weiter zu Spielen, Shop und Duelle.</p>
      <div className="char-grid">
        {CHARACTER_ORDER.map((id) => {
          const config = AVATAR_CONFIGS[id]
          // Streak-Badge (Teil: Engagement) - erst ab 2 Tagen gezeigt, damit ein frisch gestartetes
          // "🔥1" nicht wie Grundrauschen für jeden aussieht, der heute zum ersten Mal spielt.
          const streak = statistics[id]?.currentStreak ?? 0
          return (
            <button
              key={id}
              className={`char-tile ${selected === id ? 'selected' : ''}`}
              onClick={() => {
                setSelected(id)
                setPinFor(id)
              }}
            >
              <img src={config.photoUrl} alt={config.name} />
              <span className="name">{config.name}</span>
              {streak >= 2 && <span className="streak-badge">🔥{streak}</span>}
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
            completeLogin(pinFor)
          }}
          onCancel={() => {
            setPinFor(null)
            setSelected(null)
          }}
        />
      )}
    </div>
  )
}
