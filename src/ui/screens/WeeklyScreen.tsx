import { useEffect, useState } from 'react'
import { useGameStore } from '../../state/gameStore'
import { AVATAR_CONFIGS, CHARACTER_ORDER } from '../../characters/avatarConfigs'
import { computeTotalDailyPoints, dailyWinners } from '../../game/dailyWinner'
import { currentWeekKey, mondayOfWeek, todayKey } from '../../game/dateKey'
import { WEEKLY_WINNER_COIN_BONUS } from '../../game/coins'
import { ACHIEVEMENT_DEFS, hasAchievementThisWeek } from '../../game/achievements'
import { emptyStatistics } from '../../storage/localStorageService'
import { formatPoints } from '../formatPoints'
import { LeaderboardTabs } from '../components/LeaderboardTabs'
import { AmbientBackground } from '../components/AmbientBackground'
import type { CharacterId } from '../../game/types'

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function formatShort(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.`
}

/** Zusammengeführte Bestenliste (Teil: Bestenliste-Vereinfachung) - vorher gab es Heute/Woche/
 * Allzeit als drei gleichwertige Tabs, obwohl "Heute" nur ein Zwischenstand ist, der sowieso in die
 * Wochensumme einfließt. Jetzt ist die Woche die "lebendige" Ansicht (inkl. der heutigen, noch
 * laufenden Punkte) und trägt zusätzlich den Charakter-Detailbereich (Bestwerte, Achievements), der
 * vorher auf der separaten Heute-Seite lag. */
export function WeeklyScreen() {
  const weeklyPoints = useGameStore((s) => s.weeklyPoints)
  const dailyRecords = useGameStore((s) => s.dailyRecords)
  const statistics = useGameStore((s) => s.statistics)
  const weeklyDuelBonus = useGameStore((s) => s.weeklyDuelBonus)
  const loadWeeklyDuelBonus = useGameStore((s) => s.loadWeeklyDuelBonus)
  const goTo = useGameStore((s) => s.goTo)
  const [selected, setSelected] = useState<CharacterId>('daniel')

  useEffect(() => {
    void loadWeeklyDuelBonus()
  }, [loadWeeklyDuelBonus])

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
  // Duell-Bonuspunkte kommen live aus dem Backend dazu (Teil: Online-Duelle) - anders als der Rest
  // der Wochenpunkte sind Duelle geräteübergreifend, siehe backend/wallet.ts.
  for (const [id, points] of Object.entries(weeklyDuelBonus) as [CharacterId, number][]) {
    combined[id] = (combined[id] ?? 0) + (points ?? 0)
  }

  const rows = CHARACTER_ORDER.map((id) => ({ id, points: combined[id] ?? 0 })).sort((a, b) => b.points - a.points)
  const { ids: projectedWinners, points: projectedWinnerPoints } = dailyWinners(combined)

  const detailStats = statistics[selected] ?? emptyStatistics()
  const avgHigh = detailStats.countHigh > 0 ? (detailStats.totalScoreHigh / detailStats.countHigh).toFixed(1) : '–'
  const avgLow = detailStats.countLow > 0 ? (detailStats.totalScoreLow / detailStats.countLow).toFixed(1) : '–'

  return (
    <div className="screen">
      <AmbientBackground />
      <button className="btn secondary screen-nav" onClick={() => goTo('start')}>
        ← Zurück
      </button>
      <h2 style={{ margin: 0 }}>Wochen-Bestenliste</h2>
      <LeaderboardTabs active="weekly" />

      <p className="subtitle" style={{ maxWidth: '32rem' }}>
        Eine Kegel-Woche läuft Montag bis Sonntag ({formatShort(monday)} – {formatShort(sunday)}, heute:{' '}
        {todayLabel}). Am Sonntagabend/beim nächsten App-Start wird abgerechnet: der/die Wochensieger (höchste
        Punktsumme der Woche, bei Gleichstand aufgeteilt) bekommt {WEEKLY_WINNER_COIN_BONUS} 🪙, alle gesammelten
        Punkte aller Spieler wandern in die Allzeit-Bestenliste - danach startet die Wochenzählung wieder bei 0.
        Noch {daysUntilReset} {daysUntilReset === 1 ? 'Tag' : 'Tage'} bis zur Abrechnung.
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
        Wochenpunkte = Summe der Tagespunkte (Hausnummer Platz 1-3 = 3/2/1, Tannenbaum Platz 1-3 = 6/4/2, plus
        Achievement-Bonuspunkte) plus Duell-Bonuspunkte (0,5 Punkte pro Teilnehmer ab dem zweiten, max. 2,5, für
        gewonnene Duelle). Noch nicht abgeschlossene (heutige) Punkte zählen hier schon live mit, werden aber erst
        beim Tagesabschluss dauerhaft gespeichert.
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
              <td>Serie (Tage in Folge gespielt)</td>
              <td>{detailStats.currentStreak > 0 ? `🔥 ${detailStats.currentStreak}` : '–'}</td>
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
          Alle Achievements setzen sich jede Kalenderwoche zurück und lassen sich pro Woche neu erreichen.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'left' }}>
          {ACHIEVEMENT_DEFS.map((def) => {
            // Mit weekKey geprüft: in einer neuen Kalenderwoche zeigt die Liste ein Achievement
            // wieder als gesperrt, bis die Leistung in dieser Woche erneut erbracht wird.
            const unlocked = hasAchievementThisWeek(detailStats, def.id, currentWeekKey())
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
