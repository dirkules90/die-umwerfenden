import { useState } from 'react'
import { useGameStore } from '../../state/gameStore'
import { AVATAR_CONFIGS, CHARACTER_ORDER } from '../../characters/avatarConfigs'
import { computeAchievementBonus, computeTotalDailyPoints, dailyWinners } from '../../game/dailyWinner'
import { todayKey } from '../../game/dateKey'
import { ACHIEVEMENT_DEFS, hasAchievement } from '../../game/achievements'
import { emptyStatistics } from '../../storage/localStorageService'
import { formatPoints } from '../formatPoints'
import { LeaderboardTabs } from '../components/LeaderboardTabs'
import type { CharacterId } from '../../game/types'

export function LeaderboardScreen() {
  const statistics = useGameStore((s) => s.statistics)
  const dailyRecords = useGameStore((s) => s.dailyRecords)
  const goTo = useGameStore((s) => s.goTo)
  const [selected, setSelected] = useState<CharacterId>('daniel')

  const todayPoints = computeTotalDailyPoints(dailyRecords, statistics, todayKey())
  const achievementBonus = computeAchievementBonus(statistics, todayKey())
  const { ids: winnerIds, points: winnerPoints } = dailyWinners(todayPoints)

  // Alle sechs Spieler von Anfang an fest anzeigen (mit "-" bzw. 0 Punkten), statt die Liste
  // erst wachsen zu lassen, sobald jemand sein erstes Spiel überhaupt gespielt hat - so bleibt
  // die Zeilenzahl konstant und die Liste "springt" nicht.
  const rows = CHARACTER_ORDER.map((id) => {
    const points = todayPoints[id] ?? 0
    const bonus = achievementBonus[id] ?? 0
    return { id, points, bonus, rankPoints: points - bonus }
  }).sort((a, b) => b.points - a.points)

  const detailStats = statistics[selected] ?? emptyStatistics()
  const avgHigh = detailStats.countHigh > 0 ? (detailStats.totalScoreHigh / detailStats.countHigh).toFixed(1) : '–'
  const avgLow = detailStats.countLow > 0 ? (detailStats.totalScoreLow / detailStats.countLow).toFixed(1) : '–'

  return (
    <div className="screen">
      <button className="btn secondary screen-nav" onClick={() => goTo('start')}>
        ← Zurück
      </button>
      <h2 style={{ margin: 0 }}>Bestenliste</h2>
      <LeaderboardTabs active="leaderboard" />

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

      <div className="panel" style={{ maxWidth: '32rem', width: '100%' }}>
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Spieler</th>
              <th>Spielpunkte</th>
              <th>Achievements</th>
              <th>Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ id, points, bonus, rankPoints }, i) => (
              <tr key={id}>
                <td>{i + 1}</td>
                <td>{AVATAR_CONFIGS[id].name}</td>
                <td>{rankPoints > 0 ? formatPoints(rankPoints) : '–'}</td>
                <td>{bonus > 0 ? formatPoints(bonus) : '–'}</td>
                <td>
                  <strong>{points > 0 ? formatPoints(points) : '–'}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ maxWidth: '32rem', fontSize: '0.68rem', opacity: 0.65, margin: 0 }}>
        Spielpunkte: Hausnummer Platz 1-3 = 3/2/1, Tannenbaum Platz 1-3 = 6/4/2 (bei Gleichstand aufgeteilt).
        Achievements: Bonuspunkte für heute freigeschaltete Achievements (siehe unten). Gesamt = Spielpunkte +
        Achievements, daraus ergibt sich der Platz (#). Beste Werte je Spieler: Spieler-Buttons unten auswählen.
      </p>

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
        <p style={{ margin: '0 0 0.6rem', fontSize: '0.75rem', opacity: 0.7 }}>
          Alle Achievements setzen sich täglich zurück und lassen sich jeden Tag neu erreichen.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'left' }}>
          {ACHIEVEMENT_DEFS.map((def) => {
            // Mit dateKey geprüft: an einem neuen Tag zeigt die Liste ein Achievement wieder als
            // gesperrt, bis die Leistung an diesem Tag erneut erbracht wird.
            const unlocked = hasAchievement(detailStats, def.id, todayKey())
            const pointsLabel = def.bonusPoints.toString().replace('.', ',')
            return (
              <div key={def.id} style={{ opacity: unlocked ? 1 : 0.4 }}>
                {unlocked ? '🏆' : '🔒'} <strong>{def.title}</strong> ({pointsLabel} P.) – {def.description}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
