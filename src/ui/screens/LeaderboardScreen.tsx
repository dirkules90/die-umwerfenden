import { useGameStore } from '../../state/gameStore'
import { AVATAR_CONFIGS, CHARACTER_ORDER } from '../../characters/avatarConfigs'
import { computeDailyPoints, dailyWinners } from '../../game/dailyWinner'

function formatPoints(v: number): string {
  const rounded = Math.round(v * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

export function LeaderboardScreen() {
  const statistics = useGameStore((s) => s.statistics)
  const dailyRecords = useGameStore((s) => s.dailyRecords)
  const goTo = useGameStore((s) => s.goTo)

  const rows = CHARACTER_ORDER.map((id) => ({ id, stats: statistics[id] })).filter((r) => r.stats)
  const dailyPoints = computeDailyPoints(dailyRecords)
  const { ids: winnerIds, points: winnerPoints } = dailyWinners(dailyPoints)

  return (
    <div className="screen">
      <button className="btn secondary screen-nav" onClick={() => goTo('start')}>
        ← Zurück
      </button>
      <h2 style={{ margin: 0 }}>Bestenliste</h2>

      <div className="panel tagessieger-panel">
        <div style={{ fontWeight: 700 }}>🏆 Tagessieger</div>
        {winnerIds.length === 0 ? (
          <p style={{ margin: '0.6rem 0 0', opacity: 0.85 }}>Fangt an zu kegeln!</p>
        ) : (
          <div className="tagessieger-winners">
            {winnerIds.map((id) => (
              <div className="tagessieger-winner" key={id}>
                <div className="tagessieger-crown">👑</div>
                <img src={AVATAR_CONFIGS[id].photoUrl} alt={AVATAR_CONFIGS[id].name} />
                <div className="name">{AVATAR_CONFIGS[id].name}</div>
                <div className="tagessieger-points">{formatPoints(winnerPoints)} Punkte heute</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel" style={{ maxWidth: '46rem', width: '100%', overflowX: 'auto' }}>
        {rows.length === 0 ? (
          <p>Noch keine Partien gespielt.</p>
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Spieler</th>
                <th>Beste Hoch</th>
                <th>Beste Niedrig</th>
                <th>Tannenbaum</th>
                <th>Partien</th>
                <th>Punkte heute</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ id, stats }) => (
                <tr key={id}>
                  <td>{AVATAR_CONFIGS[id].name}</td>
                  <td>{stats.bestHigh !== null ? String(stats.bestHigh).padStart(3, '0') : '–'}</td>
                  <td>{stats.bestLow !== null ? String(stats.bestLow).padStart(3, '0') : '–'}</td>
                  <td>{stats.bestTannenbaum !== null ? `${stats.bestTannenbaum} Würfe` : '–'}</td>
                  <td>{stats.gamesPlayed}</td>
                  <td>{dailyPoints[id] ? formatPoints(dailyPoints[id]!) : '–'}</td>
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
