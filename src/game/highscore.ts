import { AVATAR_CONFIGS, CHARACTER_ORDER } from '../characters/avatarConfigs'
import type { CharacterId, GameMode, PlayerStatistics } from './types'

export interface GroupHighscore {
  /** ALLE Halter des Bestwerts, nicht nur einer - vorher wurde bei Gleichstand (z.B. zwei
   * Charaktere mit demselben bestLow) einfach der erste in CHARACTER_ORDER gewinnende
   * zurückgegeben, als hätte nur er den Rekord (Nutzer-Frage: "was ist wenn zwei den gleichen
   * Allzeit-Bestwert haben?"). */
  playerNames: string[]
  value: number
}

/** Bester Wert aller sechs Charaktere für den angegebenen Modus, samt Namen ALLER Halter bei
 * Gleichstand. */
export function groupHighscore(
  statistics: Partial<Record<CharacterId, PlayerStatistics>>,
  mode: GameMode,
): GroupHighscore | null {
  let bestValue: number | null = null
  let holders: CharacterId[] = []
  for (const id of CHARACTER_ORDER) {
    const value = mode === 'hoch' ? statistics[id]?.bestHigh : statistics[id]?.bestLow
    if (value === null || value === undefined) continue
    const better = bestValue === null || (mode === 'hoch' ? value > bestValue : value < bestValue)
    if (better) {
      bestValue = value
      holders = [id]
    } else if (value === bestValue) {
      holders.push(id)
    }
  }
  if (bestValue === null) return null
  return { playerNames: holders.map((id) => AVATAR_CONFIGS[id].name), value: bestValue }
}
