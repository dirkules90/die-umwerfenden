import { ACHIEVEMENT_DEFS } from './achievements'
import { dateKeyFor } from './dateKey'
import type { CharacterId, PlayerStatistics } from './types'

/** Tagesbestwerte je Spieler (Teil: Tagessieger). Nur befüllt, sobald ein Spiel dieser
 * Kategorie an diesem Tag zu Ende gespielt wurde. gamesPlayedToday zählt alle Spielmodi und ist
 * die Grundlage für das Stammgast-Achievement (siehe achievements.ts). */
export interface DailyPlayerRecord {
  bestHigh: number | null
  bestLow: number | null
  bestTannenbaum: number | null
  gamesPlayedToday: number
}

export type DailyRecords = Partial<Record<CharacterId, DailyPlayerRecord>>

export function emptyDailyRecord(): DailyPlayerRecord {
  return { bestHigh: null, bestLow: null, bestTannenbaum: null, gamesPlayedToday: 0 }
}

// Platzpunkte je Kategorie: Index 0 = Platz 1, Index 1 = Platz 2, usw.
const POINTS_HAUSNUMMER = [3, 2, 1]
const POINTS_TANNENBAUM = [6, 4, 2]

const ACHIEVEMENT_BONUS_BY_ID: Partial<Record<string, number>> = Object.fromEntries(
  ACHIEVEMENT_DEFS.map((d) => [d.id, d.bonusPoints]),
)

function mergePoints(target: Partial<Record<CharacterId, number>>, source: Partial<Record<CharacterId, number>>) {
  for (const [id, value] of Object.entries(source) as [CharacterId, number][]) {
    target[id] = (target[id] ?? 0) + value
  }
}

/**
 * Verteilt eine Platzpunkte-Tabelle rangbasiert auf die Spieler: liegen mehrere gleichauf,
 * teilen sie sich die Summe der von ihrer Gruppe belegten Rangplätze untereinander auf
 * (z. B. teilen sich Platz 1+2 bei Gleichstand (3+2)/2 = 2,5 Punkte je Spieler, Platz 3 bleibt
 * regulär). Nur Spieler mit einem Wert (also: die diese Kategorie heute gespielt haben)
 * nehmen teil.
 */
function rankPoints(
  records: DailyRecords,
  pick: (r: DailyPlayerRecord) => number | null,
  isBetter: (a: number, b: number) => boolean,
  pointsTable: number[],
): Partial<Record<CharacterId, number>> {
  const entries = (Object.entries(records) as [CharacterId, DailyPlayerRecord][])
    .map(([id, rec]) => ({ id, value: pick(rec) }))
    .filter((e): e is { id: CharacterId; value: number } => e.value !== null)
    .sort((a, b) => (isBetter(a.value, b.value) ? -1 : isBetter(b.value, a.value) ? 1 : 0))

  const points: Partial<Record<CharacterId, number>> = {}
  let i = 0
  while (i < entries.length) {
    let j = i
    while (j + 1 < entries.length && entries[j + 1].value === entries[i].value) j++
    let sum = 0
    for (let pos = i; pos <= j; pos++) sum += pointsTable[pos] ?? 0
    const share = sum / (j - i + 1)
    if (share > 0) {
      for (let k = i; k <= j; k++) points[entries[k].id] = share
    }
    i = j + 1
  }
  return points
}

/** Rang-Punkte für Hohe/Niedrige Hausnummer und Tannenbaum - noch ohne Achievement-Bonus
 * (siehe computeAchievementBonus). Bewusst keine eigene Kategorie mehr für "meiste Partien
 * heute": das überschnitt sich unsichtbar mit dem Stammgast-Achievement (10 Partien insgesamt)
 * und tauchte selbst nirgends in der Achievement-Liste auf. */
export function computeDailyPoints(records: DailyRecords): Partial<Record<CharacterId, number>> {
  const points: Partial<Record<CharacterId, number>> = {}
  mergePoints(
    points,
    rankPoints(records, (r) => r.bestHigh, (a, b) => a > b, POINTS_HAUSNUMMER),
  )
  mergePoints(
    points,
    rankPoints(records, (r) => r.bestLow, (a, b) => a < b, POINTS_HAUSNUMMER),
  )
  mergePoints(
    points,
    rankPoints(records, (r) => r.bestTannenbaum, (a, b) => a < b, POINTS_TANNENBAUM),
  )
  return points
}

/** Bonuspunkte für Achievements, die genau an diesem Tag (dateKey) freigeschaltet wurden. */
export function computeAchievementBonus(
  statistics: Partial<Record<CharacterId, PlayerStatistics>>,
  dateKey: string,
): Partial<Record<CharacterId, number>> {
  const bonus: Partial<Record<CharacterId, number>> = {}
  for (const [id, stats] of Object.entries(statistics) as [CharacterId, PlayerStatistics | undefined][]) {
    if (!stats) continue
    let sum = 0
    for (const a of stats.achievements) {
      if (dateKeyFor(new Date(a.unlockedAt)) !== dateKey) continue
      sum += ACHIEVEMENT_BONUS_BY_ID[a.id] ?? 0
    }
    if (sum > 0) bonus[id] = sum
  }
  return bonus
}

/** Gesamtpunktzahl eines Tages: Kategorie-Rangpunkte plus Achievement-Bonus dieses Tages. */
export function computeTotalDailyPoints(
  records: DailyRecords,
  statistics: Partial<Record<CharacterId, PlayerStatistics>>,
  dateKey: string,
): Partial<Record<CharacterId, number>> {
  const total: Partial<Record<CharacterId, number>> = {}
  mergePoints(total, computeDailyPoints(records))
  mergePoints(total, computeAchievementBonus(statistics, dateKey))
  return total
}

/** Tagessieger: alle Spieler mit der höchsten Punktzahl, sofern diese über 0 liegt. */
export function dailyWinners(points: Partial<Record<CharacterId, number>>): { ids: CharacterId[]; points: number } {
  let max = 0
  for (const value of Object.values(points)) {
    if (value !== undefined && value > max) max = value
  }
  if (max <= 0) return { ids: [], points: 0 }
  const ids = (Object.entries(points) as [CharacterId, number][]).filter(([, v]) => v === max).map(([id]) => id)
  return { ids, points: max }
}
