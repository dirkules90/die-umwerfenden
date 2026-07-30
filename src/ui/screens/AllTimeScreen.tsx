import { useGameStore } from '../../state/gameStore'
import { AVATAR_CONFIGS, CHARACTER_ORDER } from '../../characters/avatarConfigs'
import { formatPoints } from '../formatPoints'
import { LeaderboardTabs } from '../components/LeaderboardTabs'
import { AmbientBackground } from '../components/AmbientBackground'

export function AllTimeScreen() {
  const allTimeBoard = useGameStore((s) => s.allTimeBoard)
  const allTimeWeeklyWins = useGameStore((s) => s.allTimeWeeklyWins)
  const goTo = useGameStore((s) => s.goTo)

  const rows = CHARACTER_ORDER.map((id) => ({
    id,
    points: allTimeBoard[id] ?? 0,
    weeklyWins: allTimeWeeklyWins[id] ?? 0,
  }))
    .filter((r) => r.points > 0 || r.weeklyWins > 0)
    .sort((a, b) => b.points - a.points)

  return (
    <div className="screen">
      <AmbientBackground />
      <button className="btn secondary screen-nav" onClick={() => goTo('start')}>
        ← Zurück
      </button>
      <h2 style={{ margin: 0 }}>Allzeit-Bestenliste</h2>
      <LeaderboardTabs active="allTime" />
      <p className="subtitle" style={{ maxWidth: '32rem' }}>
        Jede abgeschlossene Kegel-Woche schreibt ALLEN Spielern ihre gesammelten Wochenpunkte hier gut, nicht nur
        dem/der Wochensieger - eine schwache Spielwoche der ganzen Gruppe macht einen Sieg so nicht unfair billig.
        Die Wochensiege-Spalte zählt zusätzlich, wie oft jemand die Punktsumme einer Woche angeführt hat.
      </p>

      <div className="panel" style={{ maxWidth: '30rem', width: '100%' }}>
        {rows.length === 0 ? (
          <p style={{ margin: 0, opacity: 0.85 }}>Noch keine abgeschlossene Woche.</p>
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Spieler</th>
                <th>Punkte gesamt</th>
                <th>Wochensiege</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ id, points, weeklyWins }, i) => (
                <tr key={id}>
                  <td>{i + 1}</td>
                  <td>{AVATAR_CONFIGS[id].name}</td>
                  <td>{formatPoints(points)}</td>
                  <td>{weeklyWins > 0 ? formatPoints(weeklyWins) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
