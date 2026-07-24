import { AVATAR_CONFIGS, CHARACTER_ORDER } from '../characters/avatarConfigs'
import type { CharacterId, GameMode, PlayerStatistics } from './types'

export interface GroupHighscore {
  playerName: string
  value: number
}

/** Bester Wert aller sechs Charaktere für den angegebenen Modus, samt Namen des Halters. */
export function groupHighscore(
  statistics: Partial<Record<CharacterId, PlayerStatistics>>,
  mode: GameMode,
): GroupHighscore | null {
  let best: GroupHighscore | null = null
  for (const id of CHARACTER_ORDER) {
    const value = mode === 'hoch' ? statistics[id]?.bestHigh : statistics[id]?.bestLow
    if (value === null || value === undefined) continue
    const better = best === null || (mode === 'hoch' ? value > best.value : value < best.value)
    if (better) best = { playerName: AVATAR_CONFIGS[id].name, value }
  }
  return best
}
