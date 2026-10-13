import { ACHIEVEMENT_DEFS } from './achievements'
import { dateKeyFor, todayKey, weekKeyFor } from './dateKey'
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

// Platzpunkte je Kategorie: Index 0 = Platz 1, Index 1 = Platz 2, usw. Tannenbaum gibt bewusst
// das Vierfache der Hausnummer-Punkte (statt nur des Doppelten wie zuvor) - eine Partie braucht
// oft 20-30+ Würfe statt nur 3, das muss sich auch in der Bestenliste spürbar niederschlagen
// (Nutzer-Feedback: "mindestens dreimal so viele Punkte wie bei Hausnummer").
const POINTS_HAUSNUMMER = [3, 2, 1]
const POINTS_TANNENBAUM = [12, 8, 4]

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

export interface PointsBreakdown {
  /** Rang-Punkte (Hausnummer/Tannenbaum-Tagesbestwerte) aus bereits abgeschlossenen Tagen dieser
   * Woche - EIN Topf statt einer Tag-für-Tag-Aufschlüsselung, weil der Einzeltag-Stand beim
   * Tagesabschluss nicht separat gespeichert wird, nur die Summe (siehe
   * state/gameStore.ts processDailyAndWeeklyRollover). Punkte aus bereits abgeschlossenen Tagen
   * sind endgültig - ein später von jemand anderem übernommener Rekord nimmt sie NICHT wieder weg,
   * nur der noch laufende heutige Tag ist vorläufig (siehe todayCategoryPointsLive). */
  pastDaysCategoryPoints: number
  /** Achievement-Bonus dieser Kalenderwoche, inklusive eines heute schon freigeschalteten. */
  achievementBonusThisWeek: number
  /** Bereits synchronisierter Duell-Wochenbonus (siehe backend/duels.ts weeklyDuelBonusPoints). */
  duelBonusThisWeek: number
  /** Rang-Punkte des noch laufenden heutigen Tages - ändert sich, bis der Tag endet, deshalb
   * separat von pastDaysCategoryPoints ausgewiesen (Nutzer-Frage: "woher kommen die Punkte",
   * verbunden mit der Sorge, ob sie wieder verschwinden können). */
  todayCategoryPointsLive: number
}

/** Setzt die Wochenpunktsumme eines Charakters aus ihren Quellen zusammen (Teil: Punkte-
 * Transparenz) - rein aus bereits vorhandenen, persistierten Werten berechnet (weeklyPoints,
 * weeklyDuelBonusSynced, Achievement-Zeitstempel), ohne eigene neue Speicherung: die Summe aller
 * vier Felder entspricht exakt der in der Bestenliste gezeigten Gesamtsumme. */
export function computePointsBreakdown(
  id: CharacterId,
  dailyRecords: DailyRecords,
  statistics: Partial<Record<CharacterId, PlayerStatistics>>,
  weeklyPoints: Partial<Record<CharacterId, number>>,
  weeklyDuelBonusSynced: Partial<Record<CharacterId, number>>,
  weekKey: string,
): PointsBreakdown {
  const stats = statistics[id]
  const duelBonusThisWeek = weeklyDuelBonusSynced[id] ?? 0

  let achievementBonusThisWeek = 0
  let todayAchievementBonus = 0
  if (stats) {
    const today = todayKey()
    for (const a of stats.achievements) {
      if (weekKeyFor(new Date(a.unlockedAt)) !== weekKey) continue
      const value = ACHIEVEMENT_BONUS_BY_ID[a.id] ?? 0
      achievementBonusThisWeek += value
      if (dateKeyFor(new Date(a.unlockedAt)) === today) todayAchievementBonus += value
    }
  }

  const pastDaysTotal = (weeklyPoints[id] ?? 0) - duelBonusThisWeek
  const pastDaysAchievement = achievementBonusThisWeek - todayAchievementBonus
  const pastDaysCategoryPoints = pastDaysTotal - pastDaysAchievement
  const todayCategoryPointsLive = computeDailyPoints(dailyRecords)[id] ?? 0

  return { pastDaysCategoryPoints, achievementBonusThisWeek, duelBonusThisWeek, todayCategoryPointsLive }
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
