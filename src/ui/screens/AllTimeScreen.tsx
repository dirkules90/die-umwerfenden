import { useGameStore } from '../../state/gameStore'
import { AVATAR_CONFIGS, CHARACTER_ORDER } from '../../characters/avatarConfigs'
import { formatPoints } from '../formatPoints'

export function AllTimeScreen() {
  const allTimeBoard = useGameStore((s) => s.allTimeBoard)
  const goTo = useGameStore((s) => s.goTo)

  const rows = CHARACTER_ORDER.map((id) => ({ id, points: allTimeBoard[id] ?? 0 }))
    .filter((r) => r.points > 0)
    .sort((a, b) => b.points - a.points)

  return (
    <div className="screen">
      <button className="btn secondary screen-nav" onClick={() => goTo('leaderboard')}>
        ← Zurück
      </button>
      <h2 style={{ margin: 0 }}>Allzeit-Bestenliste</h2>
      <p className="subtitle" style={{ maxWidth: '32rem' }}>
        Für jeden abgeschlossenen Tag bekommt der/die Tagessieger 1 Punkt (bei Gleichstand aufgeteilt). Diese Liste
        summiert die Tagessiege über alle Tage.
      </p>

      <div className="panel" style={{ maxWidth: '30rem', width: '100%', overflowX: 'auto' }}>
        {rows.length === 0 ? (
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
              {rows.map(({ id, points }, i) => (
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
    </div>
  )
}
