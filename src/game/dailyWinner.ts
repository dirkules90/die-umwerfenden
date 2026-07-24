import type { CharacterId } from './types'

/** Tagesbestwerte je Spieler (Teil: Tagessieger). Nur befüllt, sobald ein Spiel dieser
 * Kategorie an diesem Tag zu Ende gespielt wurde. */
export interface DailyPlayerRecord {
  bestHigh: number | null
  bestLow: number | null
  bestTannenbaum: number | null
}

export type DailyRecords = Partial<Record<CharacterId, DailyPlayerRecord>>

export function emptyDailyRecord(): DailyPlayerRecord {
  return { bestHigh: null, bestLow: null, bestTannenbaum: null }
}

function bestPlayers(
  records: DailyRecords,
  pick: (r: DailyPlayerRecord) => number | null,
  isBetter: (candidate: number, current: number) => boolean,
): CharacterId[] {
  let bestValue: number | null = null
  let winners: CharacterId[] = []
  for (const [id, rec] of Object.entries(records) as [CharacterId, DailyPlayerRecord][]) {
    const value = pick(rec)
    if (value === null) continue
    if (bestValue === null || isBetter(value, bestValue)) {
      bestValue = value
      winners = [id]
    } else if (value === bestValue) {
      winners.push(id)
    }
  }
  return winners
}

/** Punkte je Spieler für den heutigen Tag: 1 Punkt für Beste Hoch, 1 für Beste Niedrig,
 * 2 für Tannenbaum (längeres Spiel). Bei Gleichstand wird der Punktewert unter den
 * Gleichständigen aufgeteilt. */
export function computeDailyPoints(records: DailyRecords): Partial<Record<CharacterId, number>> {
  const points: Partial<Record<CharacterId, number>> = {}
  const award = (winners: CharacterId[], amount: number) => {
    if (winners.length === 0) return
    const share = amount / winners.length
    for (const id of winners) points[id] = (points[id] ?? 0) + share
  }
  award(
    bestPlayers(records, (r) => r.bestHigh, (a, b) => a > b),
    1,
  )
  award(
    bestPlayers(records, (r) => r.bestLow, (a, b) => a < b),
    1,
  )
  award(
    bestPlayers(records, (r) => r.bestTannenbaum, (a, b) => a < b),
    2,
  )
  return points
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
