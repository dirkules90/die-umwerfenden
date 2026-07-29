import { useGameStore } from '../../state/gameStore'
import { AVATAR_CONFIGS, CHARACTER_ORDER } from '../../characters/avatarConfigs'
import { computeTotalDailyPoints, dailyWinners } from '../../game/dailyWinner'
import { mondayOfWeek, todayKey } from '../../game/dateKey'
import { WEEKLY_WINNER_COIN_BONUS } from '../../game/coins'
import { formatPoints } from '../formatPoints'
import { LeaderboardTabs } from '../components/LeaderboardTabs'
import type { CharacterId } from '../../game/types'

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function formatShort(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.`
}

export function WeeklyScreen() {
  const weeklyPoints = useGameStore((s) => s.weeklyPoints)
  const dailyRecords = useGameStore((s) => s.dailyRecords)
  const statistics = useGameStore((s) => s.statistics)
  const goTo = useGameStore((s) => s.goTo)

  const monday = mondayOfWeek(new Date())
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const todayLabel = WEEKDAY_LABELS[(new Date().getDay() + 6) % 7]
  const daysUntilReset = 7 - ((new Date().getDay() + 6) % 7)

  // Punkte bereits abgeschlossener Tage DIESER Woche (weeklyPoints) + der heutige, noch laufende
  // Tag live dazugerechnet (computeTotalDailyPoints) - sonst würde der aktuelle Tag erst beim
  // nächsten App-Start sichtbar in der Wochensumme auftauchen (Teil: Wochen-Bestenliste).
  const todayPoints = computeTotalDailyPoints(dailyRecords, statistics, todayKey())
  const combined: Partial<Record<CharacterId, number>> = { ...weeklyPoints }
  for (const [id, points] of Object.entries(todayPoints) as [CharacterId, number][]) {
    combined[id] = (combined[id] ?? 0) + (points ?? 0)
  }

  const rows = CHARACTER_ORDER.map((id) => ({ id, points: combined[id] ?? 0 })).sort((a, b) => b.points - a.points)
  const { ids: projectedWinners, points: projectedWinnerPoints } = dailyWinners(combined)

  return (
    <div className="screen">
      <button className="btn secondary screen-nav" onClick={() => goTo('start')}>
        ← Zurück
      </button>
      <h2 style={{ margin: 0 }}>Wochen-Bestenliste</h2>
      <LeaderboardTabs active="weekly" />

      <p className="subtitle" style={{ maxWidth: '32rem' }}>
        Eine Kegel-Woche läuft Montag bis Sonntag ({formatShort(monday)} – {formatShort(sunday)}, heute:{' '}
        {todayLabel}). Am Sonntagabend/beim nächsten App-Start wird abgerechnet: der/die Wochensieger (höchste
        Punktsumme der Woche, bei Gleichstand aufgeteilt) bekommt {WEEKLY_WINNER_COIN_BONUS} 🪙 - danach startet die
        Zählung wieder bei 0. Noch {daysUntilReset} {daysUntilReset === 1 ? 'Tag' : 'Tage'} bis zur Abrechnung.
      </p>

      {projectedWinners.length > 0 && (
        <div className="panel tagessieger-panel">
          <div style={{ fontWeight: 700 }}>👑 Aktuell in Führung (Stand jetzt)</div>
          <div className="tagessieger-winners">
            {projectedWinners.map((id) => (
              <div className="tagessieger-winner" key={id}>
                <div className="tagessieger-crown">👑</div>
                <img src={AVATAR_CONFIGS[id].photoUrl} alt={AVATAR_CONFIGS[id].name} />
                <div className="name">{AVATAR_CONFIGS[id].name}</div>
                <div className="tagessieger-points">{formatPoints(projectedWinnerPoints)} Punkte diese Woche</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel" style={{ maxWidth: '32rem', width: '100%' }}>
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Spieler</th>
              <th>Punkte diese Woche</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ id, points }, i) => (
              <tr key={id}>
                <td>{i + 1}</td>
                <td>{AVATAR_CONFIGS[id].name}</td>
                <td>
                  <strong>{points > 0 ? formatPoints(points) : '–'}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ maxWidth: '32rem', fontSize: '0.68rem', opacity: 0.65, margin: 0 }}>
        Wochenpunkte = Summe der Tagespunkte (siehe „Heute”) über die ganze Woche. Noch nicht abgeschlossene
        (heutige) Punkte zählen hier schon live mit, werden aber erst beim Tagesabschluss dauerhaft gespeichert.
      </p>
    </div>
  )
}
