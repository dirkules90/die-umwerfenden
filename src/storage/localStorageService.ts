import type { CharacterId, PlayerStatistics, Settings } from '../game/types'

const STATS_KEY = 'kegeln-lembeck:stats:v1'
const SETTINGS_KEY = 'kegeln-lembeck:settings:v1'

export function emptyStatistics(): PlayerStatistics {
  return {
    gamesPlayed: 0,
    bestHigh: null,
    bestLow: null,
    totalScoreHigh: 0,
    countHigh: 0,
    totalScoreLow: 0,
    countLow: 0,
    perfectThrows: 0,
    gutterThrows: 0,
    longestPerfectStreak: 0,
    achievements: [],
  }
}

export const DEFAULT_SETTINGS: Settings = {
  musicVolume: 0.6,
  sfxVolume: 0.85,
  hapticsEnabled: true,
}

export function loadAllStatistics(): Record<CharacterId, PlayerStatistics> {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return {} as Record<CharacterId, PlayerStatistics>
    return JSON.parse(raw)
  } catch {
    return {} as Record<CharacterId, PlayerStatistics>
  }
}

export function saveAllStatistics(stats: Record<CharacterId, PlayerStatistics>): void {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats))
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function resetAllStatistics(): void {
  localStorage.removeItem(STATS_KEY)
}
