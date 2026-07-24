import { useState } from 'react'
import { useGameStore } from '../../state/gameStore'
import { AVATAR_CONFIGS, CHARACTER_ORDER } from '../../characters/avatarConfigs'
import { ACHIEVEMENT_DEFS, hasAchievement } from '../../game/achievements'
import { emptyStatistics } from '../../storage/localStorageService'
import type { CharacterId } from '../../game/types'

export function StatisticsScreen() {
  const statistics = useGameStore((s) => s.statistics)
  const goTo = useGameStore((s) => s.goTo)
  const [selected, setSelected] = useState<CharacterId>('daniel')

  const stats = statistics[selected] ?? emptyStatistics()
  const avgHigh = stats.countHigh > 0 ? (stats.totalScoreHigh / stats.countHigh).toFixed(1) : '–'
  const avgLow = stats.countLow > 0 ? (stats.totalScoreLow / stats.countLow).toFixed(1) : '–'

  return (
    <div className="screen">
      <button className="btn secondary screen-nav" onClick={() => goTo('leaderboard')}>
        ← Zurück
      </button>
      <h2 style={{ margin: 0 }}>Statistik</h2>

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {CHARACTER_ORDER.map((id) => (
          <button
            key={id}
            className={`btn secondary ${selected === id ? 'active' : ''}`}
            style={selected === id ? { outline: '2px solid #7cffb0' } : undefined}
            onClick={() => setSelected(id)}
          >
            {AVATAR_CONFIGS[id].name}
          </button>
        ))}
      </div>

      <div className="panel" style={{ maxWidth: '30rem', width: '100%' }}>
        <table className="stats-table">
          <tbody>
            <tr>
              <td>Partien gespielt</td>
              <td>{stats.gamesPlayed}</td>
            </tr>
            <tr>
              <td>Bester Wert „Hohe Hausnummer”</td>
              <td>{stats.bestHigh !== null ? String(stats.bestHigh).padStart(3, '0') : '–'}</td>
            </tr>
            <tr>
              <td>Bester Wert „Niedrige Hausnummer”</td>
              <td>{stats.bestLow !== null ? String(stats.bestLow).padStart(3, '0') : '–'}</td>
            </tr>
            <tr>
              <td>Bester Wert „Tannenbaum” (Würfe)</td>
              <td>{stats.bestTannenbaum !== null ? stats.bestTannenbaum : '–'}</td>
            </tr>
            <tr>
              <td>Durchschnitt Hoch</td>
              <td>{avgHigh}</td>
            </tr>
            <tr>
              <td>Durchschnitt Niedrig</td>
              <td>{avgLow}</td>
            </tr>
            <tr>
              <td>„Alle Neune” gesamt</td>
              <td>{stats.perfectThrows}</td>
            </tr>
            <tr>
              <td>Rinnenwürfe gesamt</td>
              <td>{stats.gutterThrows}</td>
            </tr>
            <tr>
              <td>Längste „Alle Neune”-Serie</td>
              <td>{stats.longestPerfectStreak}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="panel" style={{ maxWidth: '30rem', width: '100%' }}>
        <h3 style={{ marginTop: 0 }}>Achievements</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'left' }}>
          {ACHIEVEMENT_DEFS.map((def) => {
            const unlocked = hasAchievement(stats, def.id)
            return (
              <div key={def.id} style={{ opacity: unlocked ? 1 : 0.4 }}>
                {unlocked ? '🏆' : '🔒'} <strong>{def.title}</strong> – {def.description}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
