import { describe, expect, it } from 'vitest'
import {
  computeAchievementBonus,
  computeDailyPoints,
  computePointsBreakdown,
  computeTotalDailyPoints,
  dailyWinners,
  emptyDailyRecord,
  type DailyRecords,
} from './dailyWinner'
import { currentWeekKey, dateKeyFor, todayKey } from './dateKey'
import { emptyStatistics } from '../storage/localStorageService'
import type { CharacterId, PlayerStatistics } from './types'

/** Reine Rechenfunktionen für Tages-/Wochenpunkte (Teil: Unit-Tests für die Punkte-Logik) - bisher
 * nur manuell per Playwright nachgestellt, was z.B. den Duell-Gleichstand-Bug (siehe
 * backend/duels.test.ts) erst spät auffallen ließ. Deckt die Fälle ab, in denen diese Session
 * tatsächlich Bugs gefunden/besprochen hat: Rang-Gleichstand, Tagesgrenzen bei Achievements, und
 * die Punkte-Herkunfts-Aufschlüsselung (computePointsBreakdown), deren Summe exakt der gezeigten
 * Wochensumme entsprechen MUSS. */

function statsWithAchievements(ids: Array<{ id: string; unlockedAt: number }>): PlayerStatistics {
  return { ...emptyStatistics(), achievements: ids }
}

describe('computeDailyPoints', () => {
  it('vergibt 3/2/1 für Hohe Hausnummer, höherer Wert gewinnt', () => {
    const records: DailyRecords = {
      daniel: { ...emptyDailyRecord(), bestHigh: 900 },
      tobias: { ...emptyDailyRecord(), bestHigh: 800 },
      dirk: { ...emptyDailyRecord(), bestHigh: 700 },
      fabian: { ...emptyDailyRecord(), bestHigh: 600 },
    }
    const points = computeDailyPoints(records)
    expect(points.daniel).toBe(3)
    expect(points.tobias).toBe(2)
    expect(points.dirk).toBe(1)
    expect(points.fabian).toBeUndefined()
  })

  it('vergibt 3/2/1 für Niedrige Hausnummer, niedrigerer Wert gewinnt', () => {
    const records: DailyRecords = {
      daniel: { ...emptyDailyRecord(), bestLow: 111 },
      tobias: { ...emptyDailyRecord(), bestLow: 222 },
    }
    const points = computeDailyPoints(records)
    expect(points.daniel).toBe(3)
    expect(points.tobias).toBe(2)
  })

  it('vergibt 12/8/4 für Tannenbaum, wenigere Würfe gewinnen', () => {
    const records: DailyRecords = {
      daniel: { ...emptyDailyRecord(), bestTannenbaum: 10 },
      tobias: { ...emptyDailyRecord(), bestTannenbaum: 15 },
    }
    const points = computeDailyPoints(records)
    expect(points.daniel).toBe(12)
    expect(points.tobias).toBe(8)
  })

  it('teilt die Punktsumme bei Gleichstand auf die Rang-Gruppe auf', () => {
    // Zwei teilen sich Platz 1+2 (3+2)/2=2.5 je Spieler, Platz 3 bleibt regulär bei 1.
    const records: DailyRecords = {
      daniel: { ...emptyDailyRecord(), bestHigh: 900 },
      tobias: { ...emptyDailyRecord(), bestHigh: 900 },
      dirk: { ...emptyDailyRecord(), bestHigh: 700 },
    }
    const points = computeDailyPoints(records)
    expect(points.daniel).toBe(2.5)
    expect(points.tobias).toBe(2.5)
    expect(points.dirk).toBe(1)
  })

  it('ein einzelner Spieler ohne Gleichstand bekommt trotzdem nur Platz-1-Punkte, nicht mehr', () => {
    const records: DailyRecords = { daniel: { ...emptyDailyRecord(), bestHigh: 900 } }
    expect(computeDailyPoints(records).daniel).toBe(3)
  })

  it('addiert Punkte über mehrere Kategorien, wenn derselbe Spieler in mehreren führt', () => {
    const records: DailyRecords = {
      daniel: { ...emptyDailyRecord(), bestHigh: 900, bestLow: 100, bestTannenbaum: 10 },
    }
    expect(computeDailyPoints(records).daniel).toBe(3 + 3 + 12)
  })
})

describe('computeAchievementBonus', () => {
  it('zählt nur Achievements, die genau an diesem Tag freigeschaltet wurden', () => {
    const today = new Date(2026, 0, 15, 10, 0, 0).getTime()
    const yesterday = new Date(2026, 0, 14, 10, 0, 0).getTime()
    const stats: Record<CharacterId, PlayerStatistics> = {
      daniel: statsWithAchievements([
        { id: 'volltreffer', unlockedAt: today }, // 3 Punkte
        { id: 'stammgast', unlockedAt: yesterday }, // zählt NICHT, falscher Tag
      ]),
    } as Record<CharacterId, PlayerStatistics>
    const bonus = computeAchievementBonus(stats, '2026-01-15')
    expect(bonus.daniel).toBe(3)
  })

  it('liefert keinen Eintrag für Spieler ohne heutige Achievements', () => {
    const stats = { daniel: emptyStatistics() }
    expect(computeAchievementBonus(stats, '2026-01-15').daniel).toBeUndefined()
  })
})

describe('computeTotalDailyPoints', () => {
  it('addiert Rang-Punkte und Achievement-Bonus desselben Tages', () => {
    const today = new Date(2026, 0, 15, 10, 0, 0).getTime()
    const records: DailyRecords = { daniel: { ...emptyDailyRecord(), bestHigh: 900 } }
    const stats = { daniel: statsWithAchievements([{ id: 'volltreffer', unlockedAt: today }]) }
    const total = computeTotalDailyPoints(records, stats, '2026-01-15')
    expect(total.daniel).toBe(3 + 3)
  })
})

describe('dailyWinners', () => {
  it('liefert alle Spieler mit der höchsten Punktzahl bei Gleichstand', () => {
    const result = dailyWinners({ daniel: 5, tobias: 5, dirk: 3 })
    expect(result.ids.sort()).toEqual(['daniel', 'tobias'])
    expect(result.points).toBe(5)
  })

  it('liefert keinen Gewinner, wenn niemand über 0 Punkte hat', () => {
    expect(dailyWinners({ daniel: 0, tobias: 0 })).toEqual({ ids: [], points: 0 })
    expect(dailyWinners({})).toEqual({ ids: [], points: 0 })
  })
})

describe('computePointsBreakdown', () => {
  // computePointsBreakdown ermittelt "heute" intern über die echte Systemzeit (todayKey()), nicht
  // über einen übergebenen Parameter - die Fixtures verwenden deshalb bewusst das ECHTE Heute statt
  // eines fest verdrahteten Datums, sonst würde der "ist das heute?"-Vergleich in der Quelle
  // lautlos an einem hartkodierten Testdatum vorbeilaufen (abhängig davon, an welchem Tag der Test
  // tatsächlich läuft).
  const weekKey = currentWeekKey()
  const today = Date.now()

  it('die vier Posten summieren sich exakt zur gezeigten Wochengesamtsumme (weeklyPoints + heute)', () => {
    const records: DailyRecords = { daniel: { ...emptyDailyRecord(), bestHigh: 900 } }
    const statistics = {
      daniel: statsWithAchievements([{ id: 'volltreffer', unlockedAt: today }]),
    }
    const weeklyPoints = { daniel: 10 } // bereits abgeschlossene Tage + schon synchronisierter Duell-Bonus
    const weeklyDuelBonusSynced = { daniel: 1.5 }

    const breakdown = computePointsBreakdown('daniel', records, statistics, weeklyPoints, weeklyDuelBonusSynced, weekKey)

    const todayTotal = computeTotalDailyPoints(records, statistics, todayKey()).daniel ?? 0
    const combinedShownTotal = (weeklyPoints.daniel ?? 0) + todayTotal

    const sum =
      breakdown.pastDaysCategoryPoints +
      breakdown.achievementBonusThisWeek +
      breakdown.duelBonusThisWeek +
      breakdown.todayCategoryPointsLive
    expect(sum).toBeCloseTo(combinedShownTotal, 10)
    expect(breakdown.duelBonusThisWeek).toBe(1.5)
    expect(breakdown.todayCategoryPointsLive).toBe(3) // nur die Rang-Punkte, Achievement zählt separat
  })

  it('ein Achievement aus einem früheren Tag dieser Woche zählt in den Wochen-Bonus, nicht ins heutige Live-Feld', () => {
    // Erster Tag der aktuellen Woche (Montag + 0..6), der nicht "heute" ist - robust unabhängig
    // vom Wochentag, an dem der Test tatsächlich läuft (ein fester "-2 Tage"-Versatz könnte an
    // einem Montag in die VORHERIGE Woche rutschen).
    const [y, m, d] = weekKey.split('-').map(Number)
    let otherDayThisWeek = today
    for (let offset = 0; offset < 7; offset++) {
      const candidate = new Date(y, m - 1, d + offset, 10, 0, 0)
      if (dateKeyFor(candidate) !== todayKey()) {
        otherDayThisWeek = candidate.getTime()
        break
      }
    }
    const statistics = {
      daniel: statsWithAchievements([{ id: 'stammgast', unlockedAt: otherDayThisWeek }]),
    }
    const breakdown = computePointsBreakdown('daniel', {}, statistics, { daniel: 1 }, {}, weekKey)
    expect(breakdown.achievementBonusThisWeek).toBe(1)
    expect(breakdown.todayCategoryPointsLive).toBe(0)
  })
})
