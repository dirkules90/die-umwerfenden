import type { DailyRecords } from '../game/dailyWinner'
import { todayKey } from '../game/dateKey'
import type { CharacterId, PlayerStatistics, Settings } from '../game/types'

const STATS_KEY = 'kegeln-lembeck:stats:v1'
const SETTINGS_KEY = 'kegeln-lembeck:settings:v1'
const DAILY_KEY = 'kegeln-lembeck:daily:v1'
const ALLTIME_KEY = 'kegeln-lembeck:alltime:v1'

export function emptyStatistics(): PlayerStatistics {
  return {
    gamesPlayed: 0,
    bestHigh: null,
    bestLow: null,
    totalScoreHigh: 0,
    countHigh: 0,
    totalScoreLow: 0,
    countLow: 0,
    bestTannenbaum: null,
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

/** Lädt gespeicherte Statistiken und füllt bei jedem Spieler fehlende Felder mit ihren
 * Standardwerten auf - sonst fehlen bei älteren, vor einem Feature-Update gespeicherten
 * Datensätzen neue Felder (z. B. bestTannenbaum) komplett und rendern als "undefined". */
export function loadAllStatistics(): Record<CharacterId, PlayerStatistics> {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return {} as Record<CharacterId, PlayerStatistics>
    const parsed = JSON.parse(raw) as Record<CharacterId, Partial<PlayerStatistics>>
    const result = {} as Record<CharacterId, PlayerStatistics>
    for (const [id, stats] of Object.entries(parsed) as [CharacterId, Partial<PlayerStatistics>][]) {
      result[id] = { ...emptyStatistics(), ...stats, achievements: stats.achievements ?? [] }
    }
    return result
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

/** Liest die gespeicherten Tagesrekorde unabhängig vom Datum - der Aufrufer entscheidet, ob
 * ein gespeicherter Tag noch "heute" ist oder abgeschlossen werden muss (Teil: Tagessieger). */
export function loadRawDaily(): { date: string; records: DailyRecords } | null {
  try {
    const raw = localStorage.getItem(DAILY_KEY)
    if (!raw) return null
    return JSON.parse(raw) as { date: string; records: DailyRecords }
  } catch {
    return null
  }
}

export function saveDailyRecords(records: DailyRecords): void {
  localStorage.setItem(DAILY_KEY, JSON.stringify({ date: todayKey(), records }))
}

export function resetDailyRecords(): void {
  localStorage.removeItem(DAILY_KEY)
}

/** Allzeit-Bestenliste der Tagessiege: je Tag bekommt der/die Tagessieger 1 Punkt (bei
 * Gleichstand aufgeteilt), hier fortlaufend aufsummiert. */
export function loadAllTimeBoard(): Partial<Record<CharacterId, number>> {
  try {
    const raw = localStorage.getItem(ALLTIME_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export function saveAllTimeBoard(board: Partial<Record<CharacterId, number>>): void {
  localStorage.setItem(ALLTIME_KEY, JSON.stringify(board))
}

export function resetAllTimeBoard(): void {
  localStorage.removeItem(ALLTIME_KEY)
}
