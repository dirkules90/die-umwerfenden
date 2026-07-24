import { useState } from 'react'
import { useGameStore } from '../../state/gameStore'
import { AVATAR_CONFIGS, CHARACTER_ORDER } from '../../characters/avatarConfigs'
import { computeTotalDailyPoints, dailyWinners } from '../../game/dailyWinner'
import { todayKey } from '../../game/dateKey'
import { ACHIEVEMENT_DEFS, hasAchievement } from '../../game/achievements'
import { emptyStatistics } from '../../storage/localStorageService'
import type { CharacterId } from '../../game/types'

function formatPoints(v: number): string {
  const rounded = Math.round(v * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

export function LeaderboardScreen() {
  const statistics = useGameStore((s) => s.statistics)
  const dailyRecords = useGameStore((s) => s.dailyRecords)
  const allTimeBoard = useGameStore((s) => s.allTimeBoard)
  const goTo = useGameStore((s) => s.goTo)
  const [selected, setSelected] = useState<CharacterId>('daniel')

  const todayPoints = computeTotalDailyPoints(dailyRecords, statistics, todayKey())
  const { ids: winnerIds, points: winnerPoints } = dailyWinners(todayPoints)

  const rows = CHARACTER_ORDER.map((id) => ({ id, stats: statistics[id], points: todayPoints[id] ?? 0 }))
    .filter((r): r is { id: CharacterId; stats: NonNullable<(typeof r)['stats']>; points: number } => !!r.stats)
    .sort((a, b) => b.points - a.points)

  const allTimeRows = CHARACTER_ORDER.map((id) => ({ id, points: allTimeBoard[id] ?? 0 }))
    .filter((r) => r.points > 0)
    .sort((a, b) => b.points - a.points)

  const detailStats = statistics[selected] ?? emptyStatistics()
  const avgHigh = detailStats.countHigh > 0 ? (detailStats.totalScoreHigh / detailStats.countHigh).toFixed(1) : '–'
  const avgLow = detailStats.countLow > 0 ? (detailStats.totalScoreLow / detailStats.countLow).toFixed(1) : '–'

  return (
    <div className="screen">
      <button className="btn secondary screen-nav" onClick={() => goTo('start')}>
        ← Zurück
      </button>
      <h2 style={{ margin: 0 }}>Bestenliste</h2>

      <div className="leaderboard-scroll">
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

        <div className="panel" style={{ maxWidth: '46rem', width: '100%', fontSize: '0.78rem', opacity: 0.85, textAlign: 'left' }}>
          <strong>Punkte heute:</strong> Hohe/Niedrige Hausnummer Platz 1-3: 3/2/1 Punkte · Tannenbaum Platz 1-3: 6/4/2
          Punkte · meiste Partien heute: 1 Punkt · dazu Achievement-Boni (siehe unten). Bei Gleichstand werden die
          Punkte der belegten Plätze aufgeteilt. Um Mitternacht bekommt der Tagessieger 1 Punkt (bei Gleichstand
          aufgeteilt) in der Allzeit-Bestenliste.
        </div>

        <div className="panel" style={{ maxWidth: '46rem', width: '100%', overflowX: 'auto' }}>
          {rows.length === 0 ? (
            <p>Noch keine Partien gespielt.</p>
          ) : (
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Spieler</th>
                  <th>Punkte heute</th>
                  <th>Beste Hoch</th>
                  <th>Beste Niedrig</th>
                  <th>Tannenbaum</th>
                  <th>Partien</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ id, stats, points }, i) => (
                  <tr key={id}>
                    <td>{i + 1}</td>
                    <td>{AVATAR_CONFIGS[id].name}</td>
                    <td>{points > 0 ? formatPoints(points) : '–'}</td>
                    <td>{stats.bestHigh !== null ? String(stats.bestHigh).padStart(3, '0') : '–'}</td>
                    <td>{stats.bestLow !== null ? String(stats.bestLow).padStart(3, '0') : '–'}</td>
                    <td>{stats.bestTannenbaum !== null ? `${stats.bestTannenbaum} Würfe` : '–'}</td>
                    <td>{stats.gamesPlayed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel" style={{ maxWidth: '46rem', width: '100%', overflowX: 'auto' }}>
          <h3 style={{ marginTop: 0 }}>Allzeit-Bestenliste (Tagessiege)</h3>
          {allTimeRows.length === 0 ? (
            <p style={{ margin: 0, opacity: 0.85 }}>Noch kein abgeschlossener Tag.</p>
          ) : (
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Spieler</th>
                  <th>Tagessiege</th>
                </tr>
              </thead>
              <tbody>
                {allTimeRows.map(({ id, points }, i) => (
                  <tr key={id}>
                    <td>{i + 1}</td>
                    <td>{AVATAR_CONFIGS[id].name}</td>
                    <td>{formatPoints(points)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {CHARACTER_ORDER.map((id) => (
            <button
              key={id}
              className="btn secondary"
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
                <td>{detailStats.gamesPlayed}</td>
              </tr>
              <tr>
                <td>Bester Wert „Hohe Hausnummer”</td>
                <td>{detailStats.bestHigh !== null ? String(detailStats.bestHigh).padStart(3, '0') : '–'}</td>
              </tr>
              <tr>
                <td>Bester Wert „Niedrige Hausnummer”</td>
                <td>{detailStats.bestLow !== null ? String(detailStats.bestLow).padStart(3, '0') : '–'}</td>
              </tr>
              <tr>
                <td>Bester Wert „Tannenbaum” (Würfe)</td>
                <td>{detailStats.bestTannenbaum !== null ? detailStats.bestTannenbaum : '–'}</td>
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
                <td>{detailStats.perfectThrows}</td>
              </tr>
              <tr>
                <td>Rinnenwürfe gesamt</td>
                <td>{detailStats.gutterThrows}</td>
              </tr>
              <tr>
                <td>Längste „Alle Neune”-Serie</td>
                <td>{detailStats.longestPerfectStreak}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="panel" style={{ maxWidth: '30rem', width: '100%' }}>
          <h3 style={{ marginTop: 0 }}>Achievements</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'left' }}>
            {ACHIEVEMENT_DEFS.map((def) => {
              const unlocked = hasAchievement(detailStats, def.id)
              return (
                <div key={def.id} style={{ opacity: unlocked ? 1 : 0.4 }}>
                  {unlocked ? '🏆' : '🔒'} <strong>{def.title}</strong>
                  {def.bonusPoints > 0 && <span> (+{formatPoints(def.bonusPoints)} Punkte am Tag)</span>} –{' '}
                  {def.description}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
