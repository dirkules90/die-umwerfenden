import { useGameStore } from '../../state/gameStore'
import { AVATAR_CONFIGS, CHARACTER_ORDER } from '../../characters/avatarConfigs'

export function LeaderboardScreen() {
  const statistics = useGameStore((s) => s.statistics)
  const goTo = useGameStore((s) => s.goTo)

  const rows = CHARACTER_ORDER.map((id) => ({ id, stats: statistics[id] })).filter((r) => r.stats)

  return (
    <div className="screen">
      <button className="btn secondary screen-nav" onClick={() => goTo('start')}>
        ← Zurück
      </button>
      <h2 style={{ margin: 0 }}>Bestenliste</h2>
      <div className="panel" style={{ maxWidth: '40rem', width: '100%', overflowX: 'auto' }}>
        {rows.length === 0 ? (
          <p>Noch keine Partien gespielt.</p>
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Spieler</th>
                <th>Beste Hoch</th>
                <th>Beste Niedrig</th>
                <th>Partien</th>
                <th>Siege</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ id, stats }) => (
                <tr key={id}>
                  <td>{AVATAR_CONFIGS[id].name}</td>
                  <td>{stats.bestHigh !== null ? String(stats.bestHigh).padStart(3, '0') : '–'}</td>
                  <td>{stats.bestLow !== null ? String(stats.bestLow).padStart(3, '0') : '–'}</td>
                  <td>{stats.gamesPlayed}</td>
                  <td>{stats.wins}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <button className="btn secondary" onClick={() => goTo('statistics')}>
        Detaillierte Statistik
      </button>
    </div>
  )
}
