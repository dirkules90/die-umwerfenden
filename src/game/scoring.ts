import type { CharacterId, GameMode, RoundResult } from './types'
import { compareByMode } from './houseNumberRules'

export interface PlayerScore {
  playerId: CharacterId
  total: number
  average: number
  best: number
}

/** Aggregiert alle Rundenergebnisse je Spieler und sortiert nach Modus-Zielrichtung. */
export function computeRanking(results: RoundResult[], mode: GameMode): PlayerScore[] {
  const byPlayer = new Map<CharacterId, number[]>()
  for (const r of results) {
    const list = byPlayer.get(r.playerId) ?? []
    list.push(r.houseNumber)
    byPlayer.set(r.playerId, list)
  }
  const scores: PlayerScore[] = Array.from(byPlayer.entries()).map(([playerId, values]) => {
    const total = values.reduce((a, b) => a + b, 0)
    const best = mode === 'niedrig' ? Math.min(...values) : Math.max(...values)
    return { playerId, total, average: total / values.length, best }
  })
  scores.sort((a, b) => compareByMode(a.total, b.total, mode))
  return scores
}
